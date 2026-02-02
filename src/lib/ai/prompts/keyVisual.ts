import type { Concept, ConceptVariant, CreativeSpec, Script } from "@/lib/types";
import { buildGuardrails } from "@/lib/ai/guardrails";

type KeyVisualInput = {
  creativeSpec: CreativeSpec | null;
  concept?: Concept | null;
  variant?: ConceptVariant | null;
  script?: Script | null;
  seedText?: string | null;
  guidance?: string | null;
  style?: "key_visual" | "moodboard" | "storyboard_frame" | string;
};

export function buildKeyVisualPrompt(input: KeyVisualInput) {
  const guardrails = buildGuardrails(input.creativeSpec ?? null);
  const integration = input.concept?.product_integration ?? null;
  const conceptBlock = input.concept
    ? [
        `Concept: ${input.concept.title}`,
        input.concept.one_liner ? `One-liner: ${input.concept.one_liner}` : null,
        integration ? `Product integration: ${integration}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    : null;

  const variantBlock = input.variant
    ? `Variant angle: ${input.variant.angle}\n${input.variant.summary ?? ""}`
    : null;

  const scriptBlock = input.script
    ? `Script format: ${input.script.format}\n${input.script.script_md.slice(0, 800)}`
    : null;

  const styleLine = input.style ? `Style: ${input.style}` : null;
  const seed = input.seedText ? `Seed: ${input.seedText}` : null;
  const guidance = input.guidance ? `Guidance: ${input.guidance}` : null;

  const prompt = [
    "Generate a key visual for a social-first campaign pitch.",
    "The image should feel TikTok-native, comedic, and character-driven.",
    "Keep it simple and low-budget: avoid expensive sets, avoid cinematic lighting.",
    "Clear archetype, bold silhouette, easy to read at a glance.",
    styleLine,
    seed,
    guidance,
    conceptBlock,
    variantBlock,
    scriptBlock,
    guardrails ? "Constraints (must follow):" : null,
    guardrails,
    "Negative constraints: avoid anything in must_avoid, avoid luxury locations, avoid celebrities.",
  ]
    .filter(Boolean)
    .join("\n\n");

  return prompt;
}
