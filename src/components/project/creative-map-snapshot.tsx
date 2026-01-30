"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

type CreativeMapSnapshotValue = Record<string, unknown> | null;

export interface CreativeMapSnapshotProps {
  snapshot: CreativeMapSnapshotValue;
  title?: string;
}

const EMPTY_TEXT = "Not provided.";

function normalizeSnapshot(input: unknown): Record<string, unknown> | null {
  if (!input) return null;
  if (typeof input === "string") {
    try {
      return JSON.parse(input) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  if (typeof input === "object") return input as Record<string, unknown>;
  return null;
}

function getFirstKey<T = unknown>(
  source: Record<string, unknown>,
  keys: string[]
): T | null {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== "") {
      return value as T;
    }
  }
  return null;
}

function toStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/\n|,|•/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function EmptyText({ children }: { children?: string }) {
  return <p className="text-sm text-muted-foreground">{children ?? EMPTY_TEXT}</p>;
}

function SectionTitle({ children, className }: { children: string; className?: string }) {
  return <h3 className={cn("text-sm font-semibold uppercase tracking-wide text-muted-foreground", className)}>{children}</h3>;
}

export default function CreativeMapSnapshot({ snapshot, title }: CreativeMapSnapshotProps) {
  const normalized = useMemo(() => normalizeSnapshot(snapshot), [snapshot]);

  const isEmpty = !normalized || Object.keys(normalized).length === 0;

  if (isEmpty) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">No project setup yet.</p>
        <p>Parse your project details to see a summary here.</p>
      </div>
    );
  }

  const objective = getFirstKey<string>(normalized, ["objective", "Objective"]);
  const audience = getFirstKey<string>(normalized, ["audience", "Audience"]);
  const keyMessage = getFirstKey<string>(normalized, ["key_message", "keyMessage"]);
  const contentNotes = getFirstKey<string>(normalized, [
    "content_system_notes",
    "contentSystemNotes",
    "notes",
  ]);
  const mustDo = toStringArray(getFirstKey(normalized, ["must_do", "mustDo"]));
  const mustAvoid = toStringArray(getFirstKey(normalized, ["must_avoid", "mustAvoid"]));
  const toneTags = toStringArray(getFirstKey(normalized, ["tone_tags", "toneTags"]));
  const archetypes = toStringArray(
    getFirstKey(normalized, ["suggested_archetypes", "suggestedArchetypes", "archetypes"])
  );
  const deliverables = getFirstKey<unknown[]>(normalized, ["deliverables"]) ?? [];

  const rawJson = JSON.stringify(normalized, null, 2);

  return (
    <div className="space-y-6">
      {title ? <SectionTitle className="text-base font-semibold text-foreground">{title}</SectionTitle> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
          <SectionTitle>Objective</SectionTitle>
          <p className="mt-2 text-sm leading-relaxed text-foreground">
            {objective ? objective : <EmptyText />}
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
          <SectionTitle>Audience</SectionTitle>
          <p className="mt-2 text-sm leading-relaxed text-foreground">
            {audience ? audience : <EmptyText />}
          </p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-background/70 p-4 md:col-span-2">
          <SectionTitle>Key Message</SectionTitle>
          <p className="mt-2 text-sm leading-relaxed text-foreground">
            {keyMessage ? keyMessage : <EmptyText />}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <SectionTitle>Tone & Archetypes</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {toneTags.length > 0 ? (
            toneTags.map((tag, index) => (
              <Badge key={`tone-${index}`} variant="secondary">
                {tag}
              </Badge>
            ))
          ) : (
            <EmptyText> No tone tags yet.</EmptyText>
          )}
          {archetypes.length > 0 ? (
            archetypes.map((tag, index) => (
              <Badge key={`arch-${index}`} variant="outline">
                {tag}
              </Badge>
            ))
          ) : null}
        </div>
      </div>

      <Separator />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
          <SectionTitle>Must Do ✅</SectionTitle>
          {mustDo.length > 0 ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-foreground">
              {mustDo.map((item, index) => (
                <li key={`must-do-${index}`}>{item}</li>
              ))}
            </ul>
          ) : (
            <EmptyText>No constraints added yet.</EmptyText>
          )}
        </div>
        <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
          <SectionTitle>Must Avoid 🚫</SectionTitle>
          {mustAvoid.length > 0 ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-foreground">
              {mustAvoid.map((item, index) => (
                <li key={`must-avoid-${index}`}>{item}</li>
              ))}
            </ul>
          ) : (
            <EmptyText>No avoid notes yet.</EmptyText>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <SectionTitle>Deliverables</SectionTitle>
        {Array.isArray(deliverables) && deliverables.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {deliverables.map((item, index) => {
              const deliverable = item as { type?: string; notes?: string };
              return (
                <div key={`deliverable-${index}`} className="rounded-2xl border border-border/60 bg-background/70 p-4">
                  <p className="text-sm font-semibold text-foreground">
                    {deliverable.type ?? "Deliverable"}
                  </p>
                  {deliverable.notes ? (
                    <p className="mt-1 text-xs text-muted-foreground">{deliverable.notes}</p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">No notes provided.</p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyText>No deliverables specified.</EmptyText>
        )}
      </div>

      <div className="space-y-3">
        <SectionTitle>Additional Notes</SectionTitle>
        <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm text-foreground">
          {contentNotes ? contentNotes : <EmptyText />}
        </div>
      </div>

      <Accordion type="single" collapsible className="no-print">
        <AccordionItem value="raw-json">
          <AccordionTrigger>Raw JSON (advanced)</AccordionTrigger>
          <AccordionContent>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                For debugging or exporting the exact snapshot.
              </p>
              <Button
                size="xs"
                variant="secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(rawJson);
                    toast.success("Snapshot copied");
                  } catch {
                    toast.error("Failed to copy snapshot");
                  }
                }}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </Button>
            </div>
            <pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-muted/50 p-4 text-xs">
              {rawJson}
            </pre>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
