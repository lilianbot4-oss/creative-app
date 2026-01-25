"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Concept, ConceptVariant, CreativeSpec, Feedback, Reference, Script, Storyboard } from "@/lib/types";

const PIPELINE_STEPS = [
  { id: "concepts", label: "Generate concepts" },
  { id: "variants", label: "Generate variants" },
  { id: "script", label: "Generate launch script" },
  { id: "storyboard", label: "Generate storyboard" },
];

export default function PitchBuilderPanel({
  projectId,
  creativeSpec,
  concepts,
  variantsByConcept,
  scripts,
  storyboardsByScript,
  references,
  feedback,
  aiEnabled,
}: {
  projectId: string;
  creativeSpec: CreativeSpec | null;
  concepts: Concept[];
  variantsByConcept: Record<string, ConceptVariant[]>;
  scripts: Script[];
  storyboardsByScript: Record<string, Storyboard | null>;
  references: Reference[];
  feedback: Feedback[];
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const [selectedConcepts, setSelectedConcepts] = useState<string[]>(
    concepts.slice(0, 3).map((concept) => concept.id)
  );
  const [selectedVariantId, setSelectedVariantId] = useState("none");
  const [includeConstraints, setIncludeConstraints] = useState(true);
  const [includeAppendix, setIncludeAppendix] = useState(true);
  const [includeReferences, setIncludeReferences] = useState(true);
  const [includeFeedback, setIncludeFeedback] = useState(false);
  const [includeProvenance, setIncludeProvenance] = useState(false);
  const [runningStep, setRunningStep] = useState<string | null>(null);

  const storyboardCount = useMemo(
    () => Object.values(storyboardsByScript).filter(Boolean).length,
    [storyboardsByScript]
  );

  const selectedVariants = useMemo(() => {
    if (!selectedConcepts[0]) return [];
    return variantsByConcept[selectedConcepts[0]] ?? [];
  }, [selectedConcepts, variantsByConcept]);

  const pitchUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (!includeConstraints) params.set("constraints", "false");
    if (!includeAppendix) params.set("appendix", "false");
    if (!includeReferences) params.set("refs", "false");
    if (includeFeedback) params.set("feedback", "true");
    if (includeProvenance) params.set("provenance", "true");
    if (selectedConcepts.length) params.set("concepts", selectedConcepts.join(","));
    if (selectedVariantId !== "none") params.set("variant", selectedVariantId);
    const query = params.toString();
    return `/app/projects/${projectId}/pitch${query ? `?${query}` : ""}`;
  }, [projectId, includeConstraints, includeAppendix, includeReferences, includeFeedback, includeProvenance, selectedConcepts, selectedVariantId]);

  const toggleConcept = (conceptId: string) => {
    setSelectedConcepts((prev) => {
      if (prev.includes(conceptId)) {
        return prev.filter((id) => id !== conceptId);
      }
      if (prev.length >= 3) {
        toast.error("Select up to 3 concepts.");
        return prev;
      }
      return [...prev, conceptId];
    });
  };

  const runPipeline = async () => {
    if (!aiEnabled) {
      toast.error("AI disabled: add OPENAI_API_KEY to .env.local and restart.");
      return;
    }
    try {
      setRunningStep("concepts");
      const conceptsRes = await fetch("/api/ai/generate-concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const conceptsJson = await conceptsRes.json();
      if (!conceptsRes.ok) throw new Error(conceptsJson?.error || "Failed to generate concepts");

      const newConcepts: Concept[] = conceptsJson.concepts ?? [];
      const topConcepts = newConcepts.slice(0, 3).map((concept) => concept.id);
      if (topConcepts.length > 0) {
        setSelectedConcepts(topConcepts);
      }

      if (!topConcepts[0]) {
        toast.error("No concepts returned.");
        return;
      }

      setRunningStep("variants");
      const variantsRes = await fetch("/api/ai/generate-variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conceptId: topConcepts[0] }),
      });
      const variantsJson = await variantsRes.json();
      if (!variantsRes.ok) throw new Error(variantsJson?.error || "Failed to generate variants");
      const variants = variantsJson.variants as ConceptVariant[];
      const firstVariantId = variants?.[0]?.id ?? "none";
      setSelectedVariantId(firstVariantId);

      setRunningStep("script");
      const scriptRes = await fetch("/api/ai/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          conceptId: topConcepts[0],
          variantId: firstVariantId === "none" ? null : firstVariantId,
          format: "launch_30",
        }),
      });
      const scriptJson = await scriptRes.json();
      if (!scriptRes.ok) throw new Error(scriptJson?.error || "Failed to generate script");

      const scriptId = scriptJson.script?.id as string | undefined;
      if (scriptId) {
        setRunningStep("storyboard");
        const storyboardRes = await fetch("/api/ai/generate-storyboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, scriptId }),
        });
        const storyboardJson = await storyboardRes.json();
        if (!storyboardRes.ok) throw new Error(storyboardJson?.error || "Failed to generate storyboard");
      }

      toast.success("Pitch pack generated");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Pitch pack generation failed");
    } finally {
      setRunningStep(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Pitch builder</CardTitle>
            {!aiEnabled ? <Badge variant="destructive">AI Disabled</Badge> : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="font-medium">Creative map summary</p>
              {creativeSpec ? (
                <div className="rounded-xl border border-border/60 bg-background/70 p-3">
                  <p><strong>Audience:</strong> {creativeSpec.audience || "-"}</p>
                  <p><strong>Key message:</strong> {creativeSpec.key_message || "-"}</p>
                  <p><strong>Must do:</strong> {(creativeSpec.must_do ?? []).join(", ") || "-"}</p>
                  <p><strong>Must avoid:</strong> {(creativeSpec.must_avoid ?? []).join(", ") || "-"}</p>
                  <p><strong>Scripts:</strong> {scripts.length}</p>
                  <p><strong>Storyboards:</strong> {storyboardCount}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">No creative map yet.</p>
              )}
            </div>
            <div className="space-y-2">
              <p className="font-medium">Pitch pack options</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includeConstraints}
                    onChange={(event) => setIncludeConstraints(event.target.checked)}
                  />
                  Include constraints
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includeAppendix}
                    onChange={(event) => setIncludeAppendix(event.target.checked)}
                  />
                  Include appendix outputs
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includeReferences}
                    onChange={(event) => setIncludeReferences(event.target.checked)}
                  />
                  Include references ({references.length})
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includeFeedback}
                    onChange={(event) => setIncludeFeedback(event.target.checked)}
                  />
                  Include feedback ({feedback.length})
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includeProvenance}
                    onChange={(event) => setIncludeProvenance(event.target.checked)}
                  />
                  Include provenance (internal)
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Concept selection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {concepts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No concepts yet. Generate concepts to build a pitch pack.
            </p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {concepts.map((concept) => (
                <label
                  key={concept.id}
                  className="flex items-start gap-2 rounded-xl border border-border/60 p-3"
                >
                  <input
                    type="checkbox"
                    checked={selectedConcepts.includes(concept.id)}
                    onChange={() => toggleConcept(concept.id)}
                  />
                  <span>
                    <p className="font-medium">{concept.title}</p>
                    <p className="text-xs text-muted-foreground">{concept.one_liner}</p>
                  </span>
                </label>
              ))}
            </div>
          )}
          <div className="space-y-2">
            <p className="text-sm font-medium">Variant for primary concept (optional)</p>
            <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
              <SelectTrigger>
                <SelectValue placeholder="Select variant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {selectedVariants.map((variant) => (
                  <SelectItem key={variant.id} value={variant.id}>
                    {variant.angle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={pitchUrl}>Open pitch pack</Link>
            </Button>
            <Button variant="secondary" onClick={runPipeline} disabled={!aiEnabled || !!runningStep}>
              {runningStep ? `Running ${runningStep}...` : "Generate pitch pack"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {runningStep ? (
        <Card>
          <CardHeader>
            <CardTitle>Pipeline progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {PIPELINE_STEPS.map((step) => (
              <div key={step.id} className="flex items-center justify-between">
                <span>{step.label}</span>
                <span>{runningStep === step.id ? "Running" : "Pending"}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
