"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/browser";
import type { Script, Storyboard, ConceptAsset } from "@/lib/types";
import { SCRIPT_FORMAT_LABELS } from "@/lib/constants";

export default function StoryboardPanel({
  projectId,
  scripts,
  storyboardsByScript,
  assetsByScript,
  aiEnabled,
  imageModel,
}: {
  projectId: string;
  scripts: Script[];
  storyboardsByScript: Record<string, Storyboard | null>;
  assetsByScript: Record<string, ConceptAsset[]>;
  aiEnabled: boolean;
  imageModel: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [frameGeneratingIndex, setFrameGeneratingIndex] = useState<number | null>(null);
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

  const currentAssets = selectedScriptId ? assetsByScript[selectedScriptId] ?? [] : [];

  const handleGenerateFrame = async (frameIndex: number, prompt: string) => {
    if (!aiEnabled || !selectedScriptId) return;
    
    setFrameGeneratingIndex(frameIndex);
    try {
      const response = await fetch("/api/ai/generate-storyboard-frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          projectId, 
          scriptId: selectedScriptId, 
          frameIndex, 
          prompt 
        }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Generation failed");
      }
      
      toast.success(`Frame ${frameIndex} generated`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate frame");
    } finally {
      setFrameGeneratingIndex(null);
    }
  };

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
        body: JSON.stringify({ 
          projectId, 
          scriptId: selectedScriptId,
          includeImages: withImages 
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
        toast.error(data?.error || "Failed to generate storyboard");
        return;
      }
      toast.success("Storyboard generated");
      router.refresh();

      if (withImages && data.storyboard?.frames) {
        toast.info("Generating frame visuals...");
        // Sequential generation to avoid rate limits
        for (const frame of data.storyboard.frames) {
           // eslint-disable-next-line @typescript-eslint/no-explicit-any
           const frameData = frame as any;
           await handleGenerateFrame(frameData.frame, frameData.visual_prompt || `${frameData.setting}, ${frameData.action}`);
        }
        toast.success("All visuals generated");
      }
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
        </CardContent>
      </Card>

      {selectedStoryboard ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Frames</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {selectedStoryboard.frames.map((frame, index) => {
                const propsList = Array.isArray(frame.props)
                  ? frame.props
                  : frame.props
                    ? [String(frame.props)]
                    : [];

                const asset = currentAssets.find(
                  (a) => (a.meta as any)?.frame_index === frame.frame || (a.meta as any)?.frame_index === index + 1
                );
                // Fallback: look for match by index in currentAssets array if meta is missing (legacy)
                
                const isGeneratingThis = frameGeneratingIndex === frame.frame;

                return (
                  <div
                    key={frame.frame}
                    className="overflow-hidden rounded-xl border border-border/60 bg-background/70"
                  >
                    <div className="relative aspect-video w-full bg-muted">
                      {asset ? (
                        <div className="group relative h-full w-full">
                          <Image
                            src={
                              asset.storage_path.startsWith("http")
                                ? asset.storage_path
                                : supabase.storage
                                    .from(asset.storage_bucket)
                                    .getPublicUrl(asset.storage_path).data.publicUrl
                            }
                            alt={frame.action}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                             <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleGenerateFrame(frame.frame, (frame as any).visual_prompt || `${frame.setting}, ${frame.action}`)}
                                disabled={isGeneratingThis || !imageModel}
                              >
                                {isGeneratingThis ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-2 h-3 w-3" />}
                                Regenerate
                              </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center p-4 text-center text-muted-foreground">
                          <p className="mb-2 text-xs">No visual yet</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerateFrame(frame.frame, (frame as any).visual_prompt || `${frame.setting}, ${frame.action}`)}
                            disabled={isGeneratingThis || !imageModel || !aiEnabled}
                          >
                            {isGeneratingThis ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <ImagePlus className="mr-2 h-3 w-3" />}
                            Generate Visual
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="p-3 text-sm">
                      <div className="mb-1 flex items-center justify-between">
                        <p className="font-medium">Frame {frame.frame}</p>
                        <Badge variant="outline" className="text-[10px]">{frame.shot}</Badge>
                      </div>
                      <p className="mb-1 text-xs font-medium text-muted-foreground">{frame.setting}</p>
                      <p className="text-sm">{frame.action}</p>
                      {frame.os_text ? <p className="mt-2 text-xs font-medium text-blue-500">OS: {frame.os_text}</p> : null}
                      {frame.audio ? <p className="mt-1 text-xs text-muted-foreground">Audio: {frame.audio}</p> : null}
                      {propsList.length ? (
                        <p className="mt-1 text-xs text-muted-foreground">Props: {propsList.join(", ")}</p>
                      ) : null}
                    </div>
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
