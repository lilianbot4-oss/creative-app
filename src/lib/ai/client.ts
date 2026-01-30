import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createVertex } from "@ai-sdk/google-vertex";

export const openaiProvider = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const googleProvider = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export const vertexProvider = createVertex({
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
});

export const hasOpenAIConfig = () => Boolean(process.env.OPENAI_API_KEY);
export const hasGoogleAIStudioKey = () =>
  Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
export const hasVertexConfig = () => Boolean(process.env.GOOGLE_CLOUD_PROJECT);
export const hasGoogleAIConfig = () => hasGoogleAIStudioKey() || hasVertexConfig();

export const GOOGLE_CREDENTIALS_ERROR =
  "Missing Google AI credentials. Set GOOGLE_GENERATIVE_AI_API_KEY (AI Studio) or GOOGLE_CLOUD_PROJECT + GOOGLE_APPLICATION_CREDENTIALS (Vertex).";

export function getModel(modelId: string) {
  if (modelId.startsWith("gpt")) {
    return openaiProvider(modelId);
  }
  if (modelId.startsWith("gemini")) {
    if (hasGoogleAIStudioKey()) {
      return googleProvider(modelId);
    }
    if (hasVertexConfig()) {
      return vertexProvider(modelId);
    }
    return googleProvider(modelId);
  }
  return openaiProvider("gpt-5-mini");
}
