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
import { createConceptAction } from "@/app/(protected)/app/actions";
import type { Concept, ConceptVariant } from "@/lib/types";
import ConceptDetail from "@/components/project/concept-detail";

export default function ConceptsPanel({
  projectId,
  concepts,
  variantsByConcept,
  aiEnabled,
}: {
  projectId: string;
  concepts: Concept[];
  variantsByConcept: Record<string, ConceptVariant[]>;
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [title, setTitle] = useState("");
  const [oneLiner, setOneLiner] = useState("");
  const [thesis, setThesis] = useState("");
  const [integration, setIntegration] = useState("");
  const [scalability, setScalability] = useState("");

  const sortedConcepts = useMemo(
    () => concepts.slice().sort((a, b) => (a.created_at > b.created_at ? -1 : 1)),
    [concepts]
  );

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
        doorDash_integration: integration.trim() || null,
        scalability: scalability.trim() || null,
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
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Concept generation</CardTitle>
            {!aiEnabled ? <Badge variant="destructive">AI Disabled</Badge> : null}
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={handleGenerate} disabled={!aiEnabled || generating}>
            {generating ? "Generating..." : "Generate 6 Concepts"}
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary">New concept</Button>
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
                  <label className="text-sm font-medium">Thesis</label>
                  <Textarea
                    rows={3}
                    value={thesis}
                    onChange={(event) => setThesis(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Product integration</label>
                  <Input
                    value={integration}
                    onChange={(event) => setIntegration(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Scalability</label>
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

      {sortedConcepts.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-background/70 p-6 text-sm text-muted-foreground">
          No concepts yet. Generate or create your first concept to begin exploration.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sortedConcepts.map((concept) => {
            const variants = variantsByConcept[concept.id] ?? [];
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
                    <Badge variant="outline">{variants.length} variants</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
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
                  {concept.doorDash_integration ? (
                    <div>
                      <p className="font-medium">Product integration</p>
                      <p className="text-muted-foreground">{concept.doorDash_integration}</p>
                    </div>
                  ) : null}
                  {concept.scalability ? (
                    <div>
                      <p className="font-medium">Scalability</p>
                      <p className="text-muted-foreground">{concept.scalability}</p>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <ConceptDetail concept={concept} variants={variants} />
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
