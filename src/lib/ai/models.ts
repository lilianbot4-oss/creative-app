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

export type ImageProvider = "openai" | "google";

export type ImageModelInfo = ModelInfo & {
  provider: ImageProvider;
};

export const DEFAULT_TEXT_MODEL = "gpt-4.1-mini";
export const DEFAULT_REASONING_MODE = "balanced";
export const DEFAULT_IMAGE_PROVIDER: ImageProvider = "openai";

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
  {
    id: "gemini-3-pro-preview",
    label: "Gemini 3 Pro Preview",
    description: "Preview flagship model for deep reasoning and multimodal work.",
    speed: "slow",
    cost: "high",
    capabilities: { text: true, images: false, json: true, tools: true, vision: true },
    recommendedFor: ["Complex reasoning", "Agentic workflows", "Multimodal analysis"],
  },
  {
    id: "gemini-3-flash-preview",
    label: "Gemini 3 Flash Preview",
    description: "Preview balanced model tuned for speed, scale, and quality.",
    speed: "fast",
    cost: "medium",
    capabilities: { text: true, images: false, json: true, tools: true, vision: true },
    recommendedFor: ["High-throughput tasks", "Real-time assistants", "Multimodal analysis"],
  },
  {
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    description: "Stable, high-end model for complex reasoning and long context.",
    speed: "medium",
    cost: "high",
    capabilities: { text: true, images: false, json: true, tools: true, vision: true },
    recommendedFor: ["Strategic planning", "Long-form content", "Complex reasoning"],
  },
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    description: "Best price-performance for high-volume, low-latency workloads.",
    speed: "fast",
    cost: "low",
    capabilities: { text: true, images: false, json: true, tools: true, vision: true },
    recommendedFor: ["High-volume processing", "Fast iterations", "Agentic tasks"],
  },
  {
    id: "gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash-Lite",
    description: "Lowest-latency option optimized for cost-sensitive scale.",
    speed: "fast",
    cost: "low",
    capabilities: { text: true, images: false, json: true, tools: true, vision: true },
    recommendedFor: ["Bulk processing", "Realtime responses", "Cost-sensitive workloads"],
  },
];

export const IMAGE_MODEL_PRESETS: ImageModelInfo[] = [
  {
    id: "gpt-image-1",
    label: "GPT Image 1",
    description: "Fast image generation for moodboards and storyboard comps.",
    speed: "fast",
    cost: "medium",
    capabilities: { text: false, images: true },
    recommendedFor: ["Moodboards", "Storyboard frames"],
    provider: "openai",
  },
  {
    id: "dall-e-3",
    label: "DALL·E 3",
    description: "High-quality visuals for key art and hero concepts.",
    speed: "slow",
    cost: "high",
    capabilities: { text: false, images: true },
    recommendedFor: ["Key visuals", "High fidelity comps"],
    provider: "openai",
  },
  {
    id: "imagen-4.0-generate-001",
    label: "Google Imagen 4",
    description: "High-fidelity imagery for polished key visuals and hero art.",
    speed: "slow",
    cost: "high",
    capabilities: { text: false, images: true },
    recommendedFor: ["High fidelity comps", "Key visuals", "Product shots"],
    provider: "google",
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

export function getImageModelInfo(
  id?: string | null,
  provider?: ImageProvider | null
) {
  if (!id) return null;
  if (provider) {
    return (
      IMAGE_MODEL_PRESETS.find(
        (item) => item.id === id && item.provider === provider
      ) ?? null
    );
  }
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

export function resolveImageSelection(options: {
  selectedId?: string | null;
  selectedProvider?: ImageProvider | null;
}) {
  const info = options.selectedId
    ? IMAGE_MODEL_PRESETS.find((item) => item.id === options.selectedId)
    : null;

  if (!info) {
    return {
      image_model: null,
      image_provider: options.selectedProvider ?? DEFAULT_IMAGE_PROVIDER,
    };
  }

  return {
    image_model: info.id,
    image_provider: info.provider,
  };
}

export function isImageProvider(value?: string | null): value is ImageProvider {
  return value === "openai" || value === "google";
}
