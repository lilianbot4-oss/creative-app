import type { CreativeSpec } from "@/lib/types";
import { buildGuardrails } from "@/lib/ai/guardrails";

export function buildGenerateStoryboardPrompt(options: {
  spec: CreativeSpec;
  script: string;
}) {
  const guardrails = buildGuardrails(options.spec);
  const systemPrompt =
    "You are a production-minded creative. Turn scripts into clear storyboard frames and shot lists.";

  const userPrompt = [
    "Return a JSON object with:",
    "frames: array of 8-12 objects with fields {frame, shot, setting, action, os_text, audio, props}",
    "shotlist: object with fields {by_location: [], by_cast: [], props: []}",
    guardrails ? "Constraints:" : null,
    guardrails,
    "Script:",
    options.script,
  ]
    .filter(Boolean)
    .join("\n\n");

  return { systemPrompt, userPrompt };
}
