import type { CreativeSpec, Concept } from "@/lib/types";
import { buildGuardrails } from "@/lib/ai/guardrails";

export function buildGenerateVariantsPrompt(spec: CreativeSpec, concept: Concept) {
  const guardrails = buildGuardrails(spec);
  const systemPrompt =
    "You are a senior creative director. Generate distinct angle variants for a campaign concept.";

  const userPrompt = [
    "Generate 5 distinct concept variants with different angles.",
    "Return a JSON array. Each object must include:",
    "angle (string), summary (string), tradeoffs (array of strings).",
    "Base concept:",
    `Title: ${concept.title}`,
    concept.one_liner ? `One-liner: ${concept.one_liner}` : null,
    concept.thesis ? `Thesis: ${concept.thesis}` : null,
    guardrails ? "Constraints:" : null,
    guardrails,
  ]
    .filter(Boolean)
    .join("\n\n");

  return { systemPrompt, userPrompt };
}
