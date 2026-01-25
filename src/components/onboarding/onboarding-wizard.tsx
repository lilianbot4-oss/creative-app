"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createBriefAction, createClientAction, createProjectAction } from "@/app/(protected)/app/actions";

const sampleBrief =
  "Launch a sustainable travel luggage line for remote workers. Target: digital nomads 25-40. Must include social-first launch, influencer kits, and a preorder waitlist. Budget mid-range. Timeline: 8 weeks.";
const sampleIdea = "Make packing feel like prepping for a new chapter, not a chore.";

const clientSchema = z.object({
  name: z.string().min(1, "Client name is required"),
  industry: z.string().optional(),
});

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
});

const briefSchema = z.object({
  raw_text: z.string().min(1, "Brief is required"),
});

export default function OnboardingWizard({ aiEnabled }: { aiEnabled: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [clientId, setClientId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [ideaSeed, setIdeaSeed] = useState("");
  const [loading, setLoading] = useState(false);

  const clientForm = useForm<z.infer<typeof clientSchema>>({
    resolver: zodResolver(clientSchema),
    defaultValues: { name: "", industry: "" },
  });

  const projectForm = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: { name: "" },
  });

  const briefForm = useForm<z.infer<typeof briefSchema>>({
    resolver: zodResolver(briefSchema),
    defaultValues: { raw_text: "" },
  });

  const steps = useMemo(
    () => ["Client", "Project", "Brief", "Idea", "Generate"],
    []
  );

  const goNext = () => setStep((prev) => Math.min(prev + 1, steps.length - 1));
  const goBack = () => setStep((prev) => Math.max(prev - 1, 0));

  const handleClientSubmit = async (values: z.infer<typeof clientSchema>) => {
    try {
      setLoading(true);
      const client = await createClientAction({
        name: values.name,
        industry: values.industry ?? null,
      });
      setClientId(client.id);
      toast.success("Client created");
      goNext();
    } catch {
      toast.error("Failed to create client");
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSubmit = async (values: z.infer<typeof projectSchema>) => {
    if (!clientId) return;
    try {
      setLoading(true);
      const project = await createProjectAction({
        name: values.name,
        client_id: clientId,
        status: "ideation",
      });
      setProjectId(project.id);
      toast.success("Project created");
      goNext();
    } catch {
      toast.error("Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  const handleBriefSubmit = async (values: z.infer<typeof briefSchema>) => {
    if (!projectId) return;
    try {
      setLoading(true);
      await createBriefAction({
        project_id: projectId,
        raw_text: values.raw_text,
      });
      toast.success("Brief saved");
      goNext();
    } catch {
      toast.error("Failed to save brief");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!projectId) return;
    if (!aiEnabled) {
      toast.error("AI disabled: add OPENAI_API_KEY to .env.local and restart.");
      router.push(`/app/projects/${projectId}`);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          mode: "one_pager",
          seedText: ideaSeed,
          includeBrandVoice: true,
          includeReferences: true,
        }),
      });

      const data = await response.json();
      if (response.status === 400 && data?.error === "Missing OPENAI_API_KEY") {
        toast.error("AI disabled: add OPENAI_API_KEY to .env.local and restart.");
        router.push(`/app/projects/${projectId}`);
        return;
      }
      if (response.status === 429) {
        toast.error(data?.error || "Daily AI limit reached. Try again tomorrow.");
        router.push(`/app/projects/${projectId}`);
        return;
      }
      if (!response.ok) {
        toast.error(data?.error || "Failed to generate output");
        return;
      }

      toast.success("One pager generated");
      router.push(`/app/projects/${projectId}`);
    } catch {
      toast.error("Failed to generate output");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <CardTitle>Quick start</CardTitle>
          <p className="text-sm text-muted-foreground">
            Step {step + 1} of {steps.length}: {steps[step]}
          </p>
        </div>
        <Button variant="ghost" onClick={() => router.push("/app")}>Skip onboarding</Button>
      </CardHeader>
      <CardContent>
        {step === 0 ? (
          <form className="space-y-4" onSubmit={clientForm.handleSubmit(handleClientSubmit)}>
            <div className="space-y-2">
              <Label>Client name</Label>
              <Input placeholder="e.g. Northwind Coffee" {...clientForm.register("name")} />
            </div>
            <div className="space-y-2">
              <Label>Industry</Label>
              <Input placeholder="e.g. Food & Beverage" {...clientForm.register("industry")} />
            </div>
            <Button type="submit" disabled={loading}>Continue</Button>
          </form>
        ) : null}

        {step === 1 ? (
          <form className="space-y-4" onSubmit={projectForm.handleSubmit(handleProjectSubmit)}>
            <div className="space-y-2">
              <Label>Project name</Label>
              <Input placeholder="e.g. Spring Launch" {...projectForm.register("name")} />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={goBack}>Back</Button>
              <Button type="submit" disabled={loading}>Continue</Button>
            </div>
          </form>
        ) : null}

        {step === 2 ? (
          <form className="space-y-4" onSubmit={briefForm.handleSubmit(handleBriefSubmit)}>
            <div className="space-y-2">
              <Label>Paste your brief</Label>
              <Textarea rows={6} {...briefForm.register("raw_text")} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="ghost" onClick={() => briefForm.setValue("raw_text", sampleBrief)}>
                Use sample brief
              </Button>
              <Button type="submit" disabled={loading}>Continue</Button>
            </div>
            <Button type="button" variant="ghost" onClick={goBack}>Back</Button>
          </form>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Idea seed (optional)</Label>
              <Textarea
                rows={4}
                value={ideaSeed}
                onChange={(event) => setIdeaSeed(event.target.value)}
                placeholder="Drop a starting angle, hook, or insight..."
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="ghost" onClick={() => setIdeaSeed(sampleIdea)}>
                Use sample idea
              </Button>
              <Button type="button" onClick={goNext}>Continue</Button>
              <Button type="button" variant="ghost" onClick={goBack}>Back</Button>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm">
              {aiEnabled ? (
                <p>Generate a one-pager to kick off your project workspace.</p>
              ) : (
                <p>AI is disabled. Add OPENAI_API_KEY to .env.local and restart to enable generation.</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleGenerate} disabled={loading}>
                {aiEnabled ? "Generate one pager" : "Finish setup"}
              </Button>
              <Button type="button" variant="ghost" onClick={goBack}>Back</Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
