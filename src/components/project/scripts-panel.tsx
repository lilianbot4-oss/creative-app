"use client";

import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import InfoTooltip from "@/components/ui/info-tooltip";
import { SCRIPT_FORMATS, SCRIPT_FORMAT_LABELS } from "@/lib/constants";
import type { Concept, ConceptVariant, Feedback, Script } from "@/lib/types";
import ScriptEditor from "@/components/project/script-editor";
import { createScriptAction, setPrimaryScriptAction } from "@/app/(protected)/app/actions";

const REWRITE_GOALS = [
  "clearer",
  "bolder",
  "cheaper to execute",
  "more premium",
  "more Gen Z",
  "safer for brand",
];

const ORIGIN_LABELS: Record<string, string> = {
  human: "Human",
  ai_assisted: "AI Assisted",
  ai_generated: "AI Generated",
};

export default function ScriptsPanel({
  projectId,
  concepts,
  variantsByConcept,
  scripts,
  feedback,
  aiEnabled,
}: {
  projectId: string;
  concepts: Concept[];
  variantsByConcept: Record<string, ConceptVariant[]>;
  scripts: Script[];
  feedback: Feedback[];
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialConceptId = searchParams.get("conceptId") ?? "none";
  const [conceptId, setConceptId] = useState(initialConceptId || "none");
  const [variantId, setVariantId] = useState("none");
  const [format, setFormat] = useState<(typeof SCRIPT_FORMATS)[number]>(
    "launch_30"
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualText, setManualText] = useState("");
  const [manualFormat, setManualFormat] = useState<(typeof SCRIPT_FORMATS)[number]>("launch_30");
  const [selectedScriptId, setSelectedScriptId] = useState("");
  const [rewriteGoal, setRewriteGoal] = useState(REWRITE_GOALS[0]);
  const [selectedFeedback, setSelectedFeedback] = useState<string[]>([]);

  const grouped = useMemo(() => {
    const map = new Map<(typeof SCRIPT_FORMATS)[number], Script[]>();
    scripts.forEach((script) => {
      const list = map.get(script.format) ?? [];
      list.push(script);
      map.set(script.format, list);
    });
    for (const [key, list] of map.entries()) {
      list.sort((a, b) => b.version - a.version);
      map.set(key, list);
    }
    return map;
  }, [scripts]);

  useEffect(() => {
    if (!selectedScriptId && scripts.length > 0) {
      const latest = scripts.slice().sort((a, b) => b.version - a.version)[0];
      setSelectedScriptId(latest?.id ?? "");
    }
  }, [scripts, selectedScriptId]);

  const variants = conceptId !== "none" ? variantsByConcept[conceptId] ?? [] : [];

  const handleGenerate = async () => {
    if (!aiEnabled) {
      toast.error("AI disabled: add OPENAI_API_KEY to .env.local and restart.");
      return;
    }
    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          conceptId: conceptId === "none" ? null : conceptId,
          variantId: variantId === "none" ? null : variantId,
          format,
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
        toast.error(data?.error || "Failed to generate script");
        return;
      }
      toast.success("Script generated");
      router.refresh();
    } catch {
      toast.error("Failed to generate script");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleManualCreate = async () => {
    if (!manualText.trim()) {
      toast.error("Script content is required");
      return;
    }
    setManualSaving(true);
    try {
      await createScriptAction({
        projectId,
        format: manualFormat,
        scriptMd: manualText.trim(),
        conceptId: conceptId === "none" ? null : conceptId,
        variantId: variantId === "none" ? null : variantId,
      });
      toast.success("Script saved");
      setManualText("");
      setManualOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to save script");
    } finally {
      setManualSaving(false);
    }
  };

  const handleRewrite = async () => {
    if (!aiEnabled) {
      toast.error("AI disabled: add OPENAI_API_KEY to .env.local and restart.");
      return;
    }
    if (!selectedScriptId) {
      toast.error("Select a script to rewrite");
      return;
    }
    setIsRewriting(true);
    try {
      const response = await fetch("/api/ai/rewrite-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          scriptId: selectedScriptId,
          rewriteGoal,
          feedbackText: selectedFeedback.join("\n"),
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
        toast.error(data?.error || "Failed to rewrite script");
        return;
      }
      toast.success("Script rewritten");
      router.refresh();
    } catch {
      toast.error("Failed to rewrite script");
    } finally {
      setIsRewriting(false);
    }
  };

  const handleSetPrimary = async (script: Script) => {
    try {
      await setPrimaryScriptAction({
        projectId,
        scriptId: script.id,
        format: script.format,
      });
      toast.success("Primary script updated");
      router.refresh();
    } catch {
      toast.error("Failed to update primary script");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/60 bg-muted/40 p-4 text-sm">
        <p className="font-medium">Recommended next step</p>
        <p className="text-muted-foreground">Generate a storyboard once a script feels solid.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CardTitle>Script generator</CardTitle>
              <InfoTooltip label="Generate cinematic or social-first scripts. Scripts inherit provenance from the concept they were generated from to maintain logical flow." />
            </div>
            {!aiEnabled ? <Badge variant="destructive">AI Disabled</Badge> : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Concept</Label>
              <Select value={conceptId} onValueChange={setConceptId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select concept" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {concepts.map((concept) => (
                    <SelectItem key={concept.id} value={concept.id}>
                      {concept.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Variant</Label>
              <Select value={variantId} onValueChange={setVariantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select variant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {variants.map((variant) => (
                    <SelectItem key={variant.id} value={variant.id}>
                      {variant.angle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Format</Label>
              <Select value={format} onValueChange={(value) => setFormat(value as typeof format)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  {SCRIPT_FORMATS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {SCRIPT_FORMAT_LABELS[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleGenerate} disabled={!aiEnabled || isGenerating}>
              {isGenerating ? "Generating..." : "Generate script"}
            </Button>
            <Dialog open={manualOpen} onOpenChange={setManualOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary">New script (human)</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New script (human)</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Format</Label>
                    <Select value={manualFormat} onValueChange={(value) => setManualFormat(value as typeof manualFormat)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        {SCRIPT_FORMATS.map((item) => (
                          <SelectItem key={item} value={item}>
                            {SCRIPT_FORMAT_LABELS[item]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Script content</Label>
                    <Textarea
                      rows={8}
                      value={manualText}
                      onChange={(event) => setManualText(event.target.value)}
                      placeholder="Write the script in markdown..."
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setManualOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleManualCreate} disabled={manualSaving}>
                      {manualSaving ? "Saving..." : "Save script"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rewrite with feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Script</Label>
              <Select value={selectedScriptId} onValueChange={setSelectedScriptId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select script" />
                </SelectTrigger>
                <SelectContent>
                  {scripts.map((script) => (
                    <SelectItem key={script.id} value={script.id}>
                      {SCRIPT_FORMAT_LABELS[script.format]} v{script.version}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label>Rewrite goal</Label>
                <InfoTooltip label="Choose how the AI should adjust the script: clearer simplifies language, bolder adds impact, cheaper reduces production costs, etc." />
              </div>
              <Select value={rewriteGoal} onValueChange={setRewriteGoal}>
                <SelectTrigger>
                  <SelectValue placeholder="Select goal" />
                </SelectTrigger>
                <SelectContent>
                  {REWRITE_GOALS.map((goal) => (
                    <SelectItem key={goal} value={goal}>
                      {goal}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Feedback notes</Label>
            {feedback.length === 0 ? (
              <p className="text-sm text-muted-foreground">No feedback yet.</p>
            ) : (
              <div className="space-y-2">
                {feedback.map((item) => (
                  <label key={item.id} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedFeedback.includes(item.text)}
                      onChange={(event) => {
                        setSelectedFeedback((prev) =>
                          event.target.checked
                            ? [...prev, item.text]
                            : prev.filter((text) => text !== item.text)
                        );
                      }}
                    />
                    <span>{item.text}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <Button onClick={handleRewrite} disabled={!aiEnabled || isRewriting}>
            {isRewriting ? "Rewriting..." : "Rewrite script"}
          </Button>
        </CardContent>
      </Card>

      {scripts.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-background/70 p-6 text-sm text-muted-foreground">
          No scripts yet. Generate one from the script studio above.
        </div>
      ) : (
        <div className="space-y-6">
          {SCRIPT_FORMATS.map((fmt) => {
            const list = grouped.get(fmt) ?? [];
            if (list.length === 0) return null;
            const latest = list[0];
            const previous = list.slice(1);
            const primaryScript = list.find((item) => item.is_primary) ?? null;
            return (
              <div key={fmt} className="space-y-3 rounded-3xl border border-border/60 bg-card/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold">{SCRIPT_FORMAT_LABELS[fmt]}</h3>
                    <p className="text-xs text-muted-foreground">Latest version expanded</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {primaryScript?.id === latest.id ? (
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary">Primary</Badge>
                        <InfoTooltip label="Main scripts are used in exports and presentations." />
                      </div>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => handleSetPrimary(latest)}>
                        Set primary
                      </Button>
                    )}
                    <Badge variant="outline">v{latest.version}</Badge>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary">
                      {ORIGIN_LABELS[latest.origin_type ?? "human"]}
                    </Badge>
                    <InfoTooltip label="Origin: how this script was created." />
                  </div>
                  {latest.seed_text ? <span>Seed: {latest.seed_text}</span> : null}
                </div>

                <ScriptEditor script={latest} />

                {previous.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Previous versions
                    </p>
                    <div className="grid gap-2 md:grid-cols-2">
                      {previous.map((item) => (
                        <Card key={item.id} className="border-border/60">
                          <CardHeader className="py-3">
                            <CardTitle className="text-sm">
                              v{item.version} · {new Date(item.created_at).toLocaleDateString()}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="py-3">
                            <div className="flex flex-wrap items-center gap-2 pb-2 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Badge variant="secondary">
                                  {ORIGIN_LABELS[item.origin_type ?? "human"]}
                                </Badge>
                                <InfoTooltip label="Origin: how this script was created." />
                              </div>
                              {item.seed_text ? <span>Seed: {item.seed_text}</span> : null}
                            </div>
                            <ScriptEditor script={item} />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
