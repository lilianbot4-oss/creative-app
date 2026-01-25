import { notFound } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { createClient } from "@/lib/supabase/server";
import { getLatestBrief, getOutputs, getFeedback, getReferences } from "@/lib/data";
import { GENERATION_MODE_LABELS, GENERATION_MODES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import PrintButton from "@/components/app/print-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ExportPageProps {
  params: { projectId: string };
}

export default async function ExportPage({ params }: ExportPageProps) {
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("*, client:clients(*)")
    .eq("id", params.projectId)
    .maybeSingle();

  if (!project) {
    notFound();
  }

  const [brief, outputs, feedback, references] = await Promise.all([
    getLatestBrief(params.projectId),
    getOutputs(params.projectId),
    getFeedback(params.projectId),
    getReferences(params.projectId),
  ]);

  const latestByMode = new Map<string, (typeof outputs)[number]>();
  outputs
    .slice()
    .sort((a, b) => b.version - a.version)
    .forEach((output) => {
      if (!latestByMode.has(output.mode)) {
        latestByMode.set(output.mode, output);
      }
    });

  const outputsToShow = GENERATION_MODES.map((mode) =>
    latestByMode.get(mode)
  ).filter((output): output is (typeof outputs)[number] => Boolean(output));

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-semibold">Export view</h2>
          <p className="text-sm text-muted-foreground">
            Print or save this page as a PDF for your client.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary">
            <Link href={`/app/projects/${params.projectId}`}>Back</Link>
          </Button>
          <PrintButton />
        </div>
      </div>

      <div className="print-area space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Project overview</CardTitle>
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
            <CardTitle>Latest outputs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {outputsToShow.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No outputs yet.
              </p>
            ) : (
              outputsToShow.map((output) => (
                <div key={output.id} className="space-y-2">
                  <h3 className="text-lg font-semibold">
                    {GENERATION_MODE_LABELS[output.mode]} (v{output.version})
                  </h3>
                  <div className="markdown rounded-2xl border border-border/60 bg-background/70 p-4">
                    <ReactMarkdown>{output.content_md}</ReactMarkdown>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

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
      </div>
    </div>
  );
}
