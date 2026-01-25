import type { CreativeSpec } from "@/lib/types";
import { buildGuardrails } from "@/lib/ai/guardrails";

export function buildGenerateConceptsPrompt(spec: CreativeSpec) {
  const guardrails = buildGuardrails(spec);
  const systemPrompt =
    "You are a senior creative director. Generate viral-ready campaign concepts that fit the brief.";

  const userPrompt = [
    "Generate 6 distinct campaign concepts.",
    "Return a JSON array. Each object must include:",
    "title, one_liner, thesis, share_triggers (array of strings), doorDash_integration (string), cast_archetypes (array of strings), beats (array), risks (array of {risk, mitigation}), scalability (string).",
    guardrails ? "Constraints:" : null,
    guardrails,
    spec.raw_brief_text ? "Brief:" : null,
    spec.raw_brief_text,
  ]
    .filter(Boolean)
    .join("\n\n");

  return { systemPrompt, userPrompt };
}
