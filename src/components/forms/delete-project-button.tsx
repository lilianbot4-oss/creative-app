"use client";

import { useRouter } from "next/navigation";
import { deleteProjectAction } from "@/app/(protected)/app/actions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function DeleteProjectButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Delete this project? This will remove briefs, outputs, and feedback."
    );
    if (!confirmed) return;
    try {
      await deleteProjectAction(projectId);
      toast.success("Project deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete project");
    }
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleDelete}>
      Delete
    </Button>
  );
}
