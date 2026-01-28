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
import { parseCreativeSpecSchema } from "@/lib/validators";
import { buildParseCreativeSpecPrompt } from "@/lib/ai/prompts/parseCreativeSpec";
import { enforceUsageLimit, estimateTokensFromText } from "@/lib/ai/usage";
import { getResolvedAISettings } from "@/lib/ai/settings";
import { DEFAULT_TEXT_MODEL } from "@/lib/ai/models";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = parseCreativeSpecSchema.safeParse(body);
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

    const { data: existingSpec } = await supabase
      .from("creative_specs")
      .select("raw_brief_text, active_brief_upload_id")
      .eq("project_id", parsed.data.projectId)
      .maybeSingle();

    let briefText = (parsed.data.rawText ?? "").trim();
    let parsedFrom: string | null = null;

    if (existingSpec?.active_brief_upload_id) {
      const { data: upload } = await supabase
        .from("project_brief_uploads")
        .select("id, filename, extracted_text")
        .eq("id", existingSpec.active_brief_upload_id)
        .eq("project_id", parsed.data.projectId)
        .maybeSingle();
      if (upload?.extracted_text) {
        briefText = upload.extracted_text;
        parsedFrom = `Uploaded file (${upload.filename})`;
      }
    }

    if (!briefText && existingSpec?.raw_brief_text) {
      briefText = existingSpec.raw_brief_text;
      parsedFrom = "Pasted brief";
    }

    if (briefText && !parsedFrom) {
      parsedFrom = "Pasted brief";
    }

    if (!briefText) {
      return NextResponse.json(
        { error: "No brief provided yet" },
        { status: 400 }
      );
    }

    const { systemPrompt, userPrompt } = buildParseCreativeSpecPrompt(briefText);

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

    const settings = await getResolvedAISettings(parsed.data.projectId);
    const modelId = settings.text_model ?? DEFAULT_TEXT_MODEL;

    // Check for appropriate API key
    if (modelId.startsWith("gpt") && !hasOpenAIConfig()) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 400 });
    }
    if (modelId.startsWith("gemini") && !hasGoogleAIConfig()) {
      return NextResponse.json({ error: GOOGLE_CREDENTIALS_ERROR }, { status: 400 });
    }

    const { text: content } = await generateText({
      model: getModel(modelId),
      temperature: 0.2,
      system: systemPrompt,
      prompt: userPrompt,
    });
    const json = extractJson<Record<string, unknown>>(content);

    if (!json) {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 422 }
      );
    }

    const mustDo = Array.isArray(json.must_do) ? json.must_do : [];
    const mustAvoid = Array.isArray(json.must_avoid) ? json.must_avoid : [];
    const toneTags = Array.isArray(json.tone_tags) ? json.tone_tags : [];
    const deliverables = Array.isArray(json.deliverables) ? json.deliverables : [];

    const { data: spec, error } = await supabase
      .from("creative_specs")
      .upsert(
        {
          user_id: user.id,
          project_id: parsed.data.projectId,
          raw_brief_text:
            existingSpec?.raw_brief_text ??
            (parsed.data.rawText ? parsed.data.rawText.trim() : ""),
          parsed_json: json,
          must_do: mustDo,
          must_avoid: mustAvoid,
          tone_tags: toneTags,
          deliverables,
          key_message: typeof json.key_message === "string" ? json.key_message : null,
          audience: typeof json.audience === "string" ? json.audience : null,
        },
        { onConflict: "project_id" }
      )
      .select()
      .maybeSingle();

    if (error || !spec) {
      return NextResponse.json(
        { error: "Failed to save creative map" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      creative_spec: spec,
      parsed_from: parsedFrom,
    });
  } catch (error) {
    console.error("Creative spec parsing failed", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
