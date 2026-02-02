"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import InfoTooltip from "@/components/ui/info-tooltip";
import KeyVisualPreview from "@/components/media/key-visual-preview";
import { createConceptAction } from "@/app/(protected)/app/actions";
import type { Concept, ConceptAsset, ConceptVariant } from "@/lib/types";
import ConceptDetail from "@/components/project/concept-detail";
import ImportIdeasDialog from "@/components/project/import-ideas-dialog";
import KeyVisualGenerator from "@/components/project/key-visual-generator";
import { getPublicStorageUrl } from "@/lib/storage";

const ORIGIN_LABELS: Record<string, string> = {
  human: "Human",
  ai_assisted: "AI Assisted",
  ai_generated: "AI Generated",
};

export default function ConceptsPanel({
  projectId,
  concepts,
  variantsByConcept,
  assetsByConcept,
  aiEnabled,
  imageModel,
}: {
  projectId: string;
  concepts: Concept[];
  variantsByConcept: Record<string, ConceptVariant[]>;
  assetsByConcept: Record<string, ConceptAsset[]>;
  aiEnabled: boolean;
  imageModel: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [assistOpen, setAssistOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [title, setTitle] = useState("");
  const [oneLiner, setOneLiner] = useState("");
  const [thesis, setThesis] = useState("");
  const [integration, setIntegration] = useState("");
  const [scalability, setScalability] = useState("");
  const [seedTitle, setSeedTitle] = useState("");
  const [seedText, setSeedText] = useState("");
  const [originFilter, setOriginFilter] = useState<"all" | "human" | "ai_assisted" | "ai_generated">("all");
  const [humanFirst, setHumanFirst] = useState(false);
  const [iteratingFromId, setIteratingFromId] = useState<string | null>(null);

  const sortedConcepts = useMemo(() => {
    let list = concepts.slice();
    if (originFilter !== "all") {
      list = list.filter((concept) => (concept.origin_type ?? "human") === originFilter);
    }
    list.sort((a, b) => (a.created_at > b.created_at ? -1 : 1));
    if (humanFirst) {
      const weight = (origin?: string) =>
        origin === "human" ? 0 : origin === "ai_assisted" ? 1 : 2;
      list.sort((a, b) => {
        const weightDiff = weight(a.origin_type) - weight(b.origin_type);
        if (weightDiff !== 0) return weightDiff;
        return a.created_at > b.created_at ? -1 : 1;
      });
    }
    return list;
  }, [concepts, originFilter, humanFirst]);

  const handleGenerate = async () => {
    if (!aiEnabled) {
      toast.error("AI disabled: add OPENAI_API_KEY to .env.local and restart.");
      return;
    }
    setGenerating(true);
    try {
      const response = await fetch("/api/ai/generate-concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
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
        toast.error(data?.error || "Failed to generate concepts");
        return;
      }
      toast.success("Concepts generated");
      router.refresh();
    } catch {
      toast.error("Failed to generate concepts");
    } finally {
      setGenerating(false);
    }
  };

  const handleAssist = async () => {
    if (!aiEnabled) {
      toast.error("AI disabled: add OPENAI_API_KEY to .env.local and restart.");
      return;
    }
    if (!seedText.trim()) {
      toast.error("Seed text is required");
      return;
    }
    setGenerating(true);
    try {
      const combinedSeed = seedTitle.trim()
        ? `${seedTitle.trim()}: ${seedText.trim()}`
        : seedText.trim();
      const body: Record<string, unknown> = { projectId, seedText: combinedSeed, count: 1 };
      if (iteratingFromId) body.parentConceptId = iteratingFromId;
      const response = await fetch("/api/ai/generate-concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
        toast.error(data?.error || "Failed to expand seed");
        return;
      }
      toast.success("Concept expanded from seed");
      setSeedText("");
      setSeedTitle("");
      setIteratingFromId(null);
      setAssistOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to expand seed");
    } finally {
      setGenerating(false);
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      await createConceptAction({
        project_id: projectId,
        title: title.trim(),
        one_liner: oneLiner.trim() || null,
        thesis: thesis.trim() || null,
        product_integration: integration.trim() || null,
        scalability: scalability.trim() || null,
        origin_type: "human",
      });
      toast.success("Concept created");
      setTitle("");
      setOneLiner("");
      setThesis("");
      setIntegration("");
      setScalability("");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to create concept");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateVariants = async (conceptId: string) => {
    if (!aiEnabled) {
      toast.error("AI disabled: add OPENAI_API_KEY to .env.local and restart.");
      return;
    }
    try {
      const response = await fetch("/api/ai/generate-variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conceptId }),
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
        toast.error(data?.error || "Failed to generate variants");
        return;
      }
      toast.success("Variants generated");
      router.refresh();
    } catch {
      toast.error("Failed to generate variants");
    }
  };

  const handleNavigateToScripts = (conceptId: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("section", "scripts");
    params.set("conceptId", conceptId);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-muted/40 p-4 text-sm">
        <p className="font-medium">Recommended next step</p>
        <p className="text-muted-foreground">Select a concept and generate a script in the Script Studio.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CardTitle>Concept generation</CardTitle>
              <InfoTooltip label="Generate broad creative territories. Human, AI-assisted, and AI-generated concepts stay labeled for provenance." />
            </div>
            {!aiEnabled ? <Badge variant="destructive">AI Disabled</Badge> : null}
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={handleGenerate} disabled={!aiEnabled || generating}>
            {generating ? "Generating..." : "Generate 6 Concepts"}
          </Button>
          <Dialog open={assistOpen} onOpenChange={(next) => { setAssistOpen(next); if (!next) setIteratingFromId(null); }}>
            <DialogTrigger asChild>
              <Button variant="secondary" disabled={!aiEnabled || generating}>
                Develop my idea with AI
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Develop My Idea</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Seed title (optional)</label>
                  <Input value={seedTitle} onChange={(event) => setSeedTitle(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Seed text</label>
                  <Textarea
                    rows={4}
                    value={seedText}
                    onChange={(event) => setSeedText(event.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setAssistOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAssist} disabled={generating}>
                    {generating ? "Generating..." : "Generate concept"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <ImportIdeasDialog projectId={projectId} aiEnabled={aiEnabled} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary">New concept (human)</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New concept</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input value={title} onChange={(event) => setTitle(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">One-liner</label>
                  <Input
                    value={oneLiner}
                    onChange={(event) => setOneLiner(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Core idea</label>
                  <Textarea
                    rows={3}
                    value={thesis}
                    onChange={(event) => setThesis(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Product tie-in</label>
                  <Input
                    value={integration}
                    onChange={(event) => setIntegration(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Growth potential</label>
                  <Input
                    value={scalability}
                    onChange={(event) => setScalability(event.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={saving}>
                    {saving ? "Saving..." : "Save concept"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {(["all", "human", "ai_assisted", "ai_generated"] as const).map((value) => (
              <Button
                key={value}
                size="sm"
                variant={originFilter === value ? "default" : "secondary"}
                onClick={() => setOriginFilter(value)}
              >
                {value === "all" ? "All" : ORIGIN_LABELS[value]}
              </Button>
            ))}
          </div>
          <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={humanFirst}
              onChange={(event) => setHumanFirst(event.target.checked)}
            />
            Human-first sorting
          </label>
        </CardContent>
      </Card>

      {sortedConcepts.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-background/70 p-6 text-sm text-muted-foreground">
          No concepts yet. Generate or create your first concept to begin exploration.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sortedConcepts.map((concept) => {
            const variants = variantsByConcept[concept.id] ?? [];
            const origin = concept.origin_type ?? "human";
            const assets = assetsByConcept[concept.id] ?? [];
            const integration = concept.product_integration ?? null;
            const primaryAsset = assets.find(
              (asset) => asset.is_primary && asset.asset_type === "key_visual"
            );
            const primaryUrl =
              primaryAsset ? getPublicStorageUrl(primaryAsset.storage_bucket, primaryAsset.storage_path) : "";
            return (
              <Card key={concept.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">{concept.title}</CardTitle>
                      {concept.one_liner ? (
                        <p className="text-sm text-muted-foreground">{concept.one_liner}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary">{ORIGIN_LABELS[origin]}</Badge>
                        <InfoTooltip label="Origin: how this idea was created." />
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline">{variants.length} variants</Badge>
                        <InfoTooltip label="Variants are different angles or pivots for this core concept. Useful for exploring various strategic hooks." />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Image</p>
                      {primaryAsset ? <Badge variant="secondary">Primary</Badge> : null}
                    </div>
                    {primaryUrl ? (
                      <>
                        <KeyVisualPreview
                          src={primaryUrl}
                          alt={`Image for ${concept.title}`}
                          label="Primary"
                          aspect="card"
                          enableLightbox
                        />
                        <p className="text-[11px] text-muted-foreground">Click image to enlarge.</p>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No primary visual yet.
                      </p>
                    )}
                    <KeyVisualGenerator
                      projectId={projectId}
                      concept={concept}
                      assets={assets}
                      aiEnabled={aiEnabled}
                      imageModel={imageModel}
                      onRefresh={router.refresh}
                    />
                  </div>
                  {concept.share_triggers?.length ? (
                    <div>
                      <p className="font-medium">Why it spreads</p>
                      <ul className="list-disc pl-5 text-muted-foreground">
                        {concept.share_triggers.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {integration ? (
                    <div>
                      <p className="font-medium">Product tie-in</p>
                      <p className="text-muted-foreground">{integration}</p>
                    </div>
                  ) : null}
                  {concept.scalability ? (
                    <div>
                      <p className="font-medium">Growth potential</p>
                      <p className="text-muted-foreground">{concept.scalability}</p>
                    </div>
                  ) : null}
                  {concept.parent_concept_id ? (() => {
                    const parent = concepts.find((c) => c.id === concept.parent_concept_id);
                    return parent ? (
                      <p className="text-xs text-muted-foreground">
                        Iterated from: <span className="font-medium">{parent.title}</span>
                      </p>
                    ) : null;
                  })() : null}
                  {(() => {
                    const iterationCount = concepts.filter((c) => c.parent_concept_id === concept.id).length;
                    return iterationCount > 0 ? (
                      <Badge variant="outline">{iterationCount} iteration{iterationCount === 1 ? "" : "s"}</Badge>
                    ) : null;
                  })()}
                  <div className="flex flex-wrap gap-2">
                    <ConceptDetail concept={concept} variants={variants} assets={assets} allConcepts={concepts} />
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!aiEnabled || generating}
                      onClick={() => {
                        setSeedTitle(concept.title);
                        setSeedText(concept.thesis || concept.seed_text || "");
                        setIteratingFromId(concept.id);
                        setAssistOpen(true);
                      }}
                    >
                      Iterate with AI
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => handleGenerateVariants(concept.id)}>
                      Generate variants
                    </Button>
                    <Button size="sm" onClick={() => handleNavigateToScripts(concept.id)}>
                      Create scripts
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
