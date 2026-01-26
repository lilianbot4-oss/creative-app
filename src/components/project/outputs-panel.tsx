"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import InfoTooltip from "@/components/ui/info-tooltip";
import { Button } from "@/components/ui/button";
import MarkdownViewer from "@/components/markdown/markdown-viewer";
import { OUTPUT_TEMPLATE_LIST } from "@/lib/ai/templates";
import { GENERATION_MODE_LABELS, type GenerationMode } from "@/lib/constants";
import type { Output } from "@/lib/types";
import { setPrimaryOutputAction } from "@/app/(protected)/app/actions";

export default function OutputsPanel({
  outputs,
  projectId,
}: {
  outputs: Output[];
  projectId: string;
}) {
  const [compareByMode, setCompareByMode] = useState<Record<string, string | null>>({});

  const grouped = useMemo(() => {
    const map = new Map<GenerationMode, Output[]>();
    outputs.forEach((output) => {
      const list = map.get(output.mode) ?? [];
      list.push(output);
      map.set(output.mode, list);
    });
    for (const [mode, list] of map.entries()) {
      list.sort((a, b) => b.version - a.version);
      map.set(mode, list);
    }
    return map;
  }, [outputs]);

  const handleSetPrimary = async (output: Output) => {
    try {
      await setPrimaryOutputAction({ projectId, outputId: output.id });
      toast.success("Primary output updated");
    } catch {
      toast.error("Failed to update primary output");
    }
  };

  if (outputs.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-background/70 p-6 text-sm text-muted-foreground">
        No outputs yet. Generate one from the Idea Composer.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {OUTPUT_TEMPLATE_LIST.map((template) => {
        const list = grouped.get(template.mode) ?? [];
        if (list.length === 0) return null;
        const latest = list[0];
        const previous = list.slice(1);
        const primaryOutput = list.find((item) => item.is_primary) ?? null;
        const compareId = compareByMode[template.mode];
        const compareOutput = previous.find((item) => item.id === compareId) ?? null;

        return (
          <div key={template.mode} className="space-y-3 rounded-3xl border border-border/60 bg-card/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold">
                  {GENERATION_MODE_LABELS[template.mode]}
                </h3>
                <p className="text-xs text-muted-foreground">{template.description}</p>
              </div>
              <div className="flex items-center gap-2">
                {primaryOutput?.id === latest.id ? (
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary">Primary</Badge>
                    <InfoTooltip label="Primary outputs are your 'final' versions. They are prioritized in client exports and pitch packs." />
                  </div>
                ) : primaryOutput ? (
                  <Badge variant="outline">Primary v{primaryOutput.version}</Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleSetPrimary(latest)}
                  >
                    Set as primary
                  </Button>
                )}
                <Badge variant="outline">v{latest.version}</Badge>
              </div>
            </div>

            <MarkdownViewer
              content={latest.content_md}
              filename={`${template.mode}-v${latest.version}.md`}
            />

            {previous.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Previous versions
                </p>
                <div className="flex flex-wrap gap-2">
                  {previous.map((item) => (
                    <Button
                      key={item.id}
                      size="sm"
                      variant={compareId === item.id ? "default" : "outline"}
                      onClick={() =>
                        setCompareByMode((prev) => ({
                          ...prev,
                          [template.mode]: prev[template.mode] === item.id ? null : item.id,
                        }))
                      }
                    >
                      v{item.version} · {new Date(item.created_at).toLocaleDateString()}
                      {item.is_primary ? " · Primary" : ""}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}

            {compareOutput ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                  <p className="text-xs text-muted-foreground">Latest (v{latest.version})</p>
                  <MarkdownViewer
                    content={latest.content_md}
                    filename={`${template.mode}-v${latest.version}.md`}
                  />
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                  <p className="text-xs text-muted-foreground">Compare (v{compareOutput.version})</p>
                  <MarkdownViewer
                    content={compareOutput.content_md}
                    filename={`${template.mode}-v${compareOutput.version}.md`}
                  />
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
