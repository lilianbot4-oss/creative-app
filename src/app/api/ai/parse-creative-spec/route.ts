import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { openai, OPENAI_MODEL } from "@/lib/openai/client";
import { extractJson } from "@/lib/openai/utils";
import { parseCreativeSpecSchema } from "@/lib/validators";
import { buildParseCreativeSpecPrompt } from "@/lib/ai/prompts/parseCreativeSpec";
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

    const { systemPrompt, userPrompt } = buildParseCreativeSpecPrompt(
      parsed.data.rawText
    );

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
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "";
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
          raw_brief_text: parsed.data.rawText,
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

    return NextResponse.json({ creative_spec: spec });
  } catch (error) {
    console.error("Creative spec parsing failed", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
