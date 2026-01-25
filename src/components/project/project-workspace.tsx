"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { GENERATION_MODES, GENERATION_MODE_LABELS, PROJECT_STATUSES } from "@/lib/constants";
import { OUTPUT_TEMPLATE_LIST } from "@/lib/ai/templates";
import { createBriefAction, createFeedbackAction, updateProjectStatusAction } from "@/app/(protected)/app/actions";
import type { Brief, Client, Feedback, Output, Project, Reference } from "@/lib/types";
import ReferencesPanel from "@/components/project/references-panel";
import OutputsPanel from "@/components/project/outputs-panel";
import ShareProjectButton from "@/components/project/share-project-button";
import FeedbackRewritePanel from "@/components/project/feedback-rewrite-panel";
import CampaignGenerator from "@/components/project/campaign-generator";

const briefSchema = z.object({
  raw_text: z.string().min(1, "Brief is required"),
});

type BriefFormValues = z.infer<typeof briefSchema>;

type IdeaFormValues = {
  mode: (typeof GENERATION_MODES)[number];
  seedText: string;
  includeBrandVoice: boolean;
  includeReferences: boolean;
};

type FeedbackFormValues = {
  text: string;
  outputId: string | "general";
};

const feedbackFormSchema = z.object({
  text: z.string().min(1, "Feedback is required"),
  outputId: z.string(),
});

const ideaFormSchema = z.object({
  mode: z.enum(GENERATION_MODES),
  seedText: z.string(),
  includeBrandVoice: z.boolean(),
  includeReferences: z.boolean(),
});

const sampleBrief =
  "Launch a sustainable travel luggage line for remote workers. Target: digital nomads 25-40. Must include social-first launch, influencer kits, and a preorder waitlist. Budget mid-range. Timeline: 8 weeks.";
