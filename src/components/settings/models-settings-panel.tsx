"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { updateAISettingsAction } from "@/app/(protected)/app/settings/models/actions";
import {
  DEFAULT_REASONING_MODE,
  DEFAULT_TEXT_MODEL,
  IMAGE_MODEL_PRESETS,
  TEXT_MODEL_PRESETS,
  getImageModelInfo,
  getTextModelInfo,
  resolveTextModel,
} from "@/lib/ai/models";
import type { AISettings } from "@/lib/ai/settings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const REASONING_OPTIONS = [
  { id: "fast", label: "Fast" },
  { id: "balanced", label: "Balanced" },
  { id: "premium", label: "Premium" },
] as const;

export default function ModelsSettingsPanel({
  settings,
  aiEnabled,
}: {
  settings: AISettings;
  aiEnabled: boolean;
}) {
  const [textModel, setTextModel] = useState(settings.text_model || DEFAULT_TEXT_MODEL);
  const [imageModel, setImageModel] = useState(settings.image_model ?? "");
  const [reasoningMode, setReasoningMode] = useState(
    settings.reasoning_mode ?? DEFAULT_REASONING_MODE
  );
  const [isPending, startTransition] = useTransition();

  const activeTextInfo = useMemo(() => getTextModelInfo(textModel), [textModel]);
  const activeImageInfo = useMemo(() => getImageModelInfo(imageModel), [imageModel]);

  const saveSettings = (next: {
    text_model?: string | null;
    image_model?: string | null;
    reasoning_mode?: string | null;
  }) => {
    startTransition(async () => {
      const result = await updateAISettingsAction(next);
      if (!result.success) {
        toast.error(result.error || "Failed to update settings");
        return;
      }
      if ("reverted" in result && result.reverted) {
        toast.warning("Unknown model, reverted to default.");
      } else {
        toast.success("AI settings updated");
      }
    });
  };

  const handleReasoningChange = (mode: "fast" | "balanced" | "premium") => {
    const recommended = resolveTextModel({ reasoningMode: mode, selectedId: null });
    setReasoningMode(mode);
    setTextModel(recommended);
    saveSettings({ reasoning_mode: mode, text_model: recommended });
  };

  return (
    <div className="space-y-6">
      {!aiEnabled ? (
        <Card className="border-destructive/40 bg-destructive/10">
          <CardContent className="py-4 text-sm text-destructive">
            AI Disabled: Add OPENAI_API_KEY to .env.local and restart.
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Reasoning / quality</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {REASONING_OPTIONS.map((option) => (
            <Button
              key={option.id}
              type="button"
              variant={reasoningMode === option.id ? "default" : "outline"}
              onClick={() => handleReasoningChange(option.id)}
              disabled={isPending}
            >
              {option.label}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Text models</CardTitle>
            <Badge variant="secondary">
              Selected: {activeTextInfo?.label ?? textModel}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {TEXT_MODEL_PRESETS.map((model) => {
            const selected = model.id === textModel;
            return (
              <div key={model.id} className="rounded-2xl border border-border/60 bg-background/70 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold">{model.label}</p>
                    <p className="text-sm text-muted-foreground">{model.description}</p>
                  </div>
                  {selected ? <Badge variant="secondary">Selected</Badge> : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline">Speed: {model.speed}</Badge>
                  <Badge variant="outline">Cost: {model.cost}</Badge>
                  {model.capabilities.json ? <Badge variant="outline">JSON</Badge> : null}
                  {model.capabilities.tools ? <Badge variant="outline">Tools</Badge> : null}
                  {model.capabilities.vision ? <Badge variant="outline">Vision</Badge> : null}
                </div>
                <ul className="mt-3 list-disc pl-5 text-xs text-muted-foreground">
                  {model.recommendedFor.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <Button
                  className="mt-4"
                  variant={selected ? "secondary" : "default"}
                  onClick={() => {
                    setTextModel(model.id);
                    saveSettings({ text_model: model.id });
                  }}
                  disabled={isPending}
                >
                  {selected ? "Selected" : "Select"}
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Image models</CardTitle>
            <Badge variant={activeImageInfo ? "secondary" : "outline"}>
              {activeImageInfo ? `Selected: ${activeImageInfo.label}` : "Not configured"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {IMAGE_MODEL_PRESETS.map((model) => {
            const selected = model.id === imageModel;
            return (
              <div key={model.id} className="rounded-2xl border border-border/60 bg-background/70 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold">{model.label}</p>
                    <p className="text-sm text-muted-foreground">{model.description}</p>
                  </div>
                  {selected ? <Badge variant="secondary">Selected</Badge> : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline">Speed: {model.speed}</Badge>
                  <Badge variant="outline">Cost: {model.cost}</Badge>
                  <Badge variant="outline">Images</Badge>
                </div>
                <ul className="mt-3 list-disc pl-5 text-xs text-muted-foreground">
                  {model.recommendedFor.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <Button
                  className="mt-4"
                  variant={selected ? "secondary" : "default"}
                  onClick={() => {
                    setImageModel(model.id);
                    saveSettings({ image_model: model.id });
                  }}
                  disabled={isPending}
                >
                  {selected ? "Selected" : "Select"}
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <details className="rounded-2xl border border-border/60 bg-background/60 p-4 text-sm">
        <summary className="cursor-pointer font-medium">What’s this?</summary>
        <div className="mt-2 space-y-2 text-muted-foreground">
          <p>
            Text models power briefs, concepts, scripts, and strategy outputs. Image models are
            used for moodboards and visual explorations.
          </p>
          <p>
            You can choose different models depending on speed, cost, and quality needs. We’ll
            fall back to safe defaults if a model is unavailable.
          </p>
        </div>
      </details>
    </div>
  );
}
