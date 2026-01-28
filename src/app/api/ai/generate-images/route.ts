import { NextResponse } from "next/server";
import { z } from "zod";
import { GoogleGenAI, type GenerateImagesConfig } from "@google/genai";
import { openai } from "@/lib/openai/client";
import { createClient } from "@/lib/supabase/server";
import { enforceUsageLimit, estimateTokensFromText } from "@/lib/ai/usage";
import { getResolvedAISettings } from "@/lib/ai/settings";
import { DEFAULT_IMAGE_PROVIDER, ImageProvider } from "@/lib/ai/models";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

const imageSchema = z.object({
  projectId: z.string().uuid(),
  prompt: z.string().min(1),
  n: z.number().min(1).max(6).optional().default(4),
  size: z.enum(["1024x1024", "1024x1536", "1536x1024"]).optional().default("1024x1024"),
  aspect: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"]).optional(),
  style: z.enum(["moodboard", "storyboard", "key_visual"]).optional(),
});

function mapSizeToAspect(size: "1024x1024" | "1024x1536" | "1536x1024") {
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
    const parsed = imageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const { projectId, prompt, n, size, style, aspect } = parsed.data;
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
    let sizeLimitExceeded = false;
    let googleGenerationFailed = false;

    const requestCount = Math.min(n, 4);
    const combinedPrompt = style ? `${prompt}\nStyle: ${style}` : prompt;
    const aspectRatio = aspect ?? mapSizeToAspect(size);

    for (let i = 0; i < requestCount; i += 1) {
      let buffer: Buffer | null = null;
      try {
        if (provider === "google") {
          buffer = await generateGoogleImage({
            model: settings.image_model,
            prompt: combinedPrompt,
            aspectRatio,
          });
          if (!buffer) {
            googleGenerationFailed = true;
          }
        } else {
          const completion = await generateOneImage({
            model: settings.image_model,
            prompt: combinedPrompt,
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

    return NextResponse.json({
      references: createdReferences,
      errors,
      provider,
      model: settings.image_model,
    });
  } catch (error) {
    console.error("Image generation failed", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
