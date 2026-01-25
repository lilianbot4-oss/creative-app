"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createBriefAction, upsertCreativeSpecAction } from "@/app/(protected)/app/actions";
import type { Brief, CreativeSpec } from "@/lib/types";
import { useRouter } from "next/navigation";

const sampleBrief =
  "Launch a social-first delivery campaign for Valentine’s Day. Objective: make DoorDash feel like the ultimate romantic wingman. Must avoid cheesy clichés. Deliverables: TikTok series, influencer briefs, OOH teaser, in-app promo.";

function parseLines(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatLines(items?: string[] | null) {
  return (items ?? []).join("\n");
}

function parseDeliverables(text: string) {
  return parseLines(text).map((line) => {
    const [type, ...rest] = line.split(":");
    return { type: type.trim(), notes: rest.join(":").trim() || null };
  });
}

function formatDeliverables(deliverables?: Array<{ type: string; notes?: string | null }> | null) {
  return (deliverables ?? [])
    .map((item) => `${item.type}${item.notes ? `: ${item.notes}` : ""}`)
    .join("\n");
}

export default function CreativeMapPanel({
  projectId,
  brief,
  creativeSpec,
  aiEnabled,
}: {
  projectId: string;
  brief: Brief | null;
  creativeSpec: CreativeSpec | null;
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const parsedJson = (creativeSpec?.parsed_json as Record<string, unknown>) ?? {};

  const [rawBriefText, setRawBriefText] = useState(
    creativeSpec?.raw_brief_text ?? brief?.raw_text ?? ""
  );
  const [objective, setObjective] = useState(
    (parsedJson.objective as string) ?? ""
  );
  const [audience, setAudience] = useState(
    creativeSpec?.audience ?? (parsedJson.audience as string) ?? ""
  );
  const [keyMessage, setKeyMessage] = useState(
    creativeSpec?.key_message ?? (parsedJson.key_message as string) ?? ""
  );
  const [contentSystemNotes, setContentSystemNotes] = useState(
    (parsedJson.content_system_notes as string) ?? ""
  );
  const [suggestedArchetypes, setSuggestedArchetypes] = useState(
    formatLines(parsedJson.suggested_archetypes as string[] | undefined)
  );
  const [mustDo, setMustDo] = useState(formatLines(creativeSpec?.must_do));
  const [mustAvoid, setMustAvoid] = useState(
    formatLines(creativeSpec?.must_avoid)
  );
  const [toneTags, setToneTags] = useState(formatLines(creativeSpec?.tone_tags));
  const [deliverablesText, setDeliverablesText] = useState(
    formatDeliverables(creativeSpec?.deliverables ?? null)
  );
  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);

  useEffect(() => {
    if (creativeSpec) {
      setRawBriefText(creativeSpec.raw_brief_text);
      setMustDo(formatLines(creativeSpec.must_do));
      setMustAvoid(formatLines(creativeSpec.must_avoid));
      setToneTags(formatLines(creativeSpec.tone_tags));
      setDeliverablesText(formatDeliverables(creativeSpec.deliverables ?? null));
      const updatedJson = (creativeSpec.parsed_json as Record<string, unknown>) ?? {};
      setObjective((updatedJson.objective as string) ?? "");
      setAudience(creativeSpec.audience ?? (updatedJson.audience as string) ?? "");
      setKeyMessage(
        creativeSpec.key_message ?? (updatedJson.key_message as string) ?? ""
      );
      setContentSystemNotes(
        (updatedJson.content_system_notes as string) ?? ""
      );
      setSuggestedArchetypes(
        formatLines(updatedJson.suggested_archetypes as string[] | undefined)
      );
    }
  }, [creativeSpec]);

  const parsedPayload = useMemo(() => {
    return {
      objective,
      audience,
      key_message: keyMessage,
      tone_tags: parseLines(toneTags),
      must_do: parseLines(mustDo),
      must_avoid: parseLines(mustAvoid),
      deliverables: parseDeliverables(deliverablesText),
      suggested_archetypes: parseLines(suggestedArchetypes),
      content_system_notes: contentSystemNotes,
    };
  }, [objective, audience, keyMessage, toneTags, mustDo, mustAvoid, deliverablesText, suggestedArchetypes, contentSystemNotes]);

  const handleSave = async () => {
    if (!rawBriefText.trim()) {
      toast.error("Raw brief is required.");
      return;
    }
    setSaving(true);
    try {
      await upsertCreativeSpecAction({
        projectId,
        rawBriefText: rawBriefText.trim(),
        parsedJson: parsedPayload,
        mustDo: parseLines(mustDo),
        mustAvoid: parseLines(mustAvoid),
        toneTags: parseLines(toneTags),
        deliverables: parseDeliverables(deliverablesText),
        keyMessage: keyMessage.trim() || null,
        audience: audience.trim() || null,
      });

      if (rawBriefText.trim() !== (brief?.raw_text ?? "").trim()) {
        await createBriefAction({
          project_id: projectId,
          raw_text: rawBriefText.trim(),
        });
      }

      toast.success("Creative map saved");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save creative map");
    } finally {
      setSaving(false);
    }
  };

  const handleParse = async () => {
    if (!aiEnabled) {
      toast.error("AI disabled: add OPENAI_API_KEY to .env.local and restart.");
      return;
    }
    if (!rawBriefText.trim()) {
      toast.error("Add a brief before parsing.");
      return;
    }

    setParsing(true);
    try {
      const response = await fetch("/api/ai/parse-creative-spec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          rawText: rawBriefText.trim(),
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
        toast.error(data?.error || "Failed to parse creative map");
        return;
      }

      const spec = data.creative_spec as CreativeSpec;
      if (spec) {
        setMustDo(formatLines(spec.must_do));
        setMustAvoid(formatLines(spec.must_avoid));
        setToneTags(formatLines(spec.tone_tags));
        setDeliverablesText(formatDeliverables(spec.deliverables ?? null));
        const json = (spec.parsed_json as Record<string, unknown>) ?? {};
        setObjective((json.objective as string) ?? "");
        setAudience(spec.audience ?? (json.audience as string) ?? "");
        setKeyMessage(spec.key_message ?? (json.key_message as string) ?? "");
        setContentSystemNotes((json.content_system_notes as string) ?? "");
        setSuggestedArchetypes(
          formatLines(json.suggested_archetypes as string[] | undefined)
        );
      }

      toast.success("Creative map updated");
      if (rawBriefText.trim() !== (brief?.raw_text ?? "").trim()) {
        await createBriefAction({
          project_id: projectId,
          raw_text: rawBriefText.trim(),
        });
      }
      router.refresh();
    } catch {
      toast.error("Failed to parse creative map");
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Raw brief</CardTitle>
            {!aiEnabled ? <Badge variant="destructive">AI Disabled</Badge> : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={6}
            value={rawBriefText}
            onChange={(event) => setRawBriefText(event.target.value)}
            placeholder="Paste the full creative brief here..."
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save creative map"}
            </Button>
            <Button
              variant="secondary"
              onClick={handleParse}
              disabled={parsing || !aiEnabled}
            >
              {parsing ? "Parsing..." : "Parse brief into creative map"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRawBriefText(sampleBrief)}
            >
              Use sample brief
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Parsed spec</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Objective</label>
              <Input value={objective} onChange={(event) => setObjective(event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Audience</label>
              <Input value={audience} onChange={(event) => setAudience(event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Key message</label>
              <Input value={keyMessage} onChange={(event) => setKeyMessage(event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Content system notes</label>
              <Textarea
                rows={3}
                value={contentSystemNotes}
                onChange={(event) => setContentSystemNotes(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Suggested archetypes</label>
              <Textarea
                rows={3}
                value={suggestedArchetypes}
                onChange={(event) => setSuggestedArchetypes(event.target.value)}
                placeholder="One per line"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Constraints</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Must do</label>
              <Textarea
                rows={4}
                value={mustDo}
                onChange={(event) => setMustDo(event.target.value)}
                placeholder="One per line"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Must avoid</label>
              <Textarea
                rows={4}
                value={mustAvoid}
                onChange={(event) => setMustAvoid(event.target.value)}
                placeholder="One per line"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tone tags</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={5}
              value={toneTags}
              onChange={(event) => setToneTags(event.target.value)}
              placeholder="Playful, grounded, aspirational..."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deliverables</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Textarea
              rows={5}
              value={deliverablesText}
              onChange={(event) => setDeliverablesText(event.target.value)}
              placeholder="TikTok series: 6 episodic scripts\nInfluencer brief: creator guidance"
            />
            <p className="text-xs text-muted-foreground">
              Format: <span className="font-medium">type: notes</span> per line.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
