import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getLatestBrief,
  getOutputs,
  getFeedback,
  getReferences,
  getPrimaryKeyVisualsForProject,
  listConcepts,
  listScripts,
  listConceptAssetsByProject,
  getStoryboard,
} from "@/lib/data";
import { GENERATION_MODE_LABELS, SCRIPT_FORMAT_LABELS } from "@/lib/constants";
import ExportControls from "@/components/project/export-controls";
import MarkdownContent from "@/components/markdown/markdown-content";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Client, Project } from "@/lib/types";
import { getPublicStorageUrl } from "@/lib/storage";
import KeyVisualPreview from "@/components/media/key-visual-preview";
import CreativeMapSnapshot from "@/components/project/creative-map-snapshot";

interface ExportPageProps {
  params: Promise<{ projectId: string }>;
  searchParams?:
    | Promise<{ refs?: string; feedback?: string; appendix?: string; provenance?: string; gallery?: string; concepts?: string; scripts?: string }>
    | { refs?: string; feedback?: string; appendix?: string; provenance?: string; gallery?: string; concepts?: string; scripts?: string };
}

export default async function ExportPage({ params, searchParams }: ExportPageProps) {
  const { projectId } = await params;
  const resolvedSearch = await Promise.resolve(searchParams);
  const includeReferences = resolvedSearch?.refs !== "false";
  const includeFeedback = resolvedSearch?.feedback !== "false";
  const includeAppendix = resolvedSearch?.appendix !== "false";
  const includeProvenance = resolvedSearch?.provenance === "true";
  const includeGallery = resolvedSearch?.gallery !== "false";
  const includeConcepts = resolvedSearch?.concepts !== "false";
  const includeScripts = resolvedSearch?.scripts !== "false";
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
    console.error("Project export fetch failed", { projectId, error });
    throw error;
  }

  if (!project) {
    notFound();
  }

  const [brief, outputs, feedback, references, keyVisualGroups, concepts, scripts, conceptAssets] = await Promise.all([
    getLatestBrief(projectId),
    getOutputs(projectId),
    getFeedback(projectId),
    getReferences(projectId),
    getPrimaryKeyVisualsForProject(projectId),
    listConcepts(projectId),
    listScripts(projectId),
    listConceptAssetsByProject(projectId),
  ]);
  const visualGroups = keyVisualGroups.filter((group) => group.primary);

  const conceptById = new Map(concepts.map((c) => [c.id, c]));

  // Group outputs by idea_id + mode so we keep the latest version per concept per mode
  const latestByKey = new Map<string, (typeof outputs)[number]>();
  outputs
    .slice()
    .sort((a, b) => b.version - a.version)
    .forEach((output) => {
      const key = `${output.idea_id ?? "_none_"}::${output.mode}`;
      if (!latestByKey.has(key)) {
        latestByKey.set(key, output);
      }
    });

  const primaryOutput =
    outputs.find((output) => output.is_primary) ??
    Array.from(latestByKey.values()).find((o) => o.mode === "one_pager") ??
    outputs[0] ??
    null;

  const appendixOutputs = includeAppendix
    ? Array.from(latestByKey.values())
        .filter((output) => output.id !== primaryOutput?.id)
        .sort((a, b) => a.mode.localeCompare(b.mode) || b.version - a.version)
    : [];

  // Scripts and storyboard
  const preferredFormats = ["launch_60", "launch_30"] as const;
  let primaryScript = scripts.find(
    (script) =>
      script.is_primary &&
      preferredFormats.includes(script.format as (typeof preferredFormats)[number])
  );
  if (!primaryScript) {
    for (const format of preferredFormats) {
      const candidate = scripts.filter((s) => s.format === format).sort((a, b) => b.version - a.version)[0];
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

  const primaryVisualByConcept = new Map(
    conceptAssets
      .filter((asset) => asset.asset_type === "key_visual" && asset.is_primary && asset.concept_id)
      .map((asset) => [asset.concept_id as string, asset])
  );

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-semibold">Export view</h2>
          <p className="text-sm text-muted-foreground">
            Print or save this page as a PDF for your client.
          </p>
        </div>
        <Button variant="secondary" asChild>
          <Link href={`/app/projects/${projectId}/pitch`}>Client presentation</Link>
        </Button>
      </div>
      <ExportControls />

      <div className="print-area space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Project Summary</CardTitle>
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
            <CardTitle>Project overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {brief?.parsed_summary ? (
              <CreativeMapSnapshot snapshot={brief.parsed_summary} />
            ) : (
              <p className="text-muted-foreground">
                {brief?.raw_text ?? "No brief available."}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Main result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!primaryOutput ? (
              <p className="text-sm text-muted-foreground">No outputs yet.</p>
            ) : (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  {GENERATION_MODE_LABELS[primaryOutput.mode]} (v{primaryOutput.version})
                </h3>
                {includeProvenance ? (
                  <p className="text-xs text-muted-foreground">Origin: legacy result (origin unknown)</p>
                ) : null}
                <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                  <MarkdownContent content={primaryOutput.content_md} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {visualGroups.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Main images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {visualGroups.map((group) => {
                if (!group.primary) return null;
                const primaryUrl = getPublicStorageUrl(
                  group.primary.storage_bucket,
                  group.primary.storage_path
                );
                return (
                  <div key={group.concept_id} className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-base font-semibold">
                        {group.concept_title ?? "Image"}
                      </h3>
                    </div>
                    <KeyVisualPreview
                      src={primaryUrl}
                      alt={`Main image for ${group.concept_title ?? "idea"}`}
                      label="Main image"
                      aspect="hero"
                      enableLightbox
                      priorityHint
                    />
                    {includeGallery && group.gallery.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                        {group.gallery.map((asset) => {
                          const url = getPublicStorageUrl(
                            asset.storage_bucket,
                            asset.storage_path
                          );
                          return (
                            <KeyVisualPreview
                              key={asset.id}
                              src={url}
                              alt="Image variation"
                              aspect="thumb"
                              enableLightbox
                              label={asset.is_primary ? "Primary" : undefined}
                              className="p-2"
                            />
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ) : null}

        {includeConcepts && concepts.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Ideas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {concepts.map((concept) => (
                <div key={concept.id} className="rounded-xl border border-border/60 p-4 text-sm">
                  <p className="text-base font-semibold">{concept.title}</p>
                  {includeProvenance ? (
                    <p className="text-xs text-muted-foreground">
                      Origin: {concept.origin_type ?? "human"}
                    </p>
                  ) : null}
                  {primaryVisualByConcept.get(concept.id) ? (
                    <div className="mt-3">
                      <KeyVisualPreview
                        src={getPublicStorageUrl(
                          primaryVisualByConcept.get(concept.id)!.storage_bucket,
                          primaryVisualByConcept.get(concept.id)!.storage_path
                        )}
                        alt={`Main image for ${concept.title}`}
                        label="Primary"
                        aspect="card"
                        enableLightbox
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
                      <strong>Growth potential:</strong> {concept.scalability}
                    </p>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {includeScripts ? (
          <Card>
            <CardHeader>
              <CardTitle>Main script</CardTitle>
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
                      Origin: {primaryScript.origin_type ?? "human"}
                    </p>
                  ) : null}
                  <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                    <MarkdownContent content={primaryScript.script_md} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}

        {includeScripts && storyboard ? (
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

        {appendixOutputs.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Additional results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {appendixOutputs.map((output) => {
                const conceptTitle = output.idea_id ? conceptById.get(output.idea_id)?.title : null;
                return (
                  <div key={output.id} className="space-y-2">
                    <h3 className="text-lg font-semibold">
                      {GENERATION_MODE_LABELS[output.mode]} (v{output.version})
                      {conceptTitle ? (
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          — {conceptTitle}
                        </span>
                      ) : null}
                    </h3>
                    {includeProvenance ? (
                      <p className="text-xs text-muted-foreground">Origin: legacy result (origin unknown)</p>
                    ) : null}
                    <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                      <MarkdownContent content={output.content_md} />
                    </div>
                  </div>
                );
              })}
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
                    {ref.notes ? <div className="text-xs text-muted-foreground">{ref.notes}</div> : null}
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
