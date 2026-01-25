"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Concept, ConceptAsset } from "@/lib/types";
import { getPublicStorageUrl } from "@/lib/storage";

const SIZE_OPTIONS = ["1024x1024", "1536x1024", "1024x1536"] as const;

export default function KeyVisualGenerator({
  projectId,
  concept,
  assets,
  aiEnabled,
  imageModel,
  onRefresh,
}: {
  projectId: string;
  concept: Concept;
  assets: ConceptAsset[];
  aiEnabled: boolean;
  imageModel: string | null;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [seedText, setSeedText] = useState("");
  const [guidance, setGuidance] = useState("");
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>("1024x1024");
  const [style, setStyle] = useState<"key_visual" | "moodboard">("key_visual");
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingAssets, setPendingAssets] = useState<ConceptAsset[]>([]);

  const defaultPrompt = useMemo(() => {
    const parts = [
      concept.title,
      concept.one_liner,
      concept.cast_archetypes?.join(", "),
      concept.doordash_integration,
    ].filter(Boolean);
    return parts.join(" · ");
  }, [concept]);

  const primaryAsset = assets.find((asset) => asset.is_primary && asset.asset_type === "key_visual");
  const gallery = assets.filter((asset) => asset.asset_type === "key_visual");

  const handleGenerate = async () => {
    if (!aiEnabled) {
      toast.error("AI disabled: add OPENAI_API_KEY to .env.local and restart.");
      return;
    }
    if (!imageModel) {
      toast.error("Image model not configured.");
      return;
    }
    setIsGenerating(true);
    setPendingAssets([]);
    try {
      const response = await fetch("/api/ai/generate-key-visual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          conceptId: concept.id,
          seedText: seedText.trim() || defaultPrompt,
          guidance: guidance.trim() || null,
          style,
          size,
          n: 4,
        }),
      });
      const data = await response.json();
      if (response.status === 400 && data?.error === "Missing OPENAI_API_KEY") {
        toast.error("AI disabled: add OPENAI_API_KEY to .env.local and restart.");
        return;
      }
      if (response.status === 400 && data?.error === "Image model not configured") {
        toast.error("Image model not configured. Select one in AI Models.");
        return;
      }
      if (response.status === 429) {
        toast.error(data?.error || "Daily AI limit reached. Try again tomorrow.");
        return;
      }
      if (!response.ok) {
        toast.error(data?.error || "Failed to generate visuals");
        return;
      }
      const created = (data.assets ?? []) as ConceptAsset[];
      setPendingAssets(created);
      toast.success("Key visuals generated");
      onRefresh();
    } catch {
      toast.error("Failed to generate visuals");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSetPrimary = async (assetId: string) => {
    try {
      const response = await fetch("/api/assets/set-primary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data?.error || "Failed to set primary");
        return;
      }
      toast.success("Primary key visual updated");
      onRefresh();
    } catch {
      toast.error("Failed to set primary");
    }
  };

  const renderThumb = (asset: ConceptAsset, showActions = true) => {
    const url = getPublicStorageUrl(asset.storage_bucket, asset.storage_path);
    return (
      <div key={asset.id} className="space-y-2 rounded-xl border border-border/60 p-2">
        <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Key visual" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-2 text-xs">
          <Badge variant="secondary">AI Generated</Badge>
          {asset.is_primary ? <Badge>Primary</Badge> : null}
        </div>
        {showActions ? (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => handleSetPrimary(asset.id)}>
              Set primary
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                void navigator.clipboard.writeText(asset.prompt_text ?? "");
                toast.success("Prompt copied");
              }}
            >
              Copy prompt
            </Button>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          Visualize
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Key visuals</DialogTitle>
        </DialogHeader>
        {!imageModel ? (
          <Card className="border-dashed">
            <CardContent className="space-y-2 py-6 text-sm text-muted-foreground">
              Image model not configured. Choose one in AI Models to generate visuals.
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Prompt seed</Label>
              <Input
                value={seedText}
                onChange={(event) => setSeedText(event.target.value)}
                placeholder={defaultPrompt}
              />
            </div>
            <div className="space-y-2">
              <Label>Guidance</Label>
              <Textarea
                rows={4}
                value={guidance}
                onChange={(event) => setGuidance(event.target.value)}
                placeholder="Optional constraints or style notes"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Style</Label>
                <Select value={style} onValueChange={(value) => setStyle(value as typeof style)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="key_visual">Key visual</SelectItem>
                    <SelectItem value="moodboard">Moodboard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Size</Label>
                <Select value={size} onValueChange={(value) => setSize(value as typeof size)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    {SIZE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleGenerate} disabled={!aiEnabled || !imageModel || isGenerating}>
              {isGenerating ? "Generating..." : "Generate 4"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Images are stored in Supabase Storage (assets bucket). Keep under 25MB per file.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Primary visual</span>
              {primaryAsset ? <Badge variant="secondary">Primary</Badge> : null}
            </div>
            {primaryAsset ? renderThumb(primaryAsset, false) : (
              <div className="rounded-xl border border-dashed p-4 text-xs text-muted-foreground">
                No primary visual yet.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Gallery</p>
          {isGenerating ? (
            <div className="grid gap-3 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-40 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {[...pendingAssets, ...gallery].map((asset) => renderThumb(asset))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
