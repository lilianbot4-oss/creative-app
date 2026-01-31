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
import { parseImportIdeasSchema } from "@/lib/validators";
import { buildParseImportIdeasPrompt } from "@/lib/ai/prompts/parseImportIdeas";
import { enforceUsageLimit, estimateTokensFromText } from "@/lib/ai/usage";
import { getResolvedAISettings } from "@/lib/ai/settings";
import { DEFAULT_TEXT_MODEL } from "@/lib/ai/models";
import { logActivity } from "@/lib/activity";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = parseImportIdeasSchema.safeParse(body);
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

    const { systemPrompt, userPrompt } = buildParseImportIdeasPrompt(
      parsed.data.rawText
    );
    const settings = await getResolvedAISettings(parsed.data.projectId);
    const modelId = settings.text_model ?? DEFAULT_TEXT_MODEL;

    if (modelId.startsWith("gpt") && !hasOpenAIConfig()) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY" },
        { status: 400 }
      );
    }
    if (modelId.startsWith("gemini") && !hasGoogleAIConfig()) {
      return NextResponse.json(
        { error: GOOGLE_CREDENTIALS_ERROR },
        { status: 400 }
      );
    }

    const usage = await enforceUsageLimit(
      supabase,
      user.id,
      estimateTokensFromText(systemPrompt + userPrompt)
    );

    if (!usage.allowed) {
      if (usage.reason === "error") {
        return NextResponse.json(
          { error: "AI usage tracking unavailable. Try again later." },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: "Daily AI request limit reached. Try again tomorrow." },
        { status: 429 }
      );
    }

    const { text: content } = await generateText({
      model: getModel(modelId),
      temperature: 0.3,
      system: systemPrompt,
      prompt: userPrompt,
    });

    const json = extractJson<
      Array<{
        title: string;
        description?: string;
        original_text?: string;
      }>
    >(content);

    if (!json || !Array.isArray(json) || json.length === 0) {
      return NextResponse.json(
        { error: "Could not parse ideas from the provided text. Try a different format or paste text directly." },
        { status: 422 }
      );
    }

    const ideas = json
      .filter((item) => item.title)
      .map((item) => ({
        title: item.title,
        description: item.description ?? "",
        original_text: item.original_text ?? "",
      }));

    void logActivity({
      supabase,
      userId: user.id,
      action: "ai.ideas_parsed",
      entityType: "idea",
      entityId: null,
      projectId: parsed.data.projectId,
      metadata: { count: ideas.length },
    });

    return NextResponse.json({ ideas });
  } catch (error) {
    console.error("Import ideas parsing failed", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
