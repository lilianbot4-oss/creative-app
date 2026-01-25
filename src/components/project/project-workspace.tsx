"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { GENERATION_MODES, GENERATION_MODE_LABELS, PROJECT_STATUSES } from "@/lib/constants";
import { createBriefAction, createFeedbackAction, updateProjectStatusAction } from "@/app/(protected)/app/actions";
import type { Brief, Client, Feedback, Output, Project, Reference } from "@/lib/types";
import ReferencesPanel from "@/components/project/references-panel";

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

export default function ProjectWorkspace({
  project,
  client,
  brief,
  outputs,
  feedback,
  references,
}: {
  project: Project & { client?: Client | null };
  client: Client | null;
  brief: Brief | null;
  outputs: Output[];
  feedback: Feedback[];
  references: Reference[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState("brief");
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusValue, setStatusValue] = useState(project.status);

  const briefForm = useForm<BriefFormValues>({
    resolver: zodResolver(briefSchema),
    defaultValues: {
      raw_text: brief?.raw_text ?? "",
    },
  });

  const ideaForm = useForm<IdeaFormValues>({
    resolver: zodResolver(ideaFormSchema),
    defaultValues: {
      mode: "expand",
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

  const outputsById = useMemo(
    () => Object.fromEntries(outputs.map((output) => [output.id, output])),
    [outputs]
  );

  const selectedOutputId =
    outputs.length > 0 ? outputs[0].id : undefined;
  const [activeOutputId, setActiveOutputId] = useState<string | undefined>(
    selectedOutputId
  );

  useEffect(() => {
    setActiveOutputId(selectedOutputId);
  }, [selectedOutputId]);

  useEffect(() => {
    briefForm.reset({ raw_text: brief?.raw_text ?? "" });
  }, [brief?.raw_text, briefForm]);

  useEffect(() => {
    setStatusValue(project.status);
  }, [project.status]);

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
        if (!response.ok) {
          toast.error(data.error || "Generation failed");
          return;
        }

        toast.success(`Output generated (v${data.output?.version})`);
        setTab("outputs");
        router.refresh();
      } catch {
        toast.error("Generation failed");
      } finally {
        setIsGenerating(false);
      }
    },
    [project.id, router]
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

  const handleRegenerateFromFeedback = async () => {
    if (!activeOutputId) {
      toast.error("Select an output first");
      return;
    }
    const selectedOutput = outputsById[activeOutputId];
    if (!selectedOutput) return;
    if (feedback.length === 0) {
      toast.error("Add feedback before regenerating");
      return;
    }
    await generateOutput({
      mode: selectedOutput.mode,
      includeBrandVoice: true,
      includeReferences: true,
      regenFromFeedback: true,
    });
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{project.name}</h2>
          <p className="text-sm text-muted-foreground">
            {client?.name ?? "Client"} · Last update {new Date(project.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
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
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="brief">Brief</TabsTrigger>
          <TabsTrigger value="idea">Idea Composer</TabsTrigger>
          <TabsTrigger value="outputs">Outputs</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="references">References</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        <TabsContent value="brief" className="space-y-4">
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
        </TabsContent>

        <TabsContent value="idea" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Idea composer</CardTitle>
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
                        {GENERATION_MODES.map((mode) => (
                          <SelectItem key={mode} value={mode}>
                            {GENERATION_MODE_LABELS[mode]}
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
                    <Button type="submit" disabled={isGenerating}>
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
        </TabsContent>

        <TabsContent value="outputs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Outputs</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[280px_1fr]">
              <div className="space-y-2">
                {outputs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No outputs yet. Generate one from the Idea Composer.
                  </p>
                ) : (
                  outputs.map((output) => (
                    <button
                      key={output.id}
                      className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                        activeOutputId === output.id
                          ? "border-primary bg-primary/10"
                          : "border-border/60 bg-background/60 hover:bg-muted/40"
                      }`}
                      onClick={() => setActiveOutputId(output.id)}
                    >
                      <div className="font-medium">
                        {GENERATION_MODE_LABELS[output.mode]} v{output.version}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(output.created_at).toLocaleString()}
                      </div>
                    </button>
                  ))
                )}
              </div>
              <div className="space-y-3">
                {activeOutputId && outputsById[activeOutputId] ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {GENERATION_MODE_LABELS[outputsById[activeOutputId].mode]} · Version {outputsById[activeOutputId].version}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => setTab("feedback")}
                        >
                          Add feedback
                        </Button>
                        <Button
                          onClick={handleRegenerateFromFeedback}
                          disabled={isGenerating || feedback.length === 0}
                        >
                          Regenerate from feedback
                        </Button>
                      </div>
                    </div>
                    <div className="markdown rounded-2xl border border-border/60 bg-background/80 p-4">
                      <ReactMarkdown>
                        {outputsById[activeOutputId].content_md}
                      </ReactMarkdown>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select an output to preview.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-4">
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
        </TabsContent>

        <TabsContent value="references" className="space-y-4">
          <ReferencesPanel projectId={project.id} references={references} />
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