const sampleSeed = "Make packing feel like prepping for a new chapter, not a chore.";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "brief", label: "Brief" },
  { id: "ideas", label: "Ideas" },
  { id: "outputs", label: "Outputs" },
  { id: "feedback", label: "Feedback" },
  { id: "references", label: "References" },
  { id: "export", label: "Export" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

function stripMarkdown(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/#+\s?/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/^-\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default function ProjectWorkspace({
  project,
  client,
  brief,
  outputs,
  feedback,
  references,
  aiEnabled,
}: {
  project: Project & { client?: Client | null };
  client: Client | null;
  brief: Brief | null;
  outputs: Output[];
  feedback: Feedback[];
  references: Reference[];
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusValue, setStatusValue] = useState(project.status);

  const sectionParam = (searchParams.get("section") as SectionId | null) ?? "overview";
  const [section, setSection] = useState<SectionId>(sectionParam);

  useEffect(() => {
    setSection(sectionParam);
  }, [sectionParam]);

  const setSectionAndPush = useCallback(
    (next: SectionId) => {
      setSection(next);
      const params = new URLSearchParams(searchParams);
      params.set("section", next);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  const briefForm = useForm<BriefFormValues>({
    resolver: zodResolver(briefSchema),
    defaultValues: {
      raw_text: brief?.raw_text ?? "",
    },
  });

  const ideaForm = useForm<IdeaFormValues>({
    resolver: zodResolver(ideaFormSchema),
    defaultValues: {
      mode: "one_pager",
      seedText: "",
      includeBrandVoice: true,
      includeReferences: true,
    },
  });

  const feedbackForm = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      text: "",
      outputId: "general",
    },
  });

  useEffect(() => {
    briefForm.reset({ raw_text: brief?.raw_text ?? "" });
  }, [brief?.raw_text, briefForm]);

  useEffect(() => {
    setStatusValue(project.status);
  }, [project.status]);

  const latestByMode = useMemo(() => {
    const map = new Map<string, Output>();
    outputs
      .slice()
      .sort((a, b) => b.version - a.version)
      .forEach((output) => {
        if (!map.has(output.mode)) {
          map.set(output.mode, output);
        }
      });
    return map;
  }, [outputs]);

  const recentFeedback = feedback.slice(0, 3);
  const referencePreview = references.slice(0, 4);

  const handleSaveBrief = async (values: BriefFormValues) => {
    try {
      await createBriefAction({
        project_id: project.id,
        raw_text: values.raw_text,
      });
      toast.success("Brief saved");
      router.refresh();
    } catch {
      toast.error("Failed to save brief");
    }
  };

  const handleParseBrief = async () => {
    if (!brief?.id) {
      toast.error("Save a brief before parsing.");
      return;
    }

    try {
      const response = await fetch("/api/ai/parse-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ briefId: brief.id, rawText: brief.raw_text }),
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
        toast.error(data.error || "Failed to parse brief");
        return;
      }

      toast.success("Brief parsed");
      router.refresh();
    } catch {
      toast.error("Failed to parse brief");
    }
  };

  const generateOutput = useCallback(
    async (payload: {
      mode: (typeof GENERATION_MODES)[number];
      seedText?: string;
      includeBrandVoice: boolean;
      includeReferences: boolean;
      regenFromFeedback?: boolean;
    }) => {
      setIsGenerating(true);
      try {
        const response = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: project.id,
            mode: payload.mode,
            seedText: payload.seedText ?? "",
            includeBrandVoice: payload.includeBrandVoice,
            includeReferences: payload.includeReferences,
            regenFromFeedback: payload.regenFromFeedback ?? false,
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
          toast.error(data.error || "Generation failed");
          return;
        }

        toast.success(`Output generated (v${data.output?.version})`);
        setSectionAndPush("outputs");
        router.refresh();
      } catch {
        toast.error("Generation failed");
      } finally {
        setIsGenerating(false);
      }
    },
    [project.id, router, setSectionAndPush]
  );

  const handleIdeaSubmit = useCallback(async (values: IdeaFormValues) => {
    if (!brief) {
      toast.error("Add a brief before generating outputs.");
      return;
    }
    await generateOutput({
      mode: values.mode,
      seedText: values.seedText,
      includeBrandVoice: values.includeBrandVoice,
      includeReferences: values.includeReferences,
    });
  }, [brief, generateOutput]);

  const handleFeedbackSubmit = async (values: FeedbackFormValues) => {
    try {
      await createFeedbackAction({
        project_id: project.id,
        output_id: values.outputId === "general" ? null : values.outputId,
        text: values.text,
      });
      toast.success("Feedback added");
      feedbackForm.reset();
      router.refresh();
    } catch {
      toast.error("Failed to save feedback");
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      await updateProjectStatusAction({
        projectId: project.id,
        status: status as (typeof PROJECT_STATUSES)[number],
      });
      toast.success("Status updated");
    } catch {
      toast.error("Failed to update status");
    }
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        ideaForm.handleSubmit(handleIdeaSubmit)();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [ideaForm, handleIdeaSubmit]);

  const briefSnapshot = brief?.parsed_summary as Record<string, unknown> | null;
  const briefSummary = briefSnapshot
    ? JSON.stringify(briefSnapshot, null, 2)
    : brief?.raw_text ?? "No brief yet.";

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-6">
          <div>
            <h2 className="text-2xl font-semibold">{project.name}</h2>
            <p className="text-sm text-muted-foreground">
              {client ? (
                <Link className="underline-offset-4 hover:underline" href={`/app/clients/${client.id}`}>
                  {client.name}
                </Link>
              ) : (
                "Client"
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {!aiEnabled ? <Badge variant="destructive">AI Disabled</Badge> : null}
            <Select
              value={statusValue}
              onValueChange={(value) => {
                setStatusValue(value as (typeof PROJECT_STATUSES)[number]);
                handleStatusChange(value);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setSectionAndPush("ideas")} disabled={!aiEnabled}>
              Generate
            </Button>
            <Button variant="secondary" asChild>
              <Link href={`/app/projects/${project.id}/export`}>Export</Link>
            </Button>
            <ShareProjectButton projectId={project.id} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-2">
          {SECTIONS.map((item) => (
            <button
              key={item.id}
              className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                section === item.id
                  ? "border-primary bg-primary/10"
                  : "border-border/60 bg-background/60 hover:bg-muted/40"
              }`}
              onClick={() => setSectionAndPush(item.id)}
            >
              {item.label}
            </button>
          ))}
        </aside>

        <div className="space-y-6">
          {section === "overview" ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Brief snapshot</CardTitle>
                </CardHeader>
                <CardContent>
                  {briefSnapshot ? (
                    <pre className="whitespace-pre-wrap rounded-2xl bg-muted/50 p-4 text-xs">
                      {JSON.stringify(briefSnapshot, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-sm text-muted-foreground">{briefSummary}</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Campaign generator</CardTitle>
                </CardHeader>
                <CardContent>
                  <CampaignGenerator
                    projectId={project.id}
                    aiEnabled={aiEnabled}
                    seedText={ideaForm.watch("seedText")}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Latest outputs</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  {OUTPUT_TEMPLATE_LIST.map((template) => {
                    const latest = latestByMode.get(template.mode);
                    if (!latest) return null;
                    const preview = stripMarkdown(latest.content_md).slice(0, 160);
                    return (
                      <div key={template.mode} className="rounded-2xl border border-border/60 bg-background/70 p-4">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{template.label}</p>
                          <Badge variant="outline">v{latest.version}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{preview}...</p>
                      </div>
                    );
                  })}
                  {outputs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No outputs yet.</p>
                  ) : null}
                </CardContent>
              </Card>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent feedback</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {recentFeedback.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No feedback yet.</p>
                    ) : (
                      recentFeedback.map((item) => (
                        <div key={item.id} className="rounded-xl border border-border/60 p-3 text-sm">
                          {item.text}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>References preview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {referencePreview.length === 0 ? (
                      <p className="text-muted-foreground">No references yet.</p>
                    ) : (
                      referencePreview.map((ref) => (
                        <div key={ref.id} className="rounded-xl border border-border/60 p-2">
                          {ref.url ?? ref.storage_path}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-6">
                  <div>
                    <p className="text-sm font-medium">Generate deliverables</p>
                    <p className="text-xs text-muted-foreground">
                      Jump into the Idea Composer and start generating outputs.
                    </p>
                  </div>
                  <Button onClick={() => setSectionAndPush("ideas")} disabled={!aiEnabled}>
                    Generate deliverables
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {section === "brief" ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Brief ingestion</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form
                    className="space-y-4"
                    onSubmit={briefForm.handleSubmit(handleSaveBrief)}
                  >
                    <Textarea
                      rows={8}
                      placeholder="Paste your brief here..."
                      {...briefForm.register("raw_text")}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button type="submit">Save brief</Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleParseBrief}
                        disabled={!brief}
                      >
                        Parse Brief (AI)
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => briefForm.setValue("raw_text", sampleBrief)}
                      >
                        Use sample brief
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Brief snapshot</CardTitle>
                </CardHeader>
                <CardContent>
                  {briefSnapshot ? (
                    <pre className="whitespace-pre-wrap rounded-2xl bg-muted/50 p-4 text-xs">
                      {JSON.stringify(briefSnapshot, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No parsed snapshot yet. Run the AI parser for a quick summary.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}

          {section === "ideas" ? (
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle>Idea composer</CardTitle>
                  {!aiEnabled ? <Badge variant="destructive">AI Disabled</Badge> : null}
                </div>
              </CardHeader>
              <CardContent>
                {!brief ? (
                  <p className="text-sm text-muted-foreground">
                    Add a brief before generating campaign outputs.
                  </p>
                ) : (
                  <form
                    className="space-y-4"
                    onSubmit={ideaForm.handleSubmit(handleIdeaSubmit)}
                  >
                    <div className="space-y-2">
                      <Label>Generation mode</Label>
                      <Select
                        value={ideaForm.watch("mode")}
                        onValueChange={(value) =>
                          ideaForm.setValue("mode", value as IdeaFormValues["mode"])
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        <SelectContent>
                          {OUTPUT_TEMPLATE_LIST.map((template) => (
                            <SelectItem key={template.mode} value={template.mode}>
                              {template.label} — {template.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Idea seed (optional)</Label>
                      <Textarea
                        rows={4}
                        placeholder="Drop a starting angle, hook, or insight..."
                        {...ideaForm.register("seedText")}
                      />
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={ideaForm.watch("includeBrandVoice")}
                          onChange={(event) =>
                            ideaForm.setValue(
                              "includeBrandVoice",
                              event.target.checked
                            )
                          }
                        />
                        Include brand voice
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={ideaForm.watch("includeReferences")}
                          onChange={(event) =>
                            ideaForm.setValue(
                              "includeReferences",
                              event.target.checked
                            )
                          }
                        />
                        Include references
                      </label>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="submit" disabled={isGenerating || !aiEnabled}>
                        {isGenerating ? "Generating..." : "Generate"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => ideaForm.setValue("seedText", sampleSeed)}
                      >
                        Use sample seed
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        Tip: Press Cmd/Ctrl + Enter to generate.
                      </span>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          ) : null}

          {section === "outputs" ? (
            <div className="space-y-6">
              <FeedbackRewritePanel projectId={project.id} feedback={feedback} />
              <OutputsPanel outputs={outputs} projectId={project.id} />
            </div>
          ) : null}

          {section === "feedback" ? (
            <Card>
              <CardHeader>
                <CardTitle>Feedback</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form
                  className="space-y-4"
                  onSubmit={feedbackForm.handleSubmit(handleFeedbackSubmit)}
                >
                  <div className="space-y-2">
                    <Label>Attach to output (optional)</Label>
                    <Select
                      value={feedbackForm.watch("outputId")}
                      onValueChange={(value) =>
                        feedbackForm.setValue("outputId", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select output" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        {outputs.map((output) => (
                          <SelectItem key={output.id} value={output.id}>
                            {GENERATION_MODE_LABELS[output.mode]} v{output.version}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Feedback</Label>
                    <Textarea rows={4} {...feedbackForm.register("text")} />
                  </div>
                  <Button type="submit">Add feedback</Button>
                </form>

                <div className="space-y-2">
                  {feedback.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No feedback yet.
                    </p>
                  ) : (
                    feedback.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-border/60 bg-background/70 px-4 py-3 text-sm"
                      >
                        <p>{item.text}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {section === "references" ? (
            <ReferencesPanel projectId={project.id} references={references} />
          ) : null}

          {section === "export" ? (
            <Card>
              <CardHeader>
                <CardTitle>Export report</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Generate a clean export view with the latest brief snapshot,
                  outputs, feedback, and references.
                </p>
                <Button asChild>
                  <Link href={`/app/projects/${project.id}/export`}>
                    Generate export view
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
