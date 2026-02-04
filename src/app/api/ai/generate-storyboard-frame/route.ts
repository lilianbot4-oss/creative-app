import { NextResponse } from "next/server";
import { z } from "zod";
import { GoogleGenAI, type GenerateImagesConfig } from "@google/genai";
import { openai } from "@/lib/openai/client";
import { createClient } from "@/lib/supabase/server";
import { enforceUsageLimit, estimateTokensFromText } from "@/lib/ai/usage";
import { getResolvedAISettings } from "@/lib/ai/settings";
import { DEFAULT_IMAGE_PROVIDER, ImageProvider } from "@/lib/ai/models";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

const storyboardFrameSchema = z.object({
  projectId: z.string().uuid(),
  scriptId: z.string().uuid(),
  frameIndex: z.number().min(0),
  prompt: z.string().min(1),
  size: z.enum(["1024x1024", "1024x1536", "1536x1024"]).optional().default("1024x1024"),
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

async function generateGoogleImage(options: {
  model: string;
  prompt: string;
  aspectRatio?: string | null;
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const ai = new GoogleGenAI({ apiKey });
  const config: GenerateImagesConfig = { numberOfImages: 1 };
  if (options.aspectRatio) {
    config.aspectRatio = options.aspectRatio;
  }

  const result = await ai.models.generateImages({
    model: options.model,
    prompt: options.prompt,
    config,
  });

  const imageBytes = result.generatedImages?.[0]?.image?.imageBytes;
  return imageBytes ? Buffer.from(imageBytes, "base64") : null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = storyboardFrameSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const { projectId, scriptId, frameIndex, prompt, size } = parsed.data;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify storyboard exists and belongs to user
    const { data: storyboard } = await supabase
      .from("storyboards")
      .select("id, frames")
      .eq("script_id", scriptId)
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!storyboard) {
      return NextResponse.json({ error: "Storyboard not found" }, { status: 404 });
    }

    const settings = await getResolvedAISettings(projectId);
    if (!settings.image_model) {
      return NextResponse.json({ error: "Image model not configured" }, { status: 400 });
    }

    const provider = (settings.image_provider ?? DEFAULT_IMAGE_PROVIDER) as ImageProvider;
    if (provider === "google" && !process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 400 });
    }
    if (provider === "openai" && !process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 400 });
    }

    const usage = await enforceUsageLimit(
      supabase,
      user.id,
      estimateTokensFromText(prompt)
    );

    if (!usage.allowed) {
      return NextResponse.json(
        { error: "Daily AI request limit reached. Try again tomorrow." },
        { status: 429 }
      );
    }

    let buffer: Buffer | null = null;
    const fullPrompt = `Storyboard frame for a creative campaign. Cinema style, high quality. Action: ${prompt}`;

    if (provider === "google") {
      buffer = await generateGoogleImage({
        model: settings.image_model,
        prompt: fullPrompt,
        aspectRatio: size === "1024x1024" ? "1:1" : null,
      });
    } else {
      const completion = await openai.images.generate({
        model: settings.image_model,
        prompt: fullPrompt,
        n: 1,
        size: size as "1024x1024",
        response_format: "b64_json",
      });
      const image = completion.data?.[0];
      buffer = image ? await bufferFromImage(image) : null;
    }

    if (!buffer) {
      return NextResponse.json({ error: "Image generation failed" }, { status: 500 });
    }

    const path = `${user.id}/${projectId}/storyboard/${scriptId}/frame-${frameIndex}-${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("assets")
      .upload(path, buffer, { contentType: "image/png", upsert: true });

    if (uploadError) {
      return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
    }

    const { data: asset, error: insertError } = await supabase
      .from("concept_assets")
      .insert({
        user_id: user.id,
        project_id: projectId,
        script_id: scriptId,
        asset_type: "storyboard_frame",
        prompt_text: prompt,
        storage_bucket: "assets",
        storage_path: path,
        meta: { frame_index: frameIndex },
      })
      .select()
      .maybeSingle();

    if (insertError || !asset) {
      return NextResponse.json({ error: "Failed to save asset record" }, { status: 500 });
    }

    void logActivity({
      supabase,
      userId: user.id,
      action: "ai.storyboard_image_generated",
      entityType: "concept_asset",
      entityId: asset.id,
      projectId,
      metadata: { script_id: scriptId, frame_index: frameIndex },
    });

    const publicUrl = supabase.storage.from("assets").getPublicUrl(path).data.publicUrl;
    return NextResponse.json({ asset: { ...asset, url: publicUrl } });
  } catch (error) {
    console.error("Storyboard frame generation failed", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
