import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { openai, OPENAI_MODEL } from "@/lib/openai/client";
import { buildBriefParsingPrompt } from "@/lib/openai/prompt";
import { extractJson } from "@/lib/openai/utils";
import { parseBriefSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = parseBriefSchema.safeParse(body);
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

    const { data: brief, error: briefError } = await supabase
      .from("briefs")
      .select("id")
      .eq("id", parsed.data.briefId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (briefError || !brief) {
      return NextResponse.json({ error: "Brief not found" }, { status: 404 });
    }

    const { systemPrompt, userPrompt } = buildBriefParsingPrompt(
      parsed.data.rawText
    );

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const json = extractJson(content);

    if (!json) {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 422 }
      );
    }

    const { error: updateError } = await supabase
      .from("briefs")
      .update({ parsed_summary: json })
      .eq("id", parsed.data.briefId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to save brief summary" },
        { status: 500 }
      );
    }

    return NextResponse.json({ parsed_summary: json });
  } catch {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
