"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import MarkdownContent from "@/components/markdown/markdown-content";

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

export default function MarkdownViewer({
  content,
  filename = "output.md",
}: {
  content: string;
  filename?: string;
}) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied markdown");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleCopyPlain = async () => {
    try {
      await navigator.clipboard.writeText(stripMarkdown(content));
      toast.success("Copied plain text");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={handleCopy}>
          Copy markdown
        </Button>
        <Button variant="secondary" size="sm" onClick={handleCopyPlain}>
          Copy text
        </Button>
        <Button variant="secondary" size="sm" onClick={handleDownload}>
          Download .md
        </Button>
      </div>
      <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
        <MarkdownContent content={content} />
      </div>
    </div>
  );
}
