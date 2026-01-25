"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { brandVoiceSchema } from "@/lib/validators";
import { updateBrandVoiceAction } from "@/app/(protected)/app/actions";
import type { BrandVoice } from "@/lib/types";

const schema = brandVoiceSchema;

type FormValues = z.infer<typeof schema>;

export default function BrandVoiceForm({
  clientId,
  brandVoice,
}: {
  clientId: string;
  brandVoice: BrandVoice | null;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tone: brandVoice?.tone ?? "",
      audience: brandVoice?.audience ?? "",
      do: brandVoice?.do ?? "",
      dont: brandVoice?.dont ?? "",
      style_guidelines: brandVoice?.style_guidelines ?? "",
      banned_words: brandVoice?.banned_words ?? "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await updateBrandVoiceAction({
        clientId,
        brandVoice: values,
      });
      toast.success("Brand voice updated");
    } catch {
      toast.error("Failed to update brand voice");
    }
  };

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <Label htmlFor="tone">Tone</Label>
        <Textarea id="tone" rows={2} {...form.register("tone")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="audience">Audience</Label>
        <Textarea id="audience" rows={2} {...form.register("audience")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="do">Voice Guidelines: Do</Label>
        <Textarea id="do" rows={2} {...form.register("do")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="dont">Voice Guidelines: Avoid</Label>
        <Textarea id="dont" rows={2} {...form.register("dont")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="style_guidelines">Style guidelines</Label>
        <Textarea
          id="style_guidelines"
          rows={2}
          {...form.register("style_guidelines")}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="banned_words">Banned words</Label>
        <Textarea id="banned_words" rows={2} {...form.register("banned_words")} />
      </div>
      <Button type="submit">Save voice</Button>
    </form>
  );
}
