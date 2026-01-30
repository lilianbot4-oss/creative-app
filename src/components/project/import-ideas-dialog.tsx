"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { batchCreateConceptsAction } from "@/app/(protected)/app/actions";
import { extractTextFromPdf } from "@/lib/briefParsing/clientExtract";

type ParsedIdea = {
  title: string;
  description: string;
  original_text: string;
  selected: boolean;
};

type Step = "input" | "parsing" | "preview" | "saving";

export default function ImportIdeasDialog({
  projectId,
  aiEnabled,
}: {
  projectId: string;
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("input");
  const [rawText, setRawText] = useState("");
  const [pdfFilename, setPdfFilename] = useState("");
  const [ideas, setIdeas] = useState<ParsedIdea[]>([]);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const reset = () => {
    setStep("input");
    setRawText("");
    setPdfFilename("");
    setIdeas([]);
    setExpandedIdx(null);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) reset();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are supported");
      return;
    }
    try {
      const result = await extractTextFromPdf(file);
      setRawText(result.text);
      setPdfFilename(file.name);
    } catch {
      toast.error("Failed to extract text from PDF");
    }
  };

  const handleParse = async () => {
    if (!rawText.trim()) {
      toast.error("No text to parse");
      return;
    }
    setStep("parsing");
    try {
      const response = await fetch("/api/ai/parse-import-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, rawText: rawText.trim() }),
      });
      const data = await response.json();
      if (response.status === 429) {
        toast.error(
          data?.error || "Daily AI limit reached. Try again tomorrow."
        );
        setStep("input");
        return;
      }
      if (!response.ok) {
        toast.error(data?.error || "Failed to parse ideas");
        setStep("input");
        return;
      }
      const parsed: ParsedIdea[] = (data.ideas ?? []).map(
        (idea: { title: string; description?: string; original_text?: string }) => ({
          ...idea,
          description: idea.description ?? "",
          original_text: idea.original_text ?? "",
          selected: true,
        })
      );
      if (parsed.length === 0) {
        toast.error("No ideas found in the text");
        setStep("input");
        return;
      }
      setIdeas(parsed);
      setStep("preview");
    } catch {
      toast.error("Failed to parse ideas");
      setStep("input");
    }
  };

  const toggleIdea = (index: number) => {
    setIdeas((prev) =>
      prev.map((idea, i) =>
        i === index ? { ...idea, selected: !idea.selected } : idea
      )
    );
  };

  const toggleAll = () => {
    const allSelected = ideas.every((idea) => idea.selected);
    setIdeas((prev) => prev.map((idea) => ({ ...idea, selected: !allSelected })));
  };

  const selectedCount = ideas.filter((idea) => idea.selected).length;

  const handleImport = async () => {
    const selected = ideas.filter((idea) => idea.selected);
    if (selected.length === 0) {
      toast.error("Select at least one idea to import");
      return;
    }
    setStep("saving");
    try {
      await batchCreateConceptsAction({
        project_id: projectId,
        concepts: selected.map((idea) => ({
          title: idea.title,
          thesis: idea.description || null,
          seed_text: idea.original_text || idea.description || null,
          origin_type: "human" as const,
        })),
      });
      toast.success(`Imported ${selected.length} idea${selected.length === 1 ? "" : "s"}`);
      handleOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Failed to import ideas");
      setStep("preview");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary" disabled={!aiEnabled}>
          Import ideas
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === "input" && "Import ideas"}
            {step === "parsing" && "Parsing ideas..."}
            {step === "preview" && `Review ideas (${ideas.length} found)`}
            {step === "saving" && "Importing..."}
          </DialogTitle>
        </DialogHeader>

        {step === "input" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload a PDF or paste text containing your ideas. The AI will
              split them into individual concepts you can review before
              importing.
            </p>
            <Tabs defaultValue="pdf">
              <TabsList>
                <TabsTrigger value="pdf">Upload PDF</TabsTrigger>
                <TabsTrigger value="paste">Paste text</TabsTrigger>
              </TabsList>
              <TabsContent value="pdf" className="space-y-3 pt-3">
                <div
                  className="cursor-pointer rounded-xl border-2 border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/30"
                  onClick={() => fileRef.current?.click()}
                >
                  {pdfFilename ? (
                    <p>
                      <span className="font-medium text-foreground">
                        {pdfFilename}
                      </span>{" "}
                      loaded. Click to change.
                    </p>
                  ) : (
                    <p>Click to upload a PDF with your ideas</p>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
                {pdfFilename && rawText && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Extracted text preview
                    </p>
                    <div className="max-h-40 overflow-auto rounded-lg border border-border/60 bg-muted/20 p-3 text-xs">
                      {rawText.slice(0, 1000)}
                      {rawText.length > 1000 && "..."}
                    </div>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="paste" className="space-y-3 pt-3">
                <Textarea
                  rows={10}
                  placeholder="Paste your ideas here. Numbered lists, titled sections, or plain paragraphs all work."
                  value={rawText}
                  onChange={(event) => setRawText(event.target.value)}
                />
              </TabsContent>
            </Tabs>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleParse}
                disabled={!rawText.trim()}
              >
                Parse ideas
              </Button>
            </div>
          </div>
        )}

        {step === "parsing" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            <p className="text-sm text-muted-foreground">
              Splitting text into individual ideas...
            </p>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                className="text-xs text-muted-foreground underline hover:text-foreground"
                onClick={toggleAll}
              >
                {ideas.every((idea) => idea.selected)
                  ? "Deselect all"
                  : "Select all"}
              </button>
              <span className="text-xs text-muted-foreground">
                {selectedCount} of {ideas.length} selected
              </span>
            </div>
            <div className="max-h-96 space-y-2 overflow-auto">
              {ideas.map((idea, index) => (
                <div
                  key={index}
                  className={`rounded-lg border p-3 transition-colors ${
                    idea.selected
                      ? "border-primary/30 bg-primary/5"
                      : "border-border/60 bg-muted/10 opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={idea.selected}
                      onChange={() => toggleIdea(index)}
                      className="mt-1 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{idea.title}</p>
                      {idea.description && (
                        <div className="mt-1">
                          <p className="text-sm text-muted-foreground">
                            {expandedIdx === index
                              ? idea.description
                              : idea.description.slice(0, 200)}
                            {idea.description.length > 200 &&
                              expandedIdx !== index &&
                              "..."}
                          </p>
                          {idea.description.length > 200 && (
                            <button
                              type="button"
                              className="mt-1 text-xs text-primary hover:underline"
                              onClick={() =>
                                setExpandedIdx(
                                  expandedIdx === index ? null : index
                                )
                              }
                            >
                              {expandedIdx === index
                                ? "Show less"
                                : "Show more"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between gap-2">
              <Button variant="ghost" onClick={() => setStep("input")}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={selectedCount === 0}>
                Import {selectedCount} idea{selectedCount === 1 ? "" : "s"}
              </Button>
            </div>
          </div>
        )}

        {step === "saving" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            <p className="text-sm text-muted-foreground">
              Importing ideas...
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
