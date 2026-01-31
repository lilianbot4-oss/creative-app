"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listProjectActivityAction } from "@/app/(protected)/app/actions";
import type { ActivityEvent } from "@/lib/types";

const PAGE_SIZE = 20;

const ACTION_LABELS: Record<string, string> = {
  "client.created": "Client created",
  "client.updated": "Client updated",
  "client.deleted": "Client deleted",
  "client.brand_voice_updated": "Brand voice updated",
  "project.created": "Project created",
  "project.status_changed": "Project status changed",
  "project.deleted": "Project deleted",
  "brief.created": "Brief added",
  "brief_upload.saved": "Brief upload saved",
  "brief_upload.active_set": "Active brief upload set",
  "creative_spec.saved": "Creative spec saved",
  "concept.created": "Concept created",
  "concepts.imported": "Concepts imported",
  "variant.created": "Variant created",
  "script.created": "Script created",
  "script.primary_set": "Primary script set",
  "output.primary_set": "Primary output set",
  "feedback.created": "Feedback added",
  "share_link.created": "Share link created",
  "share_link.revoked": "Share link revoked",
  "demo_data.seeded": "Demo data seeded",
  "ai.output_generated": "AI output generated",
  "ai.concepts_generated": "AI concepts generated",
  "ai.variants_generated": "AI variants generated",
  "ai.script_generated": "AI script generated",
  "ai.script_rewritten": "AI script rewritten",
  "ai.storyboard_generated": "AI storyboard generated",
  "ai.images_generated": "AI images generated",
  "ai.key_visual_generated": "AI key visual generated",
  "ai.spec_parsed": "AI creative spec parsed",
  "ai.ideas_parsed": "AI ideas parsed",
  "ai.brief_parsed": "AI brief parsed",
  "ai.pack_generated": "AI content pack generated",
};

function formatLabel(action: string) {
  return ACTION_LABELS[action] ?? action.replace(/[_\.]/g, " ");
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDetails(event: ActivityEvent) {
  const details: string[] = [];
  if (event.entity_type) {
    details.push(`Entity: ${event.entity_type.replace(/_/g, " ")}`);
  }

  const meta = event.metadata ?? {};
  if (meta && typeof meta === "object") {
    const entries = meta as Record<string, unknown>;
    if (entries.mode) details.push(`Mode: ${entries.mode}`);
    if (entries.format) details.push(`Format: ${entries.format}`);
    if ("count" in entries) details.push(`Count: ${entries.count}`);
    if (entries.status) details.push(`Status: ${entries.status}`);
    if (entries.view_type) details.push(`View: ${entries.view_type}`);
    if (entries.label) details.push(`Label: ${entries.label}`);
    if (entries.parsed_from) details.push(`Parsed from: ${entries.parsed_from}`);
    if (entries.modes && Array.isArray(entries.modes)) {
      details.push(`Modes: ${entries.modes.join(", ")}`);
    }
  }

  return details.length > 0 ? details.join(" • ") : null;
}

export default function ActivityPanel({
  projectId,
  initialEvents,
  initialHasMore,
}: {
  projectId: string;
  initialEvents: ActivityEvent[];
  initialHasMore: boolean;
}) {
  const [events, setEvents] = useState<ActivityEvent[]>(initialEvents);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setEvents(initialEvents);
    setHasMore(initialHasMore);
  }, [initialEvents, initialHasMore, projectId]);

  const sortedEvents = useMemo(() => events, [events]);

  const handleLoadMore = async () => {
    setIsLoading(true);
    try {
      const result = await listProjectActivityAction({
        projectId,
        offset: events.length,
        limit: PAGE_SIZE,
      });
      setEvents((prev) => [...prev, ...result.events]);
      setHasMore(result.hasMore);
    } catch {
      toast.error("Failed to load activity");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
        <CardDescription>Recent events and AI actions for this project.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <div className="space-y-3">
            {sortedEvents.map((event) => {
              const details = formatDetails(event);
              return (
                <div
                  key={event.id}
                  className="rounded-2xl border border-border/60 bg-background/60 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{formatLabel(event.action)}</p>
                      {details ? (
                        <p className="text-xs text-muted-foreground">{details}</p>
                      ) : null}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(event.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {hasMore ? (
          <Button variant="outline" size="sm" onClick={handleLoadMore} disabled={isLoading}>
            {isLoading ? "Loading..." : "Load more"}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
