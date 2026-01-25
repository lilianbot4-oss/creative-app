"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { clientSchema } from "@/lib/validators";
import { updateClientAction } from "@/app/(protected)/app/actions";
import type { Client } from "@/lib/types";

const schema = clientSchema;

type FormValues = z.infer<typeof schema>;

export default function ClientDetailsForm({ client }: { client: Client }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: client.name,
      industry: client.industry ?? "",
      notes: client.notes ?? "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await updateClientAction({
        id: client.id,
        name: values.name,
        industry: values.industry ?? null,
        notes: values.notes ?? null,
      });
      toast.success("Client updated");
    } catch {
      toast.error("Failed to update client");
    }
  };

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <Label htmlFor="client-name">Name</Label>
        <Input id="client-name" {...form.register("name")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="client-industry">Industry</Label>
        <Input id="client-industry" {...form.register("industry")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="client-notes">Notes</Label>
        <Textarea id="client-notes" rows={4} {...form.register("notes")} />
      </div>
      <Button type="submit">Save changes</Button>
    </form>
  );
}
