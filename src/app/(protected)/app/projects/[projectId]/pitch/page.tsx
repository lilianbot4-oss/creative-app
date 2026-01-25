import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getCreativeSpec,
  getFeedback,
  getOutputs,
  getReferences,
  getStoryboard,
  listConceptAssetsByProject,
  listConcepts,
  listScripts,
  listVariants,
} from "@/lib/data";
import { GENERATION_MODE_LABELS, SCRIPT_FORMAT_LABELS } from "@/lib/constants";
import PitchControls from "@/components/project/pitch-controls";
import MarkdownContent from "@/components/markdown/markdown-content";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPublicStorageUrl } from "@/lib/storage";
import type { Client, ConceptVariant, Project } from "@/lib/types";

interface PitchPageProps {
  params: Promise<{ projectId: string }>;
  searchParams?: Promise<{
    constraints?: string;
    appendix?: string;
    refs?: string;
    feedback?: string;
    provenance?: string;
    gallery?: string;
    concepts?: string;
    variant?: string;
  }> | {
    constraints?: string;
    appendix?: string;
    refs?: string;
    feedback?: string;
    provenance?: string;
    gallery?: string;
    concepts?: string;
    variant?: string;
  };
}

export default async function PitchPage({ params, searchParams }: PitchPageProps) {
  const { projectId } = await params;
  const resolvedSearch = await Promise.resolve(searchParams);
  const includeConstraints = resolvedSearch?.constraints !== "false";
  const includeAppendix = resolvedSearch?.appendix !== "false";
  const includeReferences = resolvedSearch?.refs !== "false";
  const includeFeedback = resolvedSearch?.feedback === "true";
  const includeProvenance = resolvedSearch?.provenance === "true";
  const includeGallery = resolvedSearch?.gallery === "true";
  const conceptIds = resolvedSearch?.concepts
    ? resolvedSearch.concepts.split(",").filter(Boolean)
    : [];
  const selectedVariantId = resolvedSearch?.variant ?? "";

  let project: (Project & { client: Client | null }) | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("projects")
      .select("*, client:clients(*)")
      .eq("id", projectId)
      .maybeSingle();
    project = data as (Project & { client: Client | null }) | null;
  } catch (error) {
    console.error("Pitch fetch failed", { projectId, error });
    throw error;
  }

  if (!project) {
    notFound();
  }

  const [creativeSpec, concepts, scripts, outputs, feedback, references, conceptAssets] = await Promise.all([
    getCreativeSpec(projectId),
    listConcepts(projectId),
    listScripts(projectId),
    getOutputs(projectId),
    getFeedback(projectId),
    getReferences(projectId),
    listConceptAssetsByProject(projectId),
  ]);

  const variantsByConceptEntries = await Promise.all(
    concepts.map(async (concept) => {
      const variants = await listVariants(concept.id);
      return [concept.id, variants] as [string, ConceptVariant[]];
    })
  );
  const variantsByConcept = Object.fromEntries(variantsByConceptEntries);

  const selectedConcepts =
    conceptIds.length > 0
      ? concepts.filter((concept) => conceptIds.includes(concept.id))
      : concepts.slice(0, 3);

  const primaryVisualByConcept = new Map(
    conceptAssets
      .filter((asset) => asset.asset_type === "key_visual" && asset.is_primary && asset.concept_id)
      .map((asset) => [asset.concept_id as string, asset])
  );

  const selectedVariant = selectedVariantId
    ? Object.values(variantsByConcept).flat().find((variant) => variant.id === selectedVariantId)
    : null;

  const preferredFormats = ["launch_60", "launch_30"] as const;
  let primaryScript = scripts.find(
    (script) =>
      script.is_primary &&
      preferredFormats.includes(script.format as (typeof preferredFormats)[number])
  );
  if (!primaryScript) {
    for (const format of preferredFormats) {
      const candidate = scripts.filter((script) => script.format === format).sort((a, b) => b.version - a.version)[0];
      if (candidate) {
        primaryScript = candidate;
        break;
      }
    }
  }
  if (!primaryScript) {
    primaryScript = scripts.sort((a, b) => b.version - a.version)[0];
  }

  const storyboard = primaryScript ? await getStoryboard(primaryScript.id) : null;

  const appendixOutputs = includeAppendix
    ? outputs
        .slice()
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 6)
    : [];

  return (
    <div className="space-y-6">
      <div className="no-print">
        <h2 className="text-2xl font-semibold">Client pitch pack</h2>
        <p className="text-sm text-muted-foreground">
          Use this view to export a polished, client-ready deck.
        </p>
      </div>
      <PitchControls />

      <div className="print-area space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Pitch Pack</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>Client:</strong> {project.client?.name ?? ""}
            </p>
            <p>
              <strong>Project:</strong> {project.name}
            </p>
            <p>
              <strong>Status:</strong> {project.status}
            </p>
            <p>
              <strong>Generated:</strong> {new Date().toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Creative map</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {creativeSpec ? (
              <div className="space-y-2">
                <p>
                  <strong>Audience:</strong> {creativeSpec.audience ?? "-"}
                </p>
                <p>
                  <strong>Key message:</strong> {creativeSpec.key_message ?? "-"}
                </p>
                {includeConstraints ? (
                  <div className="space-y-1">
                    <p>
                      <strong>Must do:</strong> {(creativeSpec.must_do ?? []).join(", ") || "-"}
                    </p>
                    <p>
                      <strong>Must avoid:</strong> {(creativeSpec.must_avoid ?? []).join(", ") || "-"}
                    </p>
                  </div>
                ) : null}
                {creativeSpec.parsed_json ? (
                  <div>
                    <p className="font-medium">Notes</p>
                    <pre className="whitespace-pre-wrap rounded-2xl bg-muted/50 p-4 text-xs">
                      {JSON.stringify(creativeSpec.parsed_json, null, 2)}
                    </pre>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-muted-foreground">No creative map yet.</p>
            )}
          </CardContent>
        </Card>

        {creativeSpec?.parsed_json ? (
          <Card>
            <CardHeader>
              <CardTitle>Content system notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                {(creativeSpec.parsed_json as Record<string, unknown>).content_system_notes
                  ? String((creativeSpec.parsed_json as Record<string, unknown>).content_system_notes)
                  : "No additional notes provided."}
              </p>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Top concepts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedConcepts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No concepts yet.</p>
            ) : (
              selectedConcepts.map((concept) => (
                <div key={concept.id} className="rounded-xl border border-border/60 p-4 text-sm">
                  <p className="text-base font-semibold">{concept.title}</p>
                  {includeProvenance ? (
                    <p className="text-xs text-muted-foreground">
                      Provenance: {concept.origin_type ?? "human"}
                    </p>
                  ) : null}
                  {primaryVisualByConcept.get(concept.id) ? (
                    <div className="mt-3 overflow-hidden rounded-xl border border-border/60">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getPublicStorageUrl(
                          primaryVisualByConcept.get(concept.id)!.storage_bucket,
                          primaryVisualByConcept.get(concept.id)!.storage_path
                        )}
                        alt="Primary key visual"
                        className="h-48 w-full object-cover"
                      />
                    </div>
                  ) : null}
                  {concept.one_liner ? (
                    <p className="text-muted-foreground">{concept.one_liner}</p>
                  ) : null}
                  {concept.share_triggers?.length ? (
                    <p className="mt-2">
                      <strong>Why it spreads:</strong> {concept.share_triggers.join(", ")}
                    </p>
                  ) : null}
                  {concept.scalability ? (
                    <p>
                      <strong>Scalability:</strong> {concept.scalability}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {selectedVariant ? (
          <Card>
            <CardHeader>
              <CardTitle>Selected variant</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{selectedVariant.angle}</p>
              {selectedVariant.summary ? (
                <p className="text-muted-foreground">{selectedVariant.summary}</p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Primary script</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!primaryScript ? (
              <p className="text-sm text-muted-foreground">No scripts yet.</p>
            ) : (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  {SCRIPT_FORMAT_LABELS[primaryScript.format]} (v{primaryScript.version})
                </h3>
                {includeProvenance ? (
                  <p className="text-xs text-muted-foreground">
                    Provenance: {primaryScript.origin_type ?? "human"}
                  </p>
                ) : null}
                <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                  <MarkdownContent content={primaryScript.script_md} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {storyboard ? (
          <Card>
            <CardHeader>
              <CardTitle>Storyboard</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2 text-sm">
                {storyboard.frames.map((frame) => (
                  <div key={frame.frame} className="rounded-xl border border-border/60 p-3">
                    <p className="font-medium">Frame {frame.frame}</p>
                    <p className="text-xs text-muted-foreground">{frame.shot}</p>
                    <p>{frame.setting}</p>
                    <p className="text-muted-foreground">{frame.action}</p>
                  </div>
                ))}
              </div>
              {storyboard.shotlist ? (
                <pre className="whitespace-pre-wrap rounded-2xl bg-muted/50 p-4 text-xs">
                  {JSON.stringify(storyboard.shotlist, null, 2)}
                </pre>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {includeGallery && conceptAssets.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Image gallery</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {conceptAssets.map((asset) => (
                <div key={asset.id} className="overflow-hidden rounded-xl border border-border/60">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getPublicStorageUrl(asset.storage_bucket, asset.storage_path)}
                    alt="Generated visual"
                    className="h-40 w-full object-cover"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {includeAppendix && appendixOutputs.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Appendix outputs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {appendixOutputs.map((output) => (
                <div key={output.id} className="space-y-2">
                  <p className="text-sm font-medium">
                    {GENERATION_MODE_LABELS[output.mode]} (v{output.version})
                  </p>
                  <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                    <MarkdownContent content={output.content_md} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {includeFeedback ? (
          <Card>
            <CardHeader>
              <CardTitle>Feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {feedback.length === 0 ? (
                <p className="text-muted-foreground">No feedback yet.</p>
              ) : (
                feedback.map((item) => (
                  <div key={item.id} className="rounded-xl border border-border/60 p-3">
                    {item.text}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ) : null}

        {includeReferences ? (
          <Card>
            <CardHeader>
              <CardTitle>References</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {references.length === 0 ? (
                <p className="text-muted-foreground">No references yet.</p>
              ) : (
                references.map((ref) => (
                  <div key={ref.id} className="rounded-xl border border-border/60 p-3">
                    {ref.url ? <span>{ref.url}</span> : <span>{ref.storage_path}</span>}
                    {ref.notes ? (
                      <div className="text-xs text-muted-foreground">{ref.notes}</div>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
