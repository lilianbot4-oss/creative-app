"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { Script, Storyboard } from "@/lib/types";
import { SCRIPT_FORMAT_LABELS } from "@/lib/constants";

export default function StoryboardPanel({
  projectId,
  scripts,
  storyboardsByScript,
  aiEnabled,
  imageModel,
}: {
  projectId: string;
  scripts: Script[];
  storyboardsByScript: Record<string, Storyboard | null>;
  aiEnabled: boolean;
  imageModel: string | null;
}) {
  const router = useRouter();
  const defaultScriptId = useMemo(() => {
    const primary = scripts.find((script) => script.is_primary);
    return primary?.id ?? scripts[0]?.id ?? "";
  }, [scripts]);

  const [selectedScriptId, setSelectedScriptId] = useState(defaultScriptId);
  const [withImages, setWithImages] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const sortedScripts = useMemo(
    () => scripts.slice().sort((a, b) => (a.created_at > b.created_at ? -1 : 1)),
    [scripts]
  );

  useEffect(() => {
    setSelectedScriptId(defaultScriptId);
  }, [defaultScriptId]);

  const selectedStoryboard = selectedScriptId
    ? storyboardsByScript[selectedScriptId]
    : null;

  const handleGenerate = async () => {
    if (!aiEnabled) {
      toast.error("AI disabled: add OPENAI_API_KEY to .env.local and restart.");
      return;
    }
    if (!selectedScriptId) {
      toast.error("Select a script first");
      return;
    }
    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai/generate-storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, scriptId: selectedScriptId }),
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
        toast.error(data?.error || "Failed to generate storyboard");
        return;
      }
      toast.success("Storyboard generated");
      router.refresh();
    } catch {
      toast.error("Failed to generate storyboard");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-muted/40 p-4 text-sm">
        <p className="font-medium">Recommended next step</p>
        <p className="text-muted-foreground">Export a client-ready pitch pack once the storyboard is ready.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Storyboard builder</CardTitle>
            {!aiEnabled ? <Badge variant="destructive">AI Disabled</Badge> : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={selectedScriptId} onValueChange={setSelectedScriptId}>
            <SelectTrigger>
              <SelectValue placeholder="Select script" />
            </SelectTrigger>
            <SelectContent>
              {sortedScripts.map((script) => (
                <SelectItem key={script.id} value={script.id}>
                  {SCRIPT_FORMAT_LABELS[script.format]} v{script.version}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={withImages}
              onChange={(event) => setWithImages(event.target.checked)}
              disabled={!imageModel}
            />
            Include AI-generated frame visuals (optional)
          </label>
          {!imageModel ? (
            <p className="text-xs text-muted-foreground">
              Image model not configured. Set one in AI Models.
            </p>
          ) : null}
          <Button onClick={handleGenerate} disabled={!aiEnabled || isGenerating}>
            {isGenerating ? "Generating..." : "Generate storyboard"}
          </Button>
          {/* TODO: If withImages is true, trigger image generation per frame after storyboard is created. */}
        </CardContent>
      </Card>

      {selectedStoryboard ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Frames</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {selectedStoryboard.frames.map((frame) => {
                const propsList = Array.isArray(frame.props)
                  ? frame.props
                  : frame.props
                    ? [String(frame.props)]
                    : [];

                return (
                  <div
                    key={frame.frame}
                    className="rounded-xl border border-border/60 bg-background/70 p-3 text-sm"
                  >
                    <p className="font-medium">Frame {frame.frame}</p>
                    <p className="text-xs text-muted-foreground">{frame.shot}</p>
                    <p>{frame.setting}</p>
                    <p className="text-muted-foreground">{frame.action}</p>
                    {frame.os_text ? <p className="text-xs">OS: {frame.os_text}</p> : null}
                    {frame.audio ? <p className="text-xs">Audio: {frame.audio}</p> : null}
                    {propsList.length ? (
                      <p className="text-xs">Props: {propsList.join(", ")}</p>
                    ) : null}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Shotlist</CardTitle>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  void navigator.clipboard.writeText(
                    JSON.stringify(selectedStoryboard.shotlist ?? {}, null, 2)
                  );
                  toast.success("Shotlist copied");
                }}
              >
                Copy shotlist
              </Button>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap rounded-2xl bg-muted/50 p-4 text-xs">
                {JSON.stringify(selectedStoryboard.shotlist ?? {}, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/60 bg-background/70 p-6 text-sm text-muted-foreground">
          Select a script to view or generate a storyboard.
        </div>
      )}
    </div>
  );
}
