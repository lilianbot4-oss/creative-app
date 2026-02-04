import type { CreativeSpec, BrandVoice } from "@/lib/types";
import { buildGuardrails } from "@/lib/ai/guardrails";

export function buildGenerateConceptsPrompt(
  spec: CreativeSpec,
  options?: { seedText?: string | null; count?: number; brandVoice?: BrandVoice | null }
) {
  const guardrails = buildGuardrails(spec, options?.brandVoice);
  const systemPrompt =
    "You are a senior creative director. Generate viral-ready campaign concepts that fit the brief and adhere strictly to brand voice guidelines.";

  const count = options?.count ?? 6;
  const seedText = options?.seedText?.trim();

  const userPrompt = [
    `Generate ${count} distinct campaign concept${count === 1 ? "" : "s"}.`,
    seedText ? `Seed idea to expand: ${seedText}` : null,
    "Return a JSON array. Each object must include:",
    "title, one_liner, thesis, share_triggers (array of strings), product_integration (string), cast_archetypes (array of strings), beats (array), risks (array of {risk, mitigation}), scalability (string).",
    "Product integration (how the brand naturally shows up).",
    guardrails ? "Constraints:" : null,
    guardrails,
    spec.raw_brief_text ? "Brief:" : null,
    spec.raw_brief_text,
  ]
    .filter(Boolean)
    .join("\n\n");

  return { systemPrompt, userPrompt };
}
