import type { Concept, ConceptVariant, CreativeSpec, BrandVoice } from "@/lib/types";
import type { ScriptFormat } from "@/lib/constants";
import { buildGuardrails } from "@/lib/ai/guardrails";

export function buildGenerateScriptPrompt(options: {
  spec: CreativeSpec;
  format: ScriptFormat;
  concept?: Concept | null;
  variant?: ConceptVariant | null;
  brandVoice?: BrandVoice | null;
}) {
  const guardrails = buildGuardrails(options.spec, options.brandVoice);
  const systemPrompt =
    "You are a senior social creative writer. Produce tight, TikTok-native scripts with clear structure, following brand voice and constraints.";

  const userPrompt = [
    `Format: ${options.format}`,
    options.concept ? `Concept: ${options.concept.title}` : null,
    options.concept?.one_liner ? `Concept one-liner: ${options.concept.one_liner}` : null,
    options.variant ? `Variant angle: ${options.variant.angle}` : null,
    options.variant?.summary ? `Variant summary: ${options.variant.summary}` : null,
    guardrails ? "Constraints:" : null,
    guardrails,
    "Output must be markdown with headings in this exact order:",
    "# Hook",
    "# Beats",
    "# Dialogue",
    "# On-screen text",
    "# Camera notes",
    "# Sound/music",
    "# Product moment",
    "# CTA",
    "Keep it platform-native and punchy.",
  ]
    .filter(Boolean)
    .join("\n\n");

  return { systemPrompt, userPrompt };
}
