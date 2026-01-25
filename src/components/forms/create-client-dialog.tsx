"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { clientSchema } from "@/lib/validators";
import { createClientAction } from "@/app/(protected)/app/actions";

const schema = clientSchema;

type FormValues = z.infer<typeof schema>;

export default function CreateClientDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      industry: "",
      notes: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await createClientAction(values);
      toast.success("Client created");
      setOpen(false);
      form.reset();
      router.refresh();
    } catch {
      toast.error("Failed to create client");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Client</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New client</DialogTitle>
        </DialogHeader>
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
          <Button type="submit" className="w-full">
            Save client
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
