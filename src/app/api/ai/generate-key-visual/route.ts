import { NextResponse } from "next/server";
import { z } from "zod";
import { openai } from "@/lib/openai/client";
import { createClient } from "@/lib/supabase/server";
import { enforceUsageLimit, estimateTokensFromText } from "@/lib/ai/usage";
import { getResolvedAISettings } from "@/lib/ai/settings";
import { buildKeyVisualPrompt } from "@/lib/ai/prompts/keyVisual";

export const runtime = "nodejs";

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

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 400 });
    }

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
      return NextResponse.json(
        { error: "Daily AI request limit reached. Try again tomorrow." },
        { status: 429 }
      );
    }

    const completion = await openai.images.generate({
      model: settings.image_model,
      prompt,
      n,
      size,
      response_format: "b64_json",
    });

    const images = completion.data ?? [];
    if (images.length === 0) {
      return NextResponse.json({ error: "No images returned" }, { status: 500 });
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

    for (let i = 0; i < images.length; i += 1) {
      const buffer = await bufferFromImage(images[i]);
      if (!buffer) {
        errors.push({ index: i, error: "Missing image buffer" });
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

    return NextResponse.json({ assets: createdAssets, errors });
  } catch (error) {
    console.error("Key visual generation failed", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
