import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_REASONING_MODE,
  DEFAULT_TEXT_MODEL,
  DEFAULT_IMAGE_PROVIDER,
  ImageProvider,
  isImageProvider,
  resolveImageSelection,
  resolveTextModel,
  validateModelId,
  TEXT_MODEL_PRESETS,
} from "@/lib/ai/models";

export type AISettings = {
  id: string;
  user_id: string;
  text_model: string;
  image_model: string | null;
  image_provider: ImageProvider;
  reasoning_mode: "fast" | "balanced" | "premium";
  created_at: string;
  updated_at: string;
};

export type ProjectAISettings = {
  id: string;
  user_id: string;
  project_id: string;
  text_model: string | null;
  image_model: string | null;
  image_provider: ImageProvider | null;
  reasoning_mode: "fast" | "balanced" | "premium" | null;
  created_at: string;
};

const DEFAULT_SETTINGS = {
  text_model: DEFAULT_TEXT_MODEL,
  image_model: null,
  image_provider: DEFAULT_IMAGE_PROVIDER,
  reasoning_mode: DEFAULT_REASONING_MODE as AISettings["reasoning_mode"],
};

export async function getUserAISettings() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("ai_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (data) {
    const settings = data as AISettings;
    return {
      ...settings,
      image_provider: (settings.image_provider ?? DEFAULT_IMAGE_PROVIDER) as ImageProvider,
    };
  }

  const { data: created, error: insertError } = await supabase
    .from("ai_settings")
    .insert({
      user_id: user.id,
      text_model: DEFAULT_SETTINGS.text_model,
      image_model: DEFAULT_SETTINGS.image_model,
      image_provider: DEFAULT_SETTINGS.image_provider,
      reasoning_mode: DEFAULT_SETTINGS.reasoning_mode,
    })
    .select()
    .maybeSingle();

  if (insertError || !created) throw insertError || new Error("Failed to init AI settings");
  return created as AISettings;
}

export async function updateUserAISettings(input: {
  text_model?: string | null;
  image_model?: string | null;
  image_provider?: string | null;
  reasoning_mode?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated");

  const current = await getUserAISettings();

  const nextText = validateModelId(TEXT_MODEL_PRESETS, input.text_model)
    ? (input.text_model as string)
    : current.text_model ?? DEFAULT_TEXT_MODEL;

  const requestedProvider = isImageProvider(input.image_provider)
    ? input.image_provider
    : current.image_provider ?? DEFAULT_IMAGE_PROVIDER;

  const resolvedImage = resolveImageSelection({
    selectedId: input.image_model ?? current.image_model ?? null,
    selectedProvider: requestedProvider,
  });
  const nextImage = resolvedImage.image_model;
  const nextImageProvider = resolvedImage.image_provider;

  const nextReasoning =
    (input.reasoning_mode as AISettings["reasoning_mode"]) ??
    current.reasoning_mode ??
    DEFAULT_REASONING_MODE;

  const { data, error } = await supabase
    .from("ai_settings")
    .update({
      text_model: nextText,
      image_model: nextImage,
      image_provider: nextImageProvider,
      reasoning_mode: nextReasoning,
    })
    .eq("user_id", user.id)
    .select()
    .maybeSingle();

  if (error) throw error;
  return {
    settings: data as AISettings,
    reverted:
      (input.text_model && input.text_model !== nextText) ||
      (input.image_model && input.image_model !== nextImage) ||
      (input.image_provider && input.image_provider !== nextImageProvider),
  };
}

export async function getResolvedAISettings(projectId?: string | null) {
  const base = await getUserAISettings();
  let textModel = base.text_model;
  let imageModel = base.image_model;
  let imageProvider = base.image_provider ?? DEFAULT_IMAGE_PROVIDER;
  let reasoningMode = base.reasoning_mode;

  if (projectId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("project_ai_settings")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();

    if (data) {
      const override = data as ProjectAISettings;
      textModel = override.text_model ?? textModel;
      imageModel = override.image_model ?? imageModel;
      imageProvider = override.image_provider ?? imageProvider;
      reasoningMode = override.reasoning_mode ?? reasoningMode;
    }
  }

  const resolvedImage = resolveImageSelection({
    selectedId: imageModel,
    selectedProvider: imageProvider,
  });

  return {
    ...base,
    text_model: resolveTextModel({ reasoningMode, selectedId: textModel }),
    image_model: resolvedImage.image_model,
    image_provider: resolvedImage.image_provider,
    reasoning_mode: reasoningMode,
  } as AISettings;
}
