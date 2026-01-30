"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OUTPUT_TEMPLATES } from "@/lib/ai/templates";

const PACK_STEPS = [
  "one_pager",
  "expand",
  "ugc_scripts",
  "pitch_outline",
  "virality",
] as const;

type StepStatus = "idle" | "running" | "done" | "error";

export default function CampaignGenerator({
  projectId,
  aiEnabled,
  seedText,
}: {
  projectId: string;
  aiEnabled: boolean;
  seedText?: string;
}) {
  const [status, setStatus] = useState<Record<string, StepStatus>>(() =>
    Object.fromEntries(PACK_STEPS.map((step) => [step, "idle"]))
  );
  const [running, setRunning] = useState(false);

  const runPack = async () => {
    if (!aiEnabled) {
      toast.error("AI disabled: add OPENAI_API_KEY to .env.local and restart.");
      return;
    }
    setRunning(true);
    const nextStatus: Record<string, StepStatus> = { ...status };
    PACK_STEPS.forEach((step) => {
      nextStatus[step] = "running";
    });
    setStatus({ ...nextStatus });

    try {
      const response = await fetch("/api/ai/generate-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, seedText: seedText ?? "" }),
      });

      const data = await response.json();
      if (response.status === 400 && data?.error === "Missing OPENAI_API_KEY") {
        toast.error("AI disabled: add OPENAI_API_KEY to .env.local and restart.");
      } else if (response.status === 429) {
        toast.error(data?.error || "Daily AI limit reached. Try again tomorrow.");
      } else if (!response.ok) {
        toast.error(data?.error || "Failed to generate campaign pack");
      } else {
        toast.success("Content pack generated");
      }

      const completed: string[] = data?.completed ?? [];
      PACK_STEPS.forEach((step) => {
        if (completed.includes(step)) {
          nextStatus[step] = "done";
        } else if (data?.failedMode === step) {
          nextStatus[step] = "error";
        } else {
          nextStatus[step] = nextStatus[step] === "done" ? "done" : "idle";
        }
      });
      setStatus({ ...nextStatus });
    } catch {
      toast.error("Failed to generate content pack");
      PACK_STEPS.forEach((step) => {
        nextStatus[step] = "error";
      });
      setStatus({ ...nextStatus });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Content generator</p>
          <p className="text-xs text-muted-foreground">
            Generate a full pack: summary, full breakdown, creator scripts, presentation outline, virality.
          </p>
        </div>
        <Button onClick={runPack} disabled={running}>
          {running ? "Generating..." : "Generate Full Content Pack"}
        </Button>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {PACK_STEPS.map((step) => (
          <div
            key={step}
            className="flex items-center justify-between rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-sm"
          >
            <span>{OUTPUT_TEMPLATES[step].label}</span>
            <Badge variant={status[step] === "done" ? "secondary" : "outline"}>
              {status[step]}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
