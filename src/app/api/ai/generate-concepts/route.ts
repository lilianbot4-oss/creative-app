import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { openai, OPENAI_MODEL } from "@/lib/openai/client";
import { extractJson } from "@/lib/openai/utils";
import { generateConceptsSchema } from "@/lib/validators";
import { buildGenerateConceptsPrompt } from "@/lib/ai/prompts/generateConcepts";
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

    const { systemPrompt, userPrompt } = buildGenerateConceptsPrompt(spec);

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
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const json = extractJson<
      Array<{
        title: string;
        one_liner?: string;
        thesis?: string;
        share_triggers?: string[];
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

    const payload = json
      .filter((item) => item.title)
      .map((item) => ({
        user_id: user.id,
        project_id: parsed.data.projectId,
        title: item.title,
        one_liner: item.one_liner ?? null,
        thesis: item.thesis ?? null,
        share_triggers: item.share_triggers ?? null,
        doorDash_integration: item.doorDash_integration ?? null,
        cast_archetypes: item.cast_archetypes ?? null,
        beats: item.beats ?? null,
        risks: item.risks ?? null,
        scalability: item.scalability ?? null,
      }));

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
      return NextResponse.json(
        { error: "Failed to save concepts" },
        { status: 500 }
      );
    }

    return NextResponse.json({ concepts });
  } catch (error) {
    console.error("Concept generation failed", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
