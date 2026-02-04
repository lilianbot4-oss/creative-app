import type { CreativeSpec, BrandVoice } from "@/lib/types";
import { buildGuardrails } from "@/lib/ai/guardrails";

export function buildGenerateStoryboardPrompt(options: {
  spec: CreativeSpec;
  script: string;
  brandVoice?: BrandVoice | null;
}) {
  const guardrails = buildGuardrails(options.spec, options.brandVoice);
  const systemPrompt =
    "You are a production-minded creative. Turn scripts into clear storyboard frames and shot lists, respecting brand style guidelines.";

  const userPrompt = [
    "Return a JSON object with:",
    "frames: array of 8-12 objects with fields {frame, shot, setting, action, visual_prompt, os_text, audio, props}",
    "shotlist: object with fields {by_location: [], by_cast: [], props: []}",
    "Note: 'visual_prompt' should be a detailed description of the frame's visual content, suitable for an image generation AI, incorporating the brand style if provided.",
    guardrails ? "Constraints:" : null,
    guardrails,
    "Script:",
    options.script,
  ]
    .filter(Boolean)
    .join("\n\n");

  return { systemPrompt, userPrompt };
}
