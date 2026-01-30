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
  expand: "Full Breakdown",
  alternatives: "Alternative Directions",
  virality: "Virality",
  pitch_outline: "Presentation Outline",
  ugc_scripts: "Creator Scripts",
  storyboard: "Storyboard",
  one_pager: "Summary",
  press_release: "Press Release",
  faq: "FAQ",
};

export const SCRIPT_FORMATS = [
  "launch_30",
  "launch_60",
  "ugc_15",
  "influencer_brief",
  "hooks_captions",
  "punchlines_alt_endings",
] as const;

export type ScriptFormat = (typeof SCRIPT_FORMATS)[number];

export const SCRIPT_FORMAT_LABELS: Record<ScriptFormat, string> = {
  launch_30: "Launch Video (30s)",
  launch_60: "Launch Video (60s)",
  ugc_15: "Creator Video (15s)",
  influencer_brief: "Influencer Brief",
  hooks_captions: "Hooks + Captions",
  punchlines_alt_endings: "Punchlines + Alt Endings",
};
