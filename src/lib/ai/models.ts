export type ModelCapability = {
  text: boolean;
  images: boolean;
  vision?: boolean;
  tools?: boolean;
  json?: boolean;
};

export type ModelInfo = {
  id: string;
  label: string;
  description: string;
  speed: "fast" | "medium" | "slow";
  cost: "low" | "medium" | "high";
  capabilities: ModelCapability;
  recommendedFor: string[];
};

export const DEFAULT_TEXT_MODEL = "gpt-4.1-mini";
export const DEFAULT_REASONING_MODE = "balanced";

export const TEXT_MODEL_PRESETS: ModelInfo[] = [
  {
    id: "gpt-4.1-mini",
    label: "GPT-4.1 Mini",
    description: "Fast, cost-effective model for everyday creative tasks.",
    speed: "fast",
    cost: "low",
    capabilities: { text: true, images: false, json: true, tools: true },
    recommendedFor: ["Quick drafts", "Brief parsing", "Ideation"],
  },
  {
    id: "gpt-4.1",
    label: "GPT-4.1",
    description: "Balanced quality for pitch-ready creative outputs.",
    speed: "medium",
    cost: "medium",
    capabilities: { text: true, images: false, json: true, tools: true },
    recommendedFor: ["Campaign concepts", "Scriptwriting", "Pitch decks"],
  },
  {
    id: "gpt-4o",
    label: "GPT-4o",
    description: "Premium quality for the most polished outputs.",
    speed: "slow",
    cost: "high",
    capabilities: { text: true, images: false, json: true, tools: true, vision: true },
    recommendedFor: ["Client-facing copy", "High-stakes pitches"],
  },
];

export const IMAGE_MODEL_PRESETS: ModelInfo[] = [
  {
    id: "gpt-image-1",
    label: "GPT Image 1",
    description: "Fast image generation for moodboards and storyboard comps.",
    speed: "fast",
    cost: "medium",
    capabilities: { text: false, images: true },
    recommendedFor: ["Moodboards", "Storyboard frames"],
  },
  {
    id: "dall-e-3",
    label: "DALL·E 3",
    description: "High-quality visuals for key art and hero concepts.",
    speed: "slow",
    cost: "high",
    capabilities: { text: false, images: true },
    recommendedFor: ["Key visuals", "High fidelity comps"],
  },
];

export function validateModelId(list: ModelInfo[], selectedId?: string | null) {
  if (!selectedId) return false;
  return list.some((item) => item.id === selectedId);
}

export function getTextModelInfo(id?: string | null) {
  if (!id) return null;
  return TEXT_MODEL_PRESETS.find((item) => item.id === id) ?? null;
}

export function getImageModelInfo(id?: string | null) {
  if (!id) return null;
  return IMAGE_MODEL_PRESETS.find((item) => item.id === id) ?? null;
}

export function resolveTextModel(options: {
  reasoningMode?: string | null;
  selectedId?: string | null;
}) {
  if (validateModelId(TEXT_MODEL_PRESETS, options.selectedId)) {
    return options.selectedId as string;
  }

  switch (options.reasoningMode) {
    case "fast":
      return DEFAULT_TEXT_MODEL;
    case "premium":
      return "gpt-4o";
    case "balanced":
    default:
      return "gpt-4.1";
  }
}

export function resolveImageModel(selectedId?: string | null) {
  if (validateModelId(IMAGE_MODEL_PRESETS, selectedId)) {
    return selectedId as string;
  }
  return null;
}
