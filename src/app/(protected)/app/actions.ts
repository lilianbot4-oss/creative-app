"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  brandVoiceSchema,
  briefSchema,
  clientSchema,
  feedbackSchema,
  projectSchema,
} from "@/lib/validators";
import { PROJECT_STATUSES } from "@/lib/constants";

export async function createClientAction(input: {
  name: string;
  industry?: string | null;
  notes?: string | null;
}) {
  const data = clientSchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated");

  const { error } = await supabase.from("clients").insert({
    user_id: user.id,
    name: data.name,
    industry: data.industry ?? null,
    notes: data.notes ?? null,
  });

  if (error) throw error;
  revalidatePath("/app");
  revalidatePath("/app/clients");
}

export async function updateClientAction(input: {
  id: string;
  name: string;
  industry?: string | null;
  notes?: string | null;
}) {
  const updateSchema = clientSchema.extend({ id: z.string().uuid() });
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid client data");
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({
      name: input.name,
      industry: input.industry ?? null,
      notes: input.notes ?? null,
    })
    .eq("id", input.id);
  if (error) throw error;
  revalidatePath("/app/clients");
  revalidatePath(`/app/clients/${input.id}`);
}

export async function deleteClientAction(clientId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("clients").delete().eq("id", clientId);
  if (error) throw error;
  revalidatePath("/app/clients");
  revalidatePath("/app");
}

export async function updateBrandVoiceAction(input: {
  clientId: string;
  brandVoice: Record<string, string | null | undefined>;
}) {
  const supabase = await createClient();
  const parsed = brandVoiceSchema.parse(input.brandVoice);
  const { error } = await supabase
    .from("clients")
    .update({ brand_voice: parsed })
    .eq("id", input.clientId);
  if (error) throw error;
  revalidatePath(`/app/clients/${input.clientId}`);
}

export async function createProjectAction(input: {
  name: string;
  client_id: string;
  status?: (typeof PROJECT_STATUSES)[number];
}) {
  const data = projectSchema.parse({
    name: input.name,
    client_id: input.client_id,
    status: input.status ?? "ideation",
  });
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated");

  const { error } = await supabase.from("projects").insert({
    user_id: user.id,
    client_id: data.client_id,
    name: data.name,
    status: data.status,
  });

  if (error) throw error;
  revalidatePath("/app");
  revalidatePath("/app/projects");
}

export async function updateProjectStatusAction(input: {
  projectId: string;
  status: (typeof PROJECT_STATUSES)[number];
}) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({ status: input.status })
    .eq("id", input.projectId);
  if (error) throw error;
  revalidatePath(`/app/projects/${input.projectId}`);
  revalidatePath("/app/projects");
}

export async function deleteProjectAction(projectId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) throw error;
  revalidatePath("/app/projects");
  revalidatePath("/app");
}

export async function createBriefAction(input: {
  project_id: string;
  raw_text: string;
}) {
  const data = briefSchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated");

  const { error } = await supabase.from("briefs").insert({
    user_id: user.id,
    project_id: data.project_id,
    raw_text: data.raw_text,
  });

  if (error) throw error;
  revalidatePath(`/app/projects/${data.project_id}`);
}

export async function createFeedbackAction(input: {
  project_id: string;
  output_id?: string | null;
  text: string;
}) {
  const data = feedbackSchema.parse({
    project_id: input.project_id,
    output_id: input.output_id ?? null,
    text: input.text,
  });
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated");

  const { error } = await supabase.from("feedback").insert({
    user_id: user.id,
    project_id: data.project_id,
    output_id: data.output_id ?? null,
    text: data.text,
  });

  if (error) throw error;
  revalidatePath(`/app/projects/${data.project_id}`);
}

export async function createDemoDataAction() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated");

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert({
      user_id: user.id,
      name: "Trailhead Coffee",
      industry: "Specialty Coffee",
      notes: "Local brand launching canned cold brew.",
      brand_voice: {
        tone: "Warm, adventurous, optimistic",
        audience: "25-40 urban professionals",
        do: "Use sensory language; highlight origin stories",
        dont: "Avoid jargon or elitist language",
        style_guidelines: "Short punchy sentences; use playful verbs",
        banned_words: "cheap, generic",
      },
    })
    .select()
    .maybeSingle();

  if (clientError || !client) throw clientError;

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      client_id: client.id,
      name: "Cold Brew Launch",
      status: "ideation",
    })
    .select()
    .maybeSingle();

  if (projectError || !project) throw projectError;

  await supabase.from("briefs").insert({
    user_id: user.id,
    project_id: project.id,
    raw_text:
      "Launch Trailhead's canned cold brew in Q2. Goal: drive trial among busy commuters. Highlight origin story, smooth taste, and portability. Budget mid-tier. Target: 25-40 urban professionals. Must avoid discount messaging.",
  });

  await supabase.from("ideas").insert({
    user_id: user.id,
    project_id: project.id,
    title: "Commute Companion",
    seed_text: "Cold brew as the ritual that turns commute into a mini adventure.",
  });

  await supabase.from("outputs").insert({
    user_id: user.id,
    project_id: project.id,
    mode: "one_pager",
    version: 1,
    content_md:
      "# Campaign One-Pager\n\n## Objective\nDrive trial and repeat purchase among urban commuters.\n\n## Big Idea\nCold brew as the commute companion that turns a routine into a mini adventure.\n\n## Channels\nTransit ads, social short-form, office lobby sampling.\n\n## KPIs\nTrial redemptions, repeat purchase rate, social saves.",
  });

  await supabase.from("feedback").insert({
    user_id: user.id,
    project_id: project.id,
    text: "Lean harder into the origin story and add a community angle.",
  });

  revalidatePath("/app");
}
