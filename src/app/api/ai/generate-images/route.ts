import { NextResponse } from "next/server";
import { z } from "zod";
import { openai } from "@/lib/openai/client";
import { createClient } from "@/lib/supabase/server";
import { enforceUsageLimit, estimateTokensFromText } from "@/lib/ai/usage";
import { getResolvedAISettings } from "@/lib/ai/settings";

export const runtime = "nodejs";

const imageSchema = z.object({
  projectId: z.string().uuid(),
  prompt: z.string().min(1),
  n: z.number().min(1).max(6).optional().default(4),
  size: z.enum(["1024x1024", "1024x1536", "1536x1024"]).optional().default("1024x1024"),
  style: z.enum(["moodboard", "storyboard", "key_visual"]).optional(),
});

async function bufferFromImage(item: { b64_json?: string | null; url?: string | null }) {
  if (item.b64_json) {
    return Buffer.from(item.b64_json, "base64");
  }
  if (item.url) {
    const response = await fetch(item.url);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
  return null;
}

async function generateOneImage(options: {
  model: string;
  prompt: string;
  size: "1024x1024" | "1536x1024" | "1024x1536";
}) {
  try {
    return await openai.images.generate({
      model: options.model,
      prompt: options.prompt,
      n: 1,
      size: options.size,
      response_format: "b64_json",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("response_format")) {
      return await openai.images.generate({
        model: options.model,
        prompt: options.prompt,
        n: 1,
        size: options.size,
      });
    }
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = imageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const { projectId, prompt, n, size, style } = parsed.data;
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
      .eq("id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const settings = await getResolvedAISettings(projectId);
    if (!settings.image_model) {
      return NextResponse.json({ error: "Image model not configured" }, { status: 400 });
    }

    const usage = await enforceUsageLimit(
      supabase,
      user.id,
      estimateTokensFromText(prompt) * n
    );

    if (!usage.allowed) {
      return NextResponse.json(
        { error: "Daily AI request limit reached. Try again tomorrow." },
        { status: 429 }
      );
    }

    const createdReferences = [] as Array<{ id: string; storage_path: string; url: string }>;
    const errors: Array<{ index: number; error: string }> = [];

    const requestCount = Math.min(n, 4);

    for (let i = 0; i < requestCount; i += 1) {
      let buffer: Buffer | null = null;
      try {
        const completion = await generateOneImage({
          model: settings.image_model,
          prompt: style ? `${prompt}\nStyle: ${style}` : prompt,
          size,
        });
        const image = completion.data?.[0];
        buffer = image ? await bufferFromImage(image) : null;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Image generation failed";
        errors.push({ index: i, error: message });
        continue;
      }

      if (!buffer) {
        errors.push({ index: i, error: "No image returned" });
        continue;
      }

      const path = `${user.id}/${projectId}/generated/${Date.now()}-${i}.png`;
      const { error: uploadError } = await supabase.storage
        .from("references")
        .upload(path, buffer, { contentType: "image/png", upsert: true });

      if (uploadError) {
        errors.push({ index: i, error: "Failed to upload image" });
        continue;
      }

      const { data: reference, error } = await supabase
        .from("references")
        .insert({
          user_id: user.id,
          project_id: projectId,
          type: "image",
          storage_path: path,
          notes: `AI generated ${style ?? "moodboard"}`,
        })
        .select("id, storage_path")
        .maybeSingle();

      if (error || !reference) {
        errors.push({ index: i, error: "Failed to save reference" });
        continue;
      }

      const publicUrl = supabase.storage.from("references").getPublicUrl(path).data.publicUrl;
      createdReferences.push({ id: reference.id, storage_path: path, url: publicUrl });
    }

    if (createdReferences.length === 0) {
      return NextResponse.json(
        { error: errors[0]?.error ?? "No images returned", errors },
        { status: 500 }
      );
    }

    return NextResponse.json({ references: createdReferences, errors });
  } catch (error) {
    console.error("Image generation failed", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
