"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { Reference } from "@/lib/types";

const urlSchema = z.object({
  url: z.string().url("Enter a valid URL"),
  notes: z.string().optional(),
});

type UrlFormValues = z.infer<typeof urlSchema>;

export default function ReferencesPanel({
  projectId,
  references,
  aiEnabled,
  imageModel,
}: {
  projectId: string;
  references: Reference[];
  aiEnabled: boolean;
  imageModel: string | null;
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [prompt, setPrompt] = useState("");
  const urlForm = useForm<UrlFormValues>({
    resolver: zodResolver(urlSchema),
    defaultValues: {
      url: "",
      notes: "",
    },
  });

  const handleAddUrl = async (values: UrlFormValues) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Not authenticated");
      return;
    }

    const { error } = await supabase.from("references").insert({
      user_id: user.id,
      project_id: projectId,
      type: "url",
      url: values.url,
      notes: values.notes ?? null,
    });

    if (error) {
      toast.error("Failed to add reference");
      return;
    }

    urlForm.reset();
    toast.success("Reference added");
    router.refresh();
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Not authenticated");
      setUploading(false);
      return;
    }

    const path = `${user.id}/${projectId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase
      .storage
      .from("references")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error("Upload failed");
      setUploading(false);
      return;
    }

    const { error } = await supabase.from("references").insert({
      user_id: user.id,
      project_id: projectId,
      type: "image",
      storage_path: path,
    });

    if (error) {
      toast.error("Failed to save reference");
      setUploading(false);
      return;
    }

    toast.success("Image uploaded");
    setUploading(false);
    event.target.value = "";
    router.refresh();
  };

  const supabase = createClient();
  const imageEnabled = Boolean(imageModel) && aiEnabled;

  const handleGenerateMoodboard = async () => {
    if (!aiEnabled) {
      toast.error("AI disabled: add OPENAI_API_KEY to .env.local and restart.");
      return;
    }
    if (!imageModel) {
      toast.error("Image model not configured. Choose one in AI Models settings.");
      return;
    }
    if (!prompt.trim()) {
      toast.error("Add a prompt to generate images.");
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch("/api/ai/generate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          prompt: prompt.trim(),
          n: 4,
          size: "1024x1024",
          style: "moodboard",
        }),
      });
      const data = await response.json();
      if (response.status === 400 && data?.error === "Missing OPENAI_API_KEY") {
        toast.error("AI disabled: add OPENAI_API_KEY to .env.local and restart.");
        return;
      }
      if (response.status === 400 && data?.error === "Image model not configured") {
        toast.error("Image model not configured. Choose one in AI Models settings.");
        return;
      }
      if (response.status === 429) {
        toast.error(data?.error || "Daily AI limit reached. Try again tomorrow.");
        return;
      }
      if (!response.ok) {
        toast.error(data?.error || "Failed to generate images");
        return;
      }

      toast.success("Images generated");
      setPrompt("");
      router.refresh();
    } catch {
      toast.error("Failed to generate images");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Add references</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>AI Moodboard — Generate visual inspiration</Label>
            <Textarea
              rows={3}
              placeholder="Describe the visual direction you want to explore..."
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={handleGenerateMoodboard}
                disabled={!imageEnabled || generating}
              >
                {generating ? "Generating..." : "Generate 4 images"}
              </Button>
              <p className="text-xs text-muted-foreground">
                {imageEnabled
                  ? `Using ${imageModel}.`
                  : "Image model not configured in AI Models settings."}
              </p>
            </div>
          </div>
          <form className="space-y-3" onSubmit={urlForm.handleSubmit(handleAddUrl)}>
            <div className="space-y-2">
              <Label>External Reference — Add links to existing inspiration</Label>
              <Input placeholder="https://" {...urlForm.register("url")} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea rows={2} {...urlForm.register("notes")} />
            </div>
            <Button type="submit">Add link</Button>
          </form>

          <div className="space-y-2">
            <Label>Upload image</Label>
            <Input type="file" accept="image/*" onChange={handleImageUpload} />
            <p className="text-xs text-muted-foreground">
              Uploads to the Supabase storage bucket named &quot;references&quot;.
            </p>
            {uploading ? (
              <p className="text-xs text-muted-foreground">Uploading...</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reference library</CardTitle>
        </CardHeader>
        <CardContent>
          {references.length === 0 ? (
            <p className="text-sm text-muted-foreground">No references yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {references.map((ref) => {
                if (ref.type === "image" && ref.storage_path) {
                  const publicUrl = supabase.storage
                    .from("references")
                    .getPublicUrl(ref.storage_path).data.publicUrl;
                  return (
                    <div
                      key={ref.id}
                      className="overflow-hidden rounded-2xl border border-border/60 bg-background/70"
                    >
                      <div className="relative h-40">
                        <Image
                          src={publicUrl}
                          alt={ref.notes ?? "Reference"}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 50vw"
                        />
                      </div>
                      <div className="p-3 text-xs text-muted-foreground">
                        {ref.notes ?? ref.storage_path}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={ref.id}
                    className="rounded-2xl border border-border/60 bg-background/70 p-3 text-sm"
                  >
                    <a
                      href={ref.url ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-primary underline-offset-4 hover:underline"
                    >
                      {ref.url}
                    </a>
                    {ref.notes ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {ref.notes}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
