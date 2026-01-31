import { NextResponse } from "next/server";
import { z } from "zod";
import { GoogleGenAI, type GenerateImagesConfig } from "@google/genai";
import { openai } from "@/lib/openai/client";
import { createClient } from "@/lib/supabase/server";
import { enforceUsageLimit, estimateTokensFromText } from "@/lib/ai/usage";
import { getResolvedAISettings } from "@/lib/ai/settings";
import { buildKeyVisualPrompt } from "@/lib/ai/prompts/keyVisual";
import { DEFAULT_IMAGE_PROVIDER, ImageProvider } from "@/lib/ai/models";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

const requestSchema = z.object({
  projectId: z.string().uuid(),
  conceptId: z.string().uuid().optional().nullable(),
  variantId: z.string().uuid().optional().nullable(),
  scriptId: z.string().uuid().optional().nullable(),
  style: z.enum(["key_visual", "moodboard", "storyboard_frame"]).optional().default("key_visual"),
  seedText: z.string().optional().nullable(),
  guidance: z.string().optional().nullable(),
  n: z.number().min(1).max(4).optional().default(4),
  size: z.enum(["1024x1024", "1536x1024", "1024x1536"]).optional().default("1024x1024"),
});

function mapSizeToAspect(size: "1024x1024" | "1536x1024" | "1024x1536") {
  switch (size) {
    case "1024x1024":
      return "1:1";
    default:
      return null;
  }
}

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
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId, conceptId, variantId, scriptId, style, seedText, guidance, n, size } =
      parsed.data;

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

    const provider = (settings.image_provider ?? DEFAULT_IMAGE_PROVIDER) as ImageProvider;
    if (provider === "google" && !process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 400 });
    }
    if (provider === "openai" && !process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 400 });
    }

    const [{ data: creativeSpec }, concept, variant, script] = await Promise.all([
      supabase.from("creative_specs").select("*").eq("project_id", projectId).maybeSingle(),
      conceptId
        ? supabase
            .from("concepts")
            .select("*")
            .eq("id", conceptId)
            .eq("user_id", user.id)
            .maybeSingle()
            .then((res) => res.data)
        : Promise.resolve(null),
      variantId
        ? supabase
            .from("concept_variants")
            .select("*")
            .eq("id", variantId)
            .eq("user_id", user.id)
            .maybeSingle()
            .then((res) => res.data)
        : Promise.resolve(null),
      scriptId
        ? supabase
            .from("scripts")
            .select("*")
            .eq("id", scriptId)
            .eq("user_id", user.id)
            .maybeSingle()
            .then((res) => res.data)
        : Promise.resolve(null),
    ]);

    const prompt = buildKeyVisualPrompt({
      creativeSpec: creativeSpec ?? null,
      concept: concept ?? null,
      variant: variant ?? null,
      script: script ?? null,
      seedText,
      guidance,
      style,
    });

    const usage = await enforceUsageLimit(
      supabase,
      user.id,
      estimateTokensFromText(prompt) * n
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

    const createdAssets: Array<{
      id: string;
      storage_bucket: string;
      storage_path: string;
      public_url: string;
      asset_type: string;
      is_primary: boolean;
      prompt_text: string | null;
      created_at: string;
    }> = [];
    const errors: Array<{ index: number; error: string }> = [];
    let sizeLimitExceeded = false;
    let googleGenerationFailed = false;
    const requestCount = Math.min(n, 4);
    const aspectRatio = mapSizeToAspect(size);

    for (let i = 0; i < requestCount; i += 1) {
      let buffer: Buffer | null = null;
      try {
        if (provider === "google") {
          buffer = await generateGoogleImage({
            model: settings.image_model,
            prompt,
            aspectRatio,
          });
          if (!buffer) {
            googleGenerationFailed = true;
          }
        } else {
          const completion = await generateOneImage({
            model: settings.image_model,
            prompt,
            size,
          });
          const image = completion.data?.[0];
          buffer = image ? await bufferFromImage(image) : null;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Image generation failed";
        if (provider === "google") {
          googleGenerationFailed = true;
          console.error("Google image generation failed", error);
        }
        errors.push({ index: i, error: message });
        continue;
      }

      if (!buffer) {
        errors.push({ index: i, error: "No image returned" });
        continue;
      }

      if (buffer.byteLength > MAX_IMAGE_BYTES) {
        sizeLimitExceeded = true;
        errors.push({ index: i, error: "Generated image exceeds 25MB limit." });
        continue;
      }

      const path = `${user.id}/${projectId}/concepts/${conceptId ?? "unknown"}/${Date.now()}-${i}.png`;
      const { error: uploadError } = await supabase.storage
        .from("assets")
        .upload(path, buffer, { contentType: "image/png", upsert: true });

      if (uploadError) {
        errors.push({ index: i, error: uploadError.message });
        continue;
      }

      const { data: asset, error: insertError } = await supabase
        .from("concept_assets")
        .insert({
          user_id: user.id,
          project_id: projectId,
          concept_id: conceptId ?? null,
          variant_id: variantId ?? null,
          script_id: scriptId ?? null,
          asset_type: style ?? "key_visual",
          prompt_text: prompt,
          storage_bucket: "assets",
          storage_path: path,
          mime_type: "image/png",
          file_size: buffer.length,
          is_primary: false,
        })
        .select("id, storage_bucket, storage_path, asset_type, is_primary, prompt_text, created_at")
        .maybeSingle();

      if (insertError || !asset) {
        errors.push({ index: i, error: insertError?.message ?? "Failed to save asset" });
        continue;
      }

      const publicUrl = supabase.storage.from("assets").getPublicUrl(path).data.publicUrl;
      createdAssets.push({
        id: asset.id,
        storage_bucket: asset.storage_bucket,
        storage_path: asset.storage_path,
        public_url: publicUrl,
        asset_type: asset.asset_type,
        is_primary: asset.is_primary,
        prompt_text: asset.prompt_text,
        created_at: asset.created_at,
      });
    }

    if (createdAssets.length === 0) {
      const errorMessage = errors[0]?.error ?? "No images returned";
      if (sizeLimitExceeded) {
        return NextResponse.json({ error: errorMessage, errors }, { status: 413 });
      }
      if (provider === "google" && googleGenerationFailed) {
        return NextResponse.json(
          { error: "Image generation failed", details: errorMessage, errors },
          { status: 502 }
        );
      }
      return NextResponse.json(
        { error: errorMessage, errors },
        { status: 500 }
      );
    }

    void logActivity({
      supabase,
      userId: user.id,
      action: "ai.key_visual_generated",
      entityType: "concept_asset",
      entityId: createdAssets[0]?.id ?? null,
      projectId,
      metadata: {
        count: createdAssets.length,
        style,
        concept_id: conceptId ?? null,
        variant_id: variantId ?? null,
        script_id: scriptId ?? null,
        provider,
        model: settings.image_model,
      },
    });

    return NextResponse.json({
      assets: createdAssets,
      errors,
      provider,
      model: settings.image_model,
    });
  } catch (error) {
    console.error("Key visual generation failed", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
