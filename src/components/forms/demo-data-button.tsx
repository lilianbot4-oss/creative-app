"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createDemoDataAction } from "@/app/(protected)/app/actions";

export default function DemoDataButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleClick = async () => {
    try {
      setLoading(true);
      await createDemoDataAction();
      toast.success("Demo data created");
      router.refresh();
    } catch {
      toast.error("Failed to create demo data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleClick} disabled={loading}>
      {loading ? "Seeding..." : "Create demo data"}
    </Button>
  );
}
