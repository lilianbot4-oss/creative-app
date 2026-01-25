"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App route error", error);
  }, [error]);

  return (
    <div className="space-y-4 rounded-3xl border border-border/60 bg-card/70 p-8">
      <h2 className="text-2xl font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground">
        We hit an unexpected error. You can try again or return to the dashboard.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => reset()}>Try again</Button>
        <Button variant="secondary" onClick={() => (window.location.href = "/app")}>
          Back to dashboard
        </Button>
      </div>
    </div>
  );
}
