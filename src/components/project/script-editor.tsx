"use client";

import MarkdownViewer from "@/components/markdown/markdown-viewer";
import type { Script } from "@/lib/types";

export default function ScriptEditor({ script }: { script: Script }) {
  return (
    <MarkdownViewer
      content={script.script_md}
      filename={`${script.format}-v${script.version}.md`}
    />
  );
}
