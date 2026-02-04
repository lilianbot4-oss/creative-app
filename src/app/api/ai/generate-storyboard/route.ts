import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { openai } from "@/lib/openai/client";
import { extractJson } from "@/lib/openai/utils";
import { generateStoryboardSchema } from "@/lib/validators";
import { buildGenerateStoryboardPrompt } from "@/lib/ai/prompts/generateStoryboard";
import { enforceUsageLimit, estimateTokensFromText } from "@/lib/ai/usage";
import { getResolvedAISettings } from "@/lib/ai/settings";
import { DEFAULT_TEXT_MODEL } from "@/lib/ai/models";
import { logActivity } from "@/lib/activity";

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = generateStoryboardSchema.safeParse(body);
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

    const { data: project } = await supabase
      .from("projects")
      .select("id, client:clients(brand_voice)")
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
        { error: "Create a creative map before generating storyboards." },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const brandVoice = (project as any)?.client?.brand_voice ?? null;

    const { systemPrompt, userPrompt } = buildGenerateStoryboardPrompt({
      spec,
      script: script.script_md,
      brandVoice,
    });

    const settings = await getResolvedAISettings(parsed.data.projectId);

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

    const completion = await openai.chat.completions.create({
      model: settings.text_model ?? DEFAULT_TEXT_MODEL,
      temperature: 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const json = extractJson<
      {
        frames: Array<{
          frame: number;
          shot: string;
          setting: string;
          action: string;
          os_text?: string | null;
          audio?: string | null;
          props?: string[] | null;
        }>;
        shotlist?: Record<string, unknown>;
      }
    >(content);

    if (!json || !Array.isArray(json.frames)) {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 422 }
      );
    }

    const { data: storyboard, error } = await supabase
      .from("storyboards")
      .insert({
        user_id: user.id,
        project_id: parsed.data.projectId,
        script_id: script.id,
        frames: json.frames,
        shotlist: json.shotlist ?? null,
      })
      .select()
      .maybeSingle();

    if (error || !storyboard) {
      return NextResponse.json(
        { error: "Failed to save storyboard" },
        { status: 500 }
      );
    }

    void logActivity({
      supabase,
      userId: user.id,
      action: "ai.storyboard_generated",
      entityType: "storyboard",
      entityId: storyboard.id,
      projectId: parsed.data.projectId,
      metadata: { script_id: script.id, frames: json.frames.length },
    });

    return NextResponse.json({ storyboard });
  } catch (error) {
    console.error("Storyboard generation failed", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
