import type { CreativeSpec } from "@/lib/types";

function formatList(items?: string[] | null) {
  if (!items || items.length === 0) return null;
  return items.filter((item) => item.trim().length > 0).map((item) => `- ${item}`);
}

export function buildGuardrails(spec?: CreativeSpec | null) {
  if (!spec) return null;

  const mustDo = formatList(spec.must_do);
  const mustAvoid = formatList(spec.must_avoid);
  const toneTags = formatList(spec.tone_tags);
  const deliverables =
    spec.deliverables?.map((item) =>
      item.notes ? `${item.type}: ${item.notes}` : item.type
    ) ?? null;
  const deliverableLines = deliverables?.length
    ? deliverables.map((item) => `- ${item}`)
    : null;

  const blocks = [
    "Creative constraints (must follow strictly):",
    spec.key_message ? `Key message: ${spec.key_message}` : null,
    spec.audience ? `Audience: ${spec.audience}` : null,
    deliverableLines ? "Deliverables:" : null,
    ...(deliverableLines ?? []),
    mustDo ? "Must do:" : null,
    ...(mustDo ?? []),
    mustAvoid ? "Must avoid (do not include these items):" : null,
    ...(mustAvoid ?? []),
    toneTags ? "Tone tags:" : null,
    ...(toneTags ?? []),
  ].filter(Boolean);

  if (blocks.length === 0) return null;
  return blocks.join("\n");
}
