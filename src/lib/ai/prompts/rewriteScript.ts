import type { CreativeSpec } from "@/lib/types";
import { buildGuardrails } from "@/lib/ai/guardrails";

export function buildRewriteScriptPrompt(options: {
  spec: CreativeSpec;
  script: string;
  feedback?: string | null;
  rewriteGoal?: string | null;
}) {
  const guardrails = buildGuardrails(options.spec);
  const systemPrompt =
    "You are a senior social creative writer. Rewrite scripts based on feedback while preserving structure.";

  const userPrompt = [
    "Rewrite the script below. Keep the same markdown headings and order:",
    "# Hook",
    "# Beats",
    "# Dialogue",
    "# On-screen text",
    "# Camera notes",
    "# Sound/music",
    "# Product moment",
    "# CTA",
    options.rewriteGoal ? `Rewrite goal: ${options.rewriteGoal}` : null,
    options.feedback ? `Feedback to address: ${options.feedback}` : null,
    guardrails ? "Constraints:" : null,
    guardrails,
    "Original script:",
    options.script,
  ]
    .filter(Boolean)
    .join("\n\n");

  return { systemPrompt, userPrompt };
}
