"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function ShareProjectButton({ projectId }: { projectId: string }) {
  const handleShare = async () => {
    try {
      const url = `${window.location.origin}/app/projects/${projectId}`;
      await navigator.clipboard.writeText(url);
      toast.success("Project link copied");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <Button variant="outline" onClick={handleShare}>
      Share
    </Button>
  );
}
