import type { BrandVoice } from "@/lib/types";
import type { GenerationMode } from "@/lib/constants";

const MODE_INSTRUCTIONS: Record<GenerationMode, string> = {
  expand: [
    "# Big Idea",
    "## Why It Spreads",
    "## Execution Steps",
    "## Required Assets",
    "## Channels & Distribution",
    "## Timeline",
    "## Risks & Mitigations",
    "## KPIs",
  ].join("\n"),
  alternatives: [
    "# Alternative Directions",
    "## A — [Title]",
    "- Rationale",
    "## B — [Title]",
    "- Rationale",
    "## C — [Title]",
    "- Rationale",
    "## D — [Title]",
    "- Rationale",
    "## E — [Title]",
    "- Rationale",
  ].join("\n"),
  virality: [
    "# Virality Boost Plan",
    "## Improved Hooks & Angles",
    "## 10 Hooks",
    "## 3 Share Triggers",
    "## Remix Ideas",
  ].join("\n"),
  pitch_outline: [
    "# Pitch Deck Outline",
    "## Slide 1 — Title & Big Idea",
    "## Slide 2 — The Problem",
    "## Slide 3 — The Insight",
    "## Slide 4 — The Idea",
    "## Slide 5 — How It Works",
    "## Slide 6 — Channel Strategy",
    "## Slide 7 — Content & Assets",
    "## Slide 8 — Timeline",
    "## Slide 9 — KPIs",
    "## Slide 10 — Budget & Next Steps",
  ].join("\n"),
  ugc_scripts: [
    "# UGC Scripts",
    "## Concept 1",
    "- Hook",
    "- Script",
    "- Shot List",
    "- Captions",
    "- CTA",
    "## Concept 2",
    "- Hook",
    "- Script",
    "- Shot List",
    "- Captions",
    "- CTA",
    "## Concept 3",
    "- Hook",
    "- Script",
    "- Shot List",
    "- Captions",
    "- CTA",
    "## Concept 4",
    "- Hook",
    "- Script",
    "- Shot List",
    "- Captions",
    "- CTA",
    "## Concept 5",
    "- Hook",
    "- Script",
    "- Shot List",
    "- Captions",
    "- CTA",
  ].join("\n"),
  storyboard: [
    "# Storyboard",
    "## Frames (8–12 beats)",
    "## Shot List",
    "## Voiceover / Copy",
  ].join("\n"),
  one_pager: [
    "# Campaign One-Pager",
    "## Objective",
    "## Target Audience",
    "## Key Message",
    "## Big Idea",
    "## Deliverables",
    "## Channels",
    "## Timeline",
    "## KPIs",
  ].join("\n"),
};

export function buildPrompt(options: {
  mode: GenerationMode;
  briefText: string;
  parsedSummary?: Record<string, unknown> | null;
  brandVoice?: BrandVoice | null;
  ideaSeed?: string | null;
  references?: Array<{ url?: string | null; notes?: string | null }>; 
  previousOutput?: string | null;
  feedback?: string | null;
}) {
  const summaryBlock = options.parsedSummary
    ? JSON.stringify(options.parsedSummary, null, 2)
    : null;

  const brandVoiceBlock = options.brandVoice
    ? JSON.stringify(options.brandVoice, null, 2)
    : null;

  const referencesBlock = options.references?.length
    ? options.references
        .map(
          (ref, index) =>
            `${index + 1}. ${ref.url ?? ""} ${ref.notes ? `— ${ref.notes}` : ""}`.trim()
        )
        .join("\n")
    : null;

  const systemPrompt =
    "You are a senior creative director and strategist. " +
    "Generate pitch-ready campaign outputs that are clear, structured, and practical. " +
    "Always respond in markdown with clean headings.";

  const userPrompt = [
    `Generation mode: ${options.mode}`,
    "\nBrief (raw):",
    options.briefText,
    summaryBlock ? "\nBrief summary (parsed):" : null,
    summaryBlock,
    brandVoiceBlock ? "\nBrand voice constraints:" : null,
    brandVoiceBlock,
    options.ideaSeed ? "\nIdea seed:" : null,
    options.ideaSeed,
    referencesBlock ? "\nReferences:" : null,
    referencesBlock,
    options.previousOutput ? "\nLatest output (for context):" : null,
    options.previousOutput,
    options.feedback ? "\nLatest feedback to address:" : null,
    options.feedback,
    "\nOutput structure to follow:",
    MODE_INSTRUCTIONS[options.mode],
    "\nBe concise but specific. Use bullet points where helpful.",
  ]
    .filter(Boolean)
    .join("\n");

  return { systemPrompt, userPrompt };
}

export function buildBriefParsingPrompt(rawBrief: string) {
  const systemPrompt =
    "You are a strategist who extracts structured information from creative briefs.";

  const userPrompt = [
    "Extract the following fields from the brief. Return only valid JSON.",
    "Fields: objective, target_audience, key_message, must_have, must_avoid, channels, budget_level, timeline, success_metrics",
    "If a field is missing, return an empty string or empty array.",
    "Brief:",
    rawBrief,
  ].join("\n\n");

  return { systemPrompt, userPrompt };
}
