import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { openai, OPENAI_MODEL } from "@/lib/openai/client";
import { extractJson } from "@/lib/openai/utils";
import { generateStoryboardSchema } from "@/lib/validators";
import { buildGenerateStoryboardPrompt } from "@/lib/ai/prompts/generateStoryboard";
import { enforceUsageLimit, estimateTokensFromText } from "@/lib/ai/usage";

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

    const { systemPrompt, userPrompt } = buildGenerateStoryboardPrompt({
      spec,
      script: script.script_md,
    });

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

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
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

    return NextResponse.json({ storyboard });
  } catch (error) {
    console.error("Storyboard generation failed", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
