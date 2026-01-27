import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateText } from "ai";
import {
  getModel,
  hasGoogleAIConfig,
  hasOpenAIConfig,
  GOOGLE_CREDENTIALS_ERROR,
} from "@/lib/ai/client";
import { generateScriptSchema } from "@/lib/validators";
import { buildGenerateScriptPrompt } from "@/lib/ai/prompts/generateScript";
import { enforceUsageLimit, estimateTokensFromText } from "@/lib/ai/usage";
import { getResolvedAISettings } from "@/lib/ai/settings";
import { DEFAULT_TEXT_MODEL } from "@/lib/ai/models";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = generateScriptSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", parsed.data.projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const { data: spec } = await supabase
      .from("creative_specs")
      .select("*")
      .eq("project_id", parsed.data.projectId)
      .maybeSingle();

    if (!spec) {
      return NextResponse.json(
        { error: "Create a creative map before generating scripts." },
        { status: 400 }
      );
    }

    const concept = parsed.data.conceptId
      ? (
        await supabase
          .from("concepts")
          .select("*")
          .eq("id", parsed.data.conceptId)
          .eq("user_id", user.id)
          .maybeSingle()
      ).data
      : null;

    const variant = parsed.data.variantId
      ? (
        await supabase
          .from("concept_variants")
          .select("*")
          .eq("id", parsed.data.variantId)
          .eq("user_id", user.id)
          .maybeSingle()
      ).data
      : null;

    const { systemPrompt, userPrompt } = buildGenerateScriptPrompt({
      spec,
      format: parsed.data.format,
      concept: concept ?? null,
      variant: variant ?? null,
    });

    const settings = await getResolvedAISettings(parsed.data.projectId);
    const modelId = settings.text_model ?? DEFAULT_TEXT_MODEL;

    // Check for appropriate API key
    if (modelId.startsWith("gpt") && !hasOpenAIConfig()) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 400 });
    }
    if (modelId.startsWith("gemini") && !hasGoogleAIConfig()) {
      return NextResponse.json({ error: GOOGLE_CREDENTIALS_ERROR }, { status: 400 });
    }

    const usage = await enforceUsageLimit(
      supabase,
      user.id,
      estimateTokensFromText(systemPrompt + userPrompt)
    );

    if (!usage.allowed) {
      return NextResponse.json(
        { error: "Daily AI request limit reached. Try again tomorrow." },
        { status: 429 }
      );
    }

    const { text: content } = await generateText({
      model: getModel(modelId),
      temperature: 0.7,
      system: systemPrompt,
      prompt: userPrompt,
    });

    if (!content?.trim()) {
      return NextResponse.json(
        { error: "No content returned from AI" },
        { status: 500 }
      );
    }

    const { data: latestVersionRow } = await supabase
      .from("scripts")
      .select("version")
      .eq("project_id", parsed.data.projectId)
      .eq("format", parsed.data.format)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = (latestVersionRow?.version ?? 0) + 1;

    const { count: primaryCount } = await supabase
      .from("scripts")
      .select("id", { count: "exact", head: true })
      .eq("project_id", parsed.data.projectId)
      .eq("format", parsed.data.format)
      .eq("is_primary", true);

    const shouldBePrimary = (primaryCount ?? 0) === 0;

    const derivedOrigin =
      concept?.origin_type === "ai_generated"
        ? "ai_generated"
        : concept?.origin_type === "human" || concept?.origin_type === "ai_assisted"
          ? "ai_assisted"
          : "ai_generated";

    const { data: script, error } = await supabase
      .from("scripts")
      .insert({
        user_id: user.id,
        project_id: parsed.data.projectId,
        concept_id: concept?.id ?? null,
        variant_id: variant?.id ?? null,
        format: parsed.data.format,
        script_md: content,
        meta: null,
        version: nextVersion,
        is_primary: shouldBePrimary,
        origin_type: derivedOrigin,
        seed_text: concept?.seed_text ?? null,
      })
      .select()
      .maybeSingle();

    if (error || !script) {
      return NextResponse.json(
        { error: "Failed to save script" },
        { status: 500 }
      );
    }

    return NextResponse.json({ script });
  } catch (error) {
    console.error("Script generation failed", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
