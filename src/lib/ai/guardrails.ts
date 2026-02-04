import type { CreativeSpec, BrandVoice } from "@/lib/types";

function formatList(items?: string[] | null) {
  if (!items || items.length === 0) return null;
  return items.filter((item) => item.trim().length > 0).map((item) => `- ${item}`);
}

export function buildGuardrails(spec?: CreativeSpec | null, brandVoice?: BrandVoice | null) {
  const blocks: string[] = [];

  if (brandVoice) {
    const voiceBlocks = [
      "Brand Voice & Guidelines:",
      brandVoice.tone ? `Tone: ${brandVoice.tone}` : null,
      brandVoice.audience ? `Target Audience: ${brandVoice.audience}` : null,
      brandVoice.do ? `Dos: ${brandVoice.do}` : null,
      brandVoice.dont ? `Don'ts: ${brandVoice.dont}` : null,
      brandVoice.style_guidelines ? `Style Guidelines: ${brandVoice.style_guidelines}` : null,
      brandVoice.banned_words ? `Banned Words: ${brandVoice.banned_words}` : null,
    ].filter(Boolean);
    
    if (voiceBlocks.length > 1) {
      blocks.push(...(voiceBlocks as string[]));
    }
  }

  if (spec) {
    const specBlocks = [
      "Creative constraints (must follow strictly):",
      spec.key_message ? `Key message: ${spec.key_message}` : null,
      spec.audience ? `Audience: ${spec.audience}` : null,
    ].filter(Boolean);

    const deliverables =
      spec.deliverables?.map((item) =>
        item.notes ? `${item.type}: ${item.notes}` : item.type
      ) ?? null;
    const deliverableLines = deliverables?.length
      ? deliverables.map((item) => `- ${item}`)
      : null;

    if (deliverableLines) {
      specBlocks.push("Deliverables:", ...deliverableLines);
    }

    const mustDo = formatList(spec.must_do);
    if (mustDo) {
      specBlocks.push("Must do:", ...mustDo);
    }

    const mustAvoid = formatList(spec.must_avoid);
    if (mustAvoid) {
      specBlocks.push("Must avoid (do not include these items):", ...mustAvoid);
    }

    const toneTags = formatList(spec.tone_tags);
    if (toneTags) {
      specBlocks.push("Tone tags:", ...toneTags);
    }

    if (specBlocks.length > 0) {
      if (blocks.length > 0) blocks.push(""); // Spacer
      blocks.push(...specBlocks);
    }
  }

  if (blocks.length === 0) return null;
  return blocks.join("\n");
}
