import { getUserAISettings } from "@/lib/ai/settings";
import ModelsSettingsPanel from "@/components/settings/models-settings-panel";

export default async function ModelsSettingsPage() {
  const settings = await getUserAISettings();
  const aiEnabled = Boolean(
    process.env.OPENAI_API_KEY ||
      process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.GEMINI_API_KEY
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">AI Models</h2>
        <p className="text-sm text-muted-foreground">
          Choose the text and image models that power your creative workflows.
        </p>
      </div>
      <ModelsSettingsPanel settings={settings} aiEnabled={aiEnabled} />
    </div>
  );
}
