export const PROJECT_STATUSES = [
  "ideation",
  "pitch",
  "revision",
  "approved",
  "delivered",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const GENERATION_MODES = [
  "expand",
  "alternatives",
  "virality",
  "pitch_outline",
  "ugc_scripts",
  "storyboard",
  "one_pager",
  "press_release",
  "faq",
] as const;

export type GenerationMode = (typeof GENERATION_MODES)[number];

export const GENERATION_MODE_LABELS: Record<GenerationMode, string> = {
  expand: "Expand",
  alternatives: "Alternatives",
  virality: "Virality",
  pitch_outline: "Pitch Outline",
  ugc_scripts: "UGC Scripts",
  storyboard: "Storyboard",
  one_pager: "One Pager",
  press_release: "Press Release",
  faq: "FAQ",
};
