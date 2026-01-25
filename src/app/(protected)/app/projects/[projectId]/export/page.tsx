import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLatestBrief, getOutputs, getFeedback, getReferences, listConceptAssetsByProject } from "@/lib/data";
import { GENERATION_MODE_LABELS } from "@/lib/constants";
import { OUTPUT_TEMPLATE_LIST } from "@/lib/ai/templates";
import ExportControls from "@/components/project/export-controls";
import MarkdownContent from "@/components/markdown/markdown-content";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Client, Project } from "@/lib/types";
import { getPublicStorageUrl } from "@/lib/storage";

interface ExportPageProps {
  params: Promise<{ projectId: string }>;
  searchParams?:
    | Promise<{ refs?: string; feedback?: string; appendix?: string; provenance?: string; gallery?: string }>
    | { refs?: string; feedback?: string; appendix?: string; provenance?: string; gallery?: string };
}

export default async function ExportPage({ params, searchParams }: ExportPageProps) {
  const { projectId } = await params;
  const resolvedSearch = await Promise.resolve(searchParams);
  const includeReferences = resolvedSearch?.refs !== "false";
  const includeFeedback = resolvedSearch?.feedback !== "false";
  const includeAppendix = resolvedSearch?.appendix !== "false";
  const includeProvenance = resolvedSearch?.provenance === "true";
  const includeGallery = resolvedSearch?.gallery === "true";
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

  const [brief, outputs, feedback, references, conceptAssets] = await Promise.all([
    getLatestBrief(projectId),
    getOutputs(projectId),
    getFeedback(projectId),
    getReferences(projectId),
    listConceptAssetsByProject(projectId),
  ]);

  const primaryVisualByConcept = new Map(
    conceptAssets
      .filter((asset) => asset.asset_type === "key_visual" && asset.is_primary && asset.concept_id)
      .map((asset) => [asset.concept_id as string, asset])
  );

  const latestByMode = new Map<string, (typeof outputs)[number]>();
  outputs
    .slice()
    .sort((a, b) => b.version - a.version)
    .forEach((output) => {
      if (!latestByMode.has(output.mode)) {
        latestByMode.set(output.mode, output);
      }
    });

  const primaryOutput =
    outputs.find((output) => output.is_primary) ??
    latestByMode.get("one_pager") ??
    outputs[0] ??
    null;

  const appendixOutputs = includeAppendix
    ? OUTPUT_TEMPLATE_LIST.map((template) => latestByMode.get(template.mode)).filter(
        (output): output is (typeof outputs)[number] => {
          if (!output) return false;
          return output.id !== primaryOutput?.id;
        }
      )
    : [];

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
          <Link href={`/app/projects/${projectId}/pitch`}>Client pitch pack</Link>
        </Button>
      </div>
      <ExportControls />

      <div className="print-area space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Report</CardTitle>
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
            <CardTitle>Brief snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {brief?.parsed_summary ? (
              <pre className="whitespace-pre-wrap rounded-2xl bg-muted/50 p-4 text-xs">
                {JSON.stringify(brief.parsed_summary, null, 2)}
              </pre>
            ) : (
              <p className="text-muted-foreground">
                {brief?.raw_text ?? "No brief available."}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Primary output</CardTitle>
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
                  <p className="text-xs text-muted-foreground">Provenance: legacy output (origin unknown)</p>
                ) : null}
                <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                  <MarkdownContent content={primaryOutput.content_md} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {primaryVisualByConcept.size > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Primary key visuals</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {Array.from(primaryVisualByConcept.values()).map((asset) => (
                <div key={asset.id} className="overflow-hidden rounded-xl border border-border/60">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getPublicStorageUrl(asset.storage_bucket, asset.storage_path)}
                    alt="Primary key visual"
                    className="h-40 w-full object-cover"
                  />
                </div>
              ))}
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

        {appendixOutputs.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Appendix outputs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {appendixOutputs.map((output) => (
                <div key={output.id} className="space-y-2">
                  <h3 className="text-lg font-semibold">
                    {GENERATION_MODE_LABELS[output.mode]} (v{output.version})
                  </h3>
                  {includeProvenance ? (
                    <p className="text-xs text-muted-foreground">Provenance: legacy output (origin unknown)</p>
                  ) : null}
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
