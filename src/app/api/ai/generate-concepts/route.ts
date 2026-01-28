import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateText } from "ai";
import {
  getModel,
  hasGoogleAIConfig,
  hasOpenAIConfig,
  GOOGLE_CREDENTIALS_ERROR,
} from "@/lib/ai/client";
import { extractJson } from "@/lib/openai/utils";
import { generateConceptsSchema } from "@/lib/validators";
import { buildGenerateConceptsPrompt } from "@/lib/ai/prompts/generateConcepts";
import { enforceUsageLimit, estimateTokensFromText } from "@/lib/ai/usage";
import { getResolvedAISettings } from "@/lib/ai/settings";
import { DEFAULT_TEXT_MODEL } from "@/lib/ai/models";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = generateConceptsSchema.safeParse(body);
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
        { error: "Create a creative map before generating concepts." },
        { status: 400 }
      );
    }

    const desiredCount = parsed.data.count ?? (parsed.data.seedText ? 1 : 6);
    const { systemPrompt, userPrompt } = buildGenerateConceptsPrompt(spec, {
      seedText: parsed.data.seedText ?? null,
      count: desiredCount,
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
    const json = extractJson<
      Array<{
        title: string;
        one_liner?: string;
        thesis?: string;
        share_triggers?: string[];
        product_integration?: string;
        doordash_integration?: string;
        doorDash_integration?: string;
        cast_archetypes?: string[];
        beats?: Array<Record<string, unknown>>;
        risks?: Array<{ risk: string; mitigation?: string }>;
        scalability?: string;
      }>
    >(content);

    if (!json || !Array.isArray(json)) {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 422 }
      );
    }

    const originType = parsed.data.seedText ? "ai_assisted" : "ai_generated";
    const limited = json.slice(0, desiredCount);
    const payload = limited
      .filter((item) => item.title)
      .map((item) => {
        const productIntegration =
          item.product_integration ??
          item.doordash_integration ??
          item.doorDash_integration ??
          null;
        return {
        user_id: user.id,
        project_id: parsed.data.projectId,
        title: item.title,
        one_liner: item.one_liner ?? null,
        thesis: item.thesis ?? null,
        share_triggers: item.share_triggers ?? null,
        product_integration: productIntegration,
        cast_archetypes: item.cast_archetypes ?? null,
        beats: item.beats ?? null,
        risks: item.risks ?? null,
        scalability: item.scalability ?? null,
        origin_type: originType,
        seed_text: parsed.data.seedText ?? null,
        };
      });

    if (payload.length === 0) {
      return NextResponse.json(
        { error: "AI response did not include concepts" },
        { status: 422 }
      );
    }

    const { data: concepts, error } = await supabase
      .from("concepts")
      .insert(payload)
      .select();

    if (error || !concepts) {
      console.error("Concept insert failed", error);
      return NextResponse.json(
        { error: error?.message || "Failed to save concepts" },
        { status: 500 }
      );
    }

    return NextResponse.json({ concepts });
  } catch (error) {
    console.error("Concept generation failed", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
