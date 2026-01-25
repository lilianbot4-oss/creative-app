"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { projectSchema } from "@/lib/validators";
import { createProjectAction } from "@/app/(protected)/app/actions";
import type { Client } from "@/lib/types";

const schema = projectSchema;

type FormValues = z.input<typeof schema>;

export default function CreateProjectDialog({ clients }: { clients: Client[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      client_id: clients[0]?.id ?? "",
      status: "ideation",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await createProjectAction(values);
      toast.success("Project created");
      setOpen(false);
      form.reset();
      router.refresh();
    } catch {
      toast.error("Failed to create project");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">Create Project</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
        </DialogHeader>
        {clients.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Create a client first to start a project.
          </div>
        ) : (
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="project-name">Project name</Label>
              <Input id="project-name" {...form.register("name")} />
            </div>
            <div className="space-y-2">
              <Label>Client</Label>
              <Controller
                control={form.control}
                name="client_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <Button type="submit" className="w-full">
              Save project
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
