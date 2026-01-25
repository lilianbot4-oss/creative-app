"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  brandVoiceSchema,
  briefSchema,
  clientSchema,
  conceptSchema,
  conceptVariantSchema,
  creativeSpecSchema,
  feedbackSchema,
  projectSchema,
} from "@/lib/validators";
import { PROJECT_STATUSES, SCRIPT_FORMATS } from "@/lib/constants";

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

  const { data: client, error: insertError } = await supabase
    .from("clients")
    .insert({
      user_id: user.id,
      name: data.name,
      industry: data.industry ?? null,
      notes: data.notes ?? null,
    })
    .select()
    .maybeSingle();

  if (insertError) throw insertError;
  if (!client) throw new Error("Failed to create client");
  revalidatePath("/app");
  revalidatePath("/app/clients");
  return client;
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

  const { data: project, error: insertError } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      client_id: data.client_id,
      name: data.name,
      status: data.status,
    })
    .select()
    .maybeSingle();

  if (insertError) throw insertError;
  if (!project) throw new Error("Failed to create project");
  revalidatePath("/app");
  revalidatePath("/app/projects");
  return project;
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

  const { data: brief, error: insertError } = await supabase
    .from("briefs")
    .insert({
      user_id: user.id,
      project_id: data.project_id,
      raw_text: data.raw_text,
    })
    .select()
    .maybeSingle();

  if (insertError) throw insertError;
  if (!brief) throw new Error("Failed to create brief");
  revalidatePath(`/app/projects/${data.project_id}`);
  return brief;
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

export async function setPrimaryOutputAction(input: {
  projectId: string;
  outputId: string;
}) {
  const supabase = await createClient();
  const { error: resetError } = await supabase
    .from("outputs")
    .update({ is_primary: false })
    .eq("project_id", input.projectId);
  if (resetError) throw resetError;

  const { error } = await supabase
    .from("outputs")
    .update({ is_primary: true })
    .eq("id", input.outputId)
    .eq("project_id", input.projectId);
  if (error) throw error;

  revalidatePath(`/app/projects/${input.projectId}`);
  revalidatePath(`/app/projects/${input.projectId}/export`);
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
    is_primary: true,
  });

  await supabase.from("feedback").insert({
    user_id: user.id,
    project_id: project.id,
    text: "Lean harder into the origin story and add a community angle.",
  });

  revalidatePath("/app");
}

export async function upsertCreativeSpecAction(input: {
  projectId: string;
  rawBriefText: string;
  parsedJson?: Record<string, unknown> | null;
  mustDo?: string[] | null;
  mustAvoid?: string[] | null;
  toneTags?: string[] | null;
  deliverables?: Array<{ type: string; notes?: string | null }> | null;
  keyMessage?: string | null;
  audience?: string | null;
}) {
  const parsed = creativeSpecSchema.parse({
    project_id: input.projectId,
    raw_brief_text: input.rawBriefText,
    parsed_json: input.parsedJson ?? null,
    must_do: input.mustDo ?? null,
    must_avoid: input.mustAvoid ?? null,
    tone_tags: input.toneTags ?? null,
    deliverables: input.deliverables ?? null,
    key_message: input.keyMessage ?? null,
    audience: input.audience ?? null,
  });

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated");

  const { data: spec, error } = await supabase
    .from("creative_specs")
    .upsert(
      {
        user_id: user.id,
        project_id: parsed.project_id,
        raw_brief_text: parsed.raw_brief_text,
        parsed_json: parsed.parsed_json ?? null,
        must_do: parsed.must_do ?? null,
        must_avoid: parsed.must_avoid ?? null,
        tone_tags: parsed.tone_tags ?? null,
        deliverables: parsed.deliverables ?? null,
        key_message: parsed.key_message ?? null,
        audience: parsed.audience ?? null,
      },
      { onConflict: "project_id" }
    )
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!spec) throw new Error("Failed to save creative spec");
  revalidatePath(`/app/projects/${parsed.project_id}`);
  return spec;
}

export async function createConceptAction(input: {
  project_id: string;
  title: string;
  one_liner?: string | null;
  thesis?: string | null;
  doorDash_integration?: string | null;
  scalability?: string | null;
}) {
  const parsed = conceptSchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated");

  const { data: concept, error } = await supabase
    .from("concepts")
    .insert({
      user_id: user.id,
      project_id: parsed.project_id,
      title: parsed.title,
      one_liner: parsed.one_liner ?? null,
      thesis: parsed.thesis ?? null,
      doorDash_integration: parsed.doorDash_integration ?? null,
      scalability: parsed.scalability ?? null,
    })
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!concept) throw new Error("Failed to create concept");
  revalidatePath(`/app/projects/${parsed.project_id}`);
  return concept;
}

export async function createConceptVariantAction(input: {
  concept_id: string;
  angle: string;
  summary?: string | null;
}) {
  const parsed = conceptVariantSchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated");

  const { data: concept } = await supabase
    .from("concepts")
    .select("project_id")
    .eq("id", parsed.concept_id)
    .maybeSingle();

  const { data: variant, error } = await supabase
    .from("concept_variants")
    .insert({
      user_id: user.id,
      concept_id: parsed.concept_id,
      angle: parsed.angle,
      summary: parsed.summary ?? null,
    })
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!variant) throw new Error("Failed to create variant");
  if (concept?.project_id) {
    revalidatePath(`/app/projects/${concept.project_id}`);
  }
  return variant;
}

export async function setPrimaryScriptAction(input: {
  projectId: string;
  scriptId: string;
  format: (typeof SCRIPT_FORMATS)[number];
}) {
  const supabase = await createClient();
  const { error: resetError } = await supabase
    .from("scripts")
    .update({ is_primary: false })
    .eq("project_id", input.projectId)
    .eq("format", input.format);
  if (resetError) throw resetError;

  const { error } = await supabase
    .from("scripts")
    .update({ is_primary: true })
    .eq("id", input.scriptId)
    .eq("project_id", input.projectId);
  if (error) throw error;

  revalidatePath(`/app/projects/${input.projectId}`);
  revalidatePath(`/app/projects/${input.projectId}/pitch`);
}
