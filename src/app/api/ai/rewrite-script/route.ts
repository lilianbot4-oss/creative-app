import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateText } from "ai";
import { getModel } from "@/lib/ai/client";
import { rewriteScriptSchema } from "@/lib/validators";
import { buildRewriteScriptPrompt } from "@/lib/ai/prompts/rewriteScript";
import { enforceUsageLimit, estimateTokensFromText } from "@/lib/ai/usage";
import { getResolvedAISettings } from "@/lib/ai/settings";
import { DEFAULT_TEXT_MODEL } from "@/lib/ai/models";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = rewriteScriptSchema.safeParse(body);
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

    const { data: script } = await supabase
      .from("scripts")
      .select("*")
      .eq("id", parsed.data.scriptId)
      .eq("project_id", parsed.data.projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!script) {
      return NextResponse.json({ error: "Script not found" }, { status: 404 });
    }

    const { data: spec } = await supabase
      .from("creative_specs")
      .select("*")
      .eq("project_id", parsed.data.projectId)
      .maybeSingle();

    if (!spec) {
      return NextResponse.json(
        { error: "Create a creative map before rewriting scripts." },
        { status: 400 }
      );
    }

    const { systemPrompt, userPrompt } = buildRewriteScriptPrompt({
      spec,
      script: script.script_md,
      feedback: parsed.data.feedbackText ?? null,
      rewriteGoal: parsed.data.rewriteGoal ?? null,
    });

    const settings = await getResolvedAISettings(parsed.data.projectId);
    const modelId = settings.text_model ?? DEFAULT_TEXT_MODEL;

    // Check for appropriate API key
    if (modelId.startsWith("gpt") && !process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 400 });
    }
    if (modelId.startsWith("gemini") && !process.env.GOOGLE_GENERATIVE_AI_API_KEY && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      return NextResponse.json({ error: "Missing Google AI credentials (GOOGLE_GENERATIVE_AI_API_KEY or GOOGLE_APPLICATION_CREDENTIALS)" }, { status: 400 });
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

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      return NextResponse.json(
        { error: "No content returned from OpenAI" },
        { status: 500 }
      );
    }

    const { data: latestVersionRow } = await supabase
      .from("scripts")
      .select("version")
      .eq("project_id", parsed.data.projectId)
      .eq("format", script.format)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = (latestVersionRow?.version ?? 0) + 1;

    const { data: newScript, error } = await supabase
      .from("scripts")
      .insert({
        user_id: user.id,
        project_id: parsed.data.projectId,
        concept_id: script.concept_id,
        variant_id: script.variant_id,
        format: script.format,
        script_md: content,
        meta: script.meta ?? null,
        version: nextVersion,
        is_primary: false,
        origin_type: script.origin_type ?? "ai_assisted",
        seed_text: script.seed_text ?? null,
      })
      .select()
      .maybeSingle();

    if (error || !newScript) {
      return NextResponse.json(
        { error: "Failed to save script" },
        { status: 500 }
      );
    }

    return NextResponse.json({ script: newScript });
  } catch (error) {
    console.error("Script rewrite failed", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
