"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, FileText, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import InfoTooltip from "@/components/ui/info-tooltip";
import { createBriefAction, saveBriefUploadAction, setActiveBriefUploadAction, upsertCreativeSpecAction } from "@/app/(protected)/app/actions";
import type { Brief, CreativeSpec, ProjectBriefUpload } from "@/lib/types";
import { useRouter } from "next/navigation";
import { extractTextFromPdf, extractTextFromPptx } from "@/lib/briefParsing/clientExtract";

const sampleBrief =
  "Launch a social-first campaign for a food delivery brand for Valentine's Day. Objective: make the brand feel like the ultimate romantic wingman. Must avoid cheesy cliches. Deliverables: TikTok series, influencer briefs, OOH teaser, in-app promo.";

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
  briefUploads,
  aiEnabled,
}: {
  projectId: string;
  brief: Brief | null;
  creativeSpec: CreativeSpec | null;
  briefUploads: ProjectBriefUpload[];
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
  const [parsedFrom, setParsedFrom] = useState<string | null>(null);
  const [activeUploadId, setActiveUploadId] = useState<string | null>(
    creativeSpec?.active_brief_upload_id ?? null
  );
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [uploadText, setUploadText] = useState("");
  const [uploadMeta, setUploadMeta] = useState<Record<string, unknown> | null>(null);
  const [savingUpload, setSavingUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setActiveUploadId(creativeSpec.active_brief_upload_id ?? null);
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

  const handleFileSelected = async (file: File) => {
    const name = file.name.toLowerCase();
    const isPdf = name.endsWith(".pdf");
    const isPptx = name.endsWith(".pptx");
    if (!isPdf && !isPptx) {
      toast.error("Upload a PDF or PPTX file.");
      return;
    }

    setExtracting(true);
    setUploadFile(file);
    try {
      const result = isPdf ? await extractTextFromPdf(file) : await extractTextFromPptx(file);
      setUploadText(result.text);
      setUploadMeta(result.meta ?? null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to extract text from file");
    } finally {
      setExtracting(false);
    }
  };

  const handleSaveUpload = async () => {
    if (!uploadFile || !uploadText.trim()) {
      toast.error("Extracted text is required.");
      return;
    }
    setSavingUpload(true);
    try {
      const fileType = uploadFile.name.toLowerCase().endsWith(".pptx") ? "pptx" : "pdf";
      await saveBriefUploadAction({
        projectId,
        filename: uploadFile.name,
        fileType,
        fileSize: uploadFile.size,
        extractedText: uploadText.trim(),
        extractedMeta: uploadMeta ?? null,
      });
      toast.success("Brief uploaded (text only)");
      setUploadFile(null);
      setUploadText("");
      setUploadMeta(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save brief upload");
    } finally {
      setSavingUpload(false);
    }
  };

  const handleUseUpload = async (uploadId: string | null) => {
    try {
      await setActiveBriefUploadAction({ projectId, uploadId });
      setActiveUploadId(uploadId);
      toast.success(uploadId ? "Active brief updated" : "Using pasted brief");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update active brief");
    }
  };

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

      if (rawBriefText.trim() && rawBriefText.trim() !== (brief?.raw_text ?? "").trim()) {
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
    if (!rawBriefText.trim() && !activeUploadId) {
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
          rawText: rawBriefText.trim() || null,
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
      setParsedFrom(data?.parsed_from ?? null);
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
      if (rawBriefText.trim() && rawBriefText.trim() !== (brief?.raw_text ?? "").trim()) {
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
      <div className="rounded-2xl border border-border/60 bg-muted/40 p-4 text-sm">
        <p className="font-medium">Recommended next step</p>
        <p className="text-muted-foreground">Parse the Creative Map to unlock concept and script generation.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CardTitle>Upload Brief (files processed, not stored)</CardTitle>
              <InfoTooltip label="Upload PDF or PPTX briefs. We extract the text locally to keep your private files secure while enabling AI analysis." />
            </div>
            {!aiEnabled ? <Badge variant="secondary">AI Disabled</Badge> : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/40 bg-muted/20 py-10 transition-all hover:border-primary/40 hover:bg-muted/40"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Upload size={24} />
              </div>
              <p className="mt-4 font-semibold text-foreground">Click to upload or drag and drop</p>
              <p className="text-xs text-muted-foreground mt-1">PDF or PPTX (max. 10MB)</p>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.pptx"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) handleFileSelected(file);
                }}
              />
            </div>

            {uploadFile ? (
              <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-[10px]">
                    {uploadFile.name.split('.').pop()?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{uploadFile.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {Math.round(uploadFile.size / 1024)} KB
                    </p>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-full"
                  onClick={() => {
                    setUploadFile(null);
                    setUploadText("");
                    setUploadMeta(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  <X size={16} />
                </Button>
              </div>
            ) : null}
          </div>

          {extracting ? (
            <p className="text-sm text-muted-foreground">Extracting text...</p>
          ) : null}

          {uploadText ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">Extracted text (editable)</label>
              <Textarea
                rows={6}
                value={uploadText}
                onChange={(event) => setUploadText(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Preview saved text only. Files are never stored.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleSaveUpload} disabled={savingUpload}>
                  {savingUpload ? "Saving..." : "Save extracted text"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setUploadFile(null);
                    setUploadText("");
                    setUploadMeta(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <p className="text-sm font-medium">Upload history</p>
            {briefUploads.length === 0 ? (
              <p className="text-sm text-muted-foreground">No uploads yet.</p>
            ) : (
              <div className="space-y-2">
                {briefUploads.map((upload) => {
                  const wordCount = upload.extracted_text.trim().split(/\s+/).filter(Boolean).length;
                  const isActive = activeUploadId === upload.id;
                  return (
                    <div
                      key={upload.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/70 p-3 text-sm"
                    >
                      <div>
                        <p className="font-medium">{upload.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(upload.created_at).toLocaleString()} · {wordCount} words
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isActive ? <Badge variant="secondary">Active</Badge> : null}
                        <Button size="sm" variant="secondary" onClick={() => handleUseUpload(upload.id)}>
                          Use as current
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {activeUploadId ? (
                  <Button size="sm" variant="ghost" onClick={() => handleUseUpload(null)}>
                    Use pasted brief instead
                  </Button>
                ) : null}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CardTitle>Raw brief</CardTitle>
              <InfoTooltip label="Directly edit or paste your campaign brief. This serves as the primary source of truth for all AI-generated content." />
            </div>
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
              {parsing ? "Analyzing..." : "Extract key details from brief"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRawBriefText(sampleBrief)}
            >
              Use sample brief
            </Button>
          </div>
          {parsedFrom ? (
            <p className="text-xs text-muted-foreground">
              Parsed from: {parsedFrom}
            </p>
          ) : null}
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
