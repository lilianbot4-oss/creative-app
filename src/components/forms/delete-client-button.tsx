"use client";

import { useRouter } from "next/navigation";
import { deleteClientAction } from "@/app/(protected)/app/actions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function DeleteClientButton({ clientId }: { clientId: string }) {
  const router = useRouter();
  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Delete this client? This will remove related projects as well."
    );
    if (!confirmed) return;
    try {
      await deleteClientAction(clientId);
      toast.success("Client deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete client");
    }
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleDelete}>
      Delete
    </Button>
  );
}
