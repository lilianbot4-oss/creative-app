import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateText } from "ai";
import {
  getModel,
  hasGoogleAIConfig,
  hasOpenAIConfig,
  GOOGLE_CREDENTIALS_ERROR,
} from "@/lib/ai/client";
import { buildPrompt } from "@/lib/openai/promptBuilder";
import { enforceUsageLimit, estimateTokensFromText } from "@/lib/ai/usage";
import { getResolvedAISettings } from "@/lib/ai/settings";
import { DEFAULT_TEXT_MODEL } from "@/lib/ai/models";
import { logActivity } from "@/lib/activity";

const packSchema = z.object({
  projectId: z.string().uuid(),
  seedText: z.string().optional().nullable(),
});

const PACK_STEPS = [
  "one_pager",
  "expand",
  "ugc_scripts",
  "pitch_outline",
  "virality",
] as const;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = packSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 }
      );
    }

    const { projectId, seedText } = parsed.data;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*, client:clients(*)")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const { data: brief } = await supabase
      .from("briefs")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!brief) {
      return NextResponse.json(
        { error: "Please add a brief before generating outputs." },
        { status: 400 }
      );
    }

    const { data: creativeSpec } = await supabase
      .from("creative_specs")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();

    const references = (
      await supabase
        .from("references")
        .select("url, notes")
        .eq("project_id", projectId)
    ).data;

    const settings = await getResolvedAISettings(projectId);
    const modelId = settings.text_model ?? DEFAULT_TEXT_MODEL;

    // Check for appropriate API key
    if (modelId.startsWith("gpt") && !hasOpenAIConfig()) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 400 });
    }
    if (modelId.startsWith("gemini") && !hasGoogleAIConfig()) {
      return NextResponse.json({ error: GOOGLE_CREDENTIALS_ERROR }, { status: 400 });
    }

    const { count: primaryCount } = await supabase
      .from("outputs")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("is_primary", true);

    let hasPrimary = (primaryCount ?? 0) > 0;
    const completed: string[] = [];

    for (const mode of PACK_STEPS) {
      const { systemPrompt, userPrompt } = buildPrompt({
        mode,
        briefText: brief.raw_text,
        parsedSummary: brief.parsed_summary,
        brandVoice: project.client?.brand_voice ?? null,
        ideaSeed: seedText ?? null,
        references: references ?? [],
        previousOutput: null,
        feedback: null,
        creativeSpec: creativeSpec ?? null,
      });

      const usage = await enforceUsageLimit(
        supabase,
        user.id,
        estimateTokensFromText(systemPrompt + userPrompt)
      );
      if (!usage.allowed) {
        if (usage.reason === "error") {
          return NextResponse.json(
            {
              error: "AI usage tracking unavailable. Try again later.",
              completed,
              failedMode: mode,
            },
            { status: 503 }
          );
        }
        return NextResponse.json(
          {
            error: "Daily AI request limit reached. Try again tomorrow.",
            completed,
            failedMode: mode,
          },
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
          { error: "No content returned from AI", completed, failedMode: mode },
          { status: 500 }
        );
      }

      const { data: latestVersionRow } = await supabase
        .from("outputs")
        .select("version")
        .eq("project_id", projectId)
        .eq("mode", mode)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextVersion = (latestVersionRow?.version ?? 0) + 1;
      const isPrimary = !hasPrimary;
      if (!hasPrimary) {
        hasPrimary = true;
      }

      const { error: outputError } = await supabase.from("outputs").insert({
        user_id: user.id,
        project_id: projectId,
        mode,
        version: nextVersion,
        content_md: content,
        is_primary: isPrimary,
      });

      if (outputError) {
        return NextResponse.json(
          { error: "Failed to save output", completed, failedMode: mode },
          { status: 500 }
        );
      }

      completed.push(mode);
    }

    void logActivity({
      supabase,
      userId: user.id,
      action: "ai.pack_generated",
      entityType: "output",
      entityId: null,
      projectId,
      metadata: { modes: completed },
    });

    return NextResponse.json({ completed });
  } catch (error) {
    console.error("Campaign pack generation failed", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
