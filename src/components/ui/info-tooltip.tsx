"use client";

import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function InfoTooltip({ label }: { label: string }) {
  const content = label?.trim();
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center text-muted-foreground transition hover:text-foreground"
            aria-label={content}
            title={content}
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs leading-snug">{content}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
