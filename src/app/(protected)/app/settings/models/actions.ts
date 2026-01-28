"use server";

import { z } from "zod";
import { updateUserAISettings } from "@/lib/ai/settings";
import { DEFAULT_REASONING_MODE } from "@/lib/ai/models";

const settingsSchema = z.object({
  text_model: z.string().optional().nullable(),
  image_model: z.string().optional().nullable(),
  image_provider: z.enum(["openai", "google"]).optional().nullable(),
  reasoning_mode: z.enum(["fast", "balanced", "premium"]).optional().nullable(),
});

export async function updateAISettingsAction(input: {
  text_model?: string | null;
  image_model?: string | null;
  image_provider?: string | null;
  reasoning_mode?: string | null;
}) {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid settings" };
  }

  const result = await updateUserAISettings({
    text_model: parsed.data.text_model ?? null,
    image_model: parsed.data.image_model ?? null,
    image_provider: parsed.data.image_provider ?? null,
    reasoning_mode: (parsed.data.reasoning_mode ?? DEFAULT_REASONING_MODE) as string,
  });

  return { success: true, ...result };
}
