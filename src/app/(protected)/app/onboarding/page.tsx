import { redirect } from "next/navigation";
import { getClientProjectCounts } from "@/lib/data";
import OnboardingWizard from "@/components/onboarding/onboarding-wizard";

export default async function OnboardingPage() {
  const { clientCount, projectCount } = await getClientProjectCounts();
  if (clientCount > 0 && projectCount > 0) {
    redirect("/app");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Welcome to Creative Copilot</h2>
        <p className="text-sm text-muted-foreground">
          Let&apos;s set up your first client and generate a summary in minutes.
        </p>
      </div>
      <OnboardingWizard
        aiEnabled={Boolean(
          process.env.OPENAI_API_KEY ||
            process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
            process.env.GOOGLE_CLOUD_PROJECT ||
            process.env.GEMINI_API_KEY
        )}
      />
    </div>
  );
}
