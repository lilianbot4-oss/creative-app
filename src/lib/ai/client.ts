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

export function getModel(modelId: string) {
    if (modelId.startsWith("gpt")) {
        return openaiProvider(modelId);
    }
    if (modelId.startsWith("gemini")) {
        // Default to Google Generative AI (AI Studio)
        // If Vertex is preferred, this could be changed
        return googleProvider(modelId);
    }
    return openaiProvider("gpt-4o-mini");
}
