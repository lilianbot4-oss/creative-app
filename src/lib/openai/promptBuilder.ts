import type { BrandVoice, CreativeSpec } from "@/lib/types";
import type { GenerationMode } from "@/lib/constants";
import { OUTPUT_TEMPLATES } from "@/lib/ai/templates";
import { buildGuardrails } from "@/lib/ai/guardrails";

const BASE_SYSTEM_PROMPT = [
  "You are a senior creative director and brand strategist.",
  "You deliver campaign outputs that are structured, specific, and ready to present.",
  "Use markdown with clear headings and bullet points.",
  "Avoid filler. Be decisive and practical.",
].join(" ");

function formatBrandVoice(brandVoice?: BrandVoice | null) {
  if (!brandVoice) return null;
  const entries = Object.entries(brandVoice)
    .filter(([, value]) => value && String(value).trim().length > 0)
    .map(([key, value]) => `- ${key}: ${value}`);
  if (!entries.length) return null;
  return ["Brand voice constraints:", ...entries].join("\n");
}

function formatReferences(
  references?: Array<{ url?: string | null; notes?: string | null }>
) {
  if (!references?.length) return null;
  const lines = references.map((ref, index) => {
    const url = ref.url ?? "";
    const notes = ref.notes ? ` — ${ref.notes}` : "";
    return `${index + 1}. ${url}${notes}`.trim();
  });
  return ["References:", ...lines].join("\n");
}

function truncateText(text: string, limit: number) {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}…`;
}

export function buildPrompt(options: {
  mode: GenerationMode;
  briefText: string;
  parsedSummary?: Record<string, unknown> | null;
  brandVoice?: BrandVoice | null;
  ideaSeed?: string | null;
  references?: Array<{ url?: string | null; notes?: string | null }>;
  previousOutput?: string | null;
  feedback?: string | null;
  rewriteGoal?: string | null;
  creativeSpec?: CreativeSpec | null;
}) {
  const template = OUTPUT_TEMPLATES[options.mode];
  const summaryBlock = options.parsedSummary
    ? JSON.stringify(options.parsedSummary, null, 2)
    : null;

  const brandVoiceBlock = formatBrandVoice(options.brandVoice);
  const referencesBlock = formatReferences(options.references);
  const guardrailsBlock = buildGuardrails(options.creativeSpec ?? null);

  const systemPrompt = [
    BASE_SYSTEM_PROMPT,
    `Tone defaults: ${template.toneDefaults.join(", ")}.`,
  ].join("\n");

  const userPrompt = [
    `Generation mode: ${template.label}`,
    "\nRequired sections:",
    template.requiredSections.map((section) => `- ${section}`).join("\n"),
    "\nUse this outline structure:",
    template.exampleOutline,
    "\nBrief (raw):",
    truncateText(options.briefText, 4000),
    summaryBlock ? "\nBrief summary (parsed):" : null,
    summaryBlock,
    brandVoiceBlock ? "\n" + brandVoiceBlock : null,
    options.ideaSeed ? "\nIdea seed:" : null,
    options.ideaSeed,
    referencesBlock ? "\n" + referencesBlock : null,
    guardrailsBlock ? "\nConstraints:" : null,
    guardrailsBlock,
    options.previousOutput ? "\nLatest output (context):" : null,
    options.previousOutput,
    options.rewriteGoal ? "\nRewrite goal:" : null,
    options.rewriteGoal,
    options.feedback ? "\nFeedback to address:" : null,
    options.feedback,
    "\nOutput rules:",
    "- Use markdown headings that match the required sections.",
    "- Keep it concise but specific.",
    "- Use bullet points for lists.",
  ]
    .filter(Boolean)
    .join("\n");

  return { systemPrompt, userPrompt };
}
