import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateText } from "ai";
import { getModel } from "@/lib/ai/client";
import { extractJson } from "@/lib/openai/utils";
import { generateVariantsSchema } from "@/lib/validators";
import { buildGenerateVariantsPrompt } from "@/lib/ai/prompts/generateVariants";
import { enforceUsageLimit, estimateTokensFromText } from "@/lib/ai/usage";
import { getResolvedAISettings } from "@/lib/ai/settings";
import { DEFAULT_TEXT_MODEL } from "@/lib/ai/models";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = generateVariantsSchema.safeParse(body);
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

    const { data: concept } = await supabase
      .from("concepts")
      .select("*")
      .eq("id", parsed.data.conceptId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!concept) {
      return NextResponse.json({ error: "Concept not found" }, { status: 404 });
    }

    const { data: spec } = await supabase
      .from("creative_specs")
      .select("*")
      .eq("project_id", concept.project_id)
      .maybeSingle();

    if (!spec) {
      return NextResponse.json(
        { error: "Create a creative map before generating variants." },
        { status: 400 }
      );
    }

    const { systemPrompt, userPrompt } = buildGenerateVariantsPrompt(spec, concept);
    const settings = await getResolvedAISettings(concept.project_id);
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
    const json = extractJson<
      Array<{ angle: string; summary?: string; tradeoffs?: string[] }>
    >(content);

    if (!json || !Array.isArray(json)) {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 422 }
      );
    }

    const payload = json
      .filter((item) => item.angle)
      .map((item) => ({
        user_id: user.id,
        concept_id: concept.id,
        angle: item.angle,
        summary: item.summary ?? null,
        tradeoffs: item.tradeoffs ?? null,
      }));

    if (payload.length === 0) {
      return NextResponse.json(
        { error: "AI response did not include variants" },
        { status: 422 }
      );
    }

    const { data: variants, error } = await supabase
      .from("concept_variants")
      .insert(payload)
      .select();

    if (error || !variants) {
      return NextResponse.json(
        { error: "Failed to save variants" },
        { status: 500 }
      );
    }

    return NextResponse.json({ variants });
  } catch (error) {
    console.error("Variant generation failed", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
