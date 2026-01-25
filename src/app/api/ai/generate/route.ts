import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { openai, OPENAI_MODEL } from "@/lib/openai/client";
import { buildPrompt } from "@/lib/openai/prompt";
import { outputGenerateSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = outputGenerateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 }
      );
    }

    const {
      projectId,
      mode,
      seedText,
      includeBrandVoice,
      includeReferences,
      regenFromFeedback,
    } = parsed.data;

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

    const references = includeReferences
      ? (
          await supabase
            .from("references")
            .select("url, notes")
            .eq("project_id", projectId)
        ).data
      : [];

    const latestOutput = regenFromFeedback
      ? (
          await supabase
            .from("outputs")
            .select("content_md")
            .eq("project_id", projectId)
            .eq("mode", mode)
            .order("version", { ascending: false })
            .limit(1)
            .maybeSingle()
        ).data?.content_md ?? null
      : null;

    const latestFeedback = regenFromFeedback
      ? (
          await supabase
            .from("feedback")
            .select("text")
            .eq("project_id", projectId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        ).data?.text ?? null
      : null;

    const { systemPrompt, userPrompt } = buildPrompt({
      mode,
      briefText: brief.raw_text,
      parsedSummary: brief.parsed_summary,
      brandVoice: includeBrandVoice ? project.client?.brand_voice : null,
      ideaSeed: seedText ?? null,
      references: references ?? [],
      previousOutput: latestOutput,
      feedback: latestFeedback,
    });

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      return NextResponse.json(
        { error: "No content returned from OpenAI" },
        { status: 500 }
      );
    }

    let ideaId: string | null = null;
    if (seedText && seedText.trim().length > 0) {
      const { data: idea } = await supabase
        .from("ideas")
        .insert({
          user_id: user.id,
          project_id: projectId,
          title: seedText.split(" ").slice(0, 6).join(" "),
          seed_text: seedText.trim(),
        })
        .select("id")
        .maybeSingle();
      ideaId = idea?.id ?? null;
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

    const { data: output, error: outputError } = await supabase
      .from("outputs")
      .insert({
        user_id: user.id,
        project_id: projectId,
        idea_id: ideaId,
        mode,
        version: nextVersion,
        content_md: content,
      })
      .select("id, version, mode")
      .maybeSingle();

    if (outputError || !output) {
      return NextResponse.json(
        { error: "Failed to save output" },
        { status: 500 }
      );
    }

    return NextResponse.json({ output });
  } catch {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
