"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OUTPUT_TEMPLATE_LIST } from "@/lib/ai/templates";
import type { Feedback } from "@/lib/types";

const REWRITE_GOALS = [
  "clearer",
  "bolder",
  "cheaper to execute",
  "more premium",
  "more Gen Z",
  "safer for brand",
] as const;

export default function FeedbackRewritePanel({
  projectId,
  feedback,
}: {
  projectId: string;
  feedback: Feedback[];
}) {
  const [selectedFeedback, setSelectedFeedback] = useState<string[]>([]);
  const [mode, setMode] = useState<string>("one_pager");
  const [goal, setGoal] = useState<string>(REWRITE_GOALS[0]);
  const [loading, setLoading] = useState(false);

  const toggleFeedback = (id: string) => {
    setSelectedFeedback((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleRewrite = async () => {
    if (selectedFeedback.length === 0) {
      toast.error("Select at least one feedback note");
      return;
    }

    const feedbackText = feedback
      .filter((item) => selectedFeedback.includes(item.id))
      .map((item) => `- ${item.text}`)
      .join("\n");

    try {
      setLoading(true);
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          mode,
          seedText: "",
          includeBrandVoice: true,
          includeReferences: true,
          regenFromFeedback: true,
          feedbackText,
          rewriteGoal: goal,
        }),
      });

      const data = await response.json();
      if (response.status === 400 && data?.error === "Missing OPENAI_API_KEY") {
        toast.error("AI disabled: add OPENAI_API_KEY to .env.local and restart.");
        return;
      }
      if (response.status === 429) {
        toast.error(data?.error || "Daily AI limit reached. Try again tomorrow.");
        return;
      }
      if (!response.ok) {
        toast.error(data?.error || "Rewrite failed");
        return;
      }

      toast.success("Rewrite generated");
      setSelectedFeedback([]);
    } catch {
      toast.error("Rewrite failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feedback-driven rewrite</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Output type</Label>
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger>
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              {OUTPUT_TEMPLATE_LIST.map((template) => (
                <SelectItem key={template.mode} value={template.mode}>
                  {template.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Rewrite goal</Label>
          <Select value={goal} onValueChange={setGoal}>
            <SelectTrigger>
              <SelectValue placeholder="Select goal" />
            </SelectTrigger>
            <SelectContent>
              {REWRITE_GOALS.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Feedback notes</Label>
          {feedback.length === 0 ? (
            <p className="text-sm text-muted-foreground">No feedback yet.</p>
          ) : (
            <div className="space-y-2">
              {feedback.map((item) => (
                <label
                  key={item.id}
                  className="flex items-start gap-2 rounded-xl border border-border/60 bg-background/70 p-3 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedFeedback.includes(item.id)}
                    onChange={() => toggleFeedback(item.id)}
                  />
                  <span>{item.text}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <Button onClick={handleRewrite} disabled={loading}>
          {loading ? "Rewriting..." : "Generate rewrite"}
        </Button>
      </CardContent>
    </Card>
  );
}
