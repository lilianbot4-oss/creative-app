"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import {
  batchCreateConceptsSchema,
  brandVoiceSchema,
  briefSchema,
  clientSchema,
  conceptSchema,
  conceptVariantSchema,
  creativeSpecSchema,
  createShareLinkSchema,
  feedbackSchema,
  projectSchema,
} from "@/lib/validators";
import { PROJECT_STATUSES, SCRIPT_FORMATS } from "@/lib/constants";
import type { ScriptFormat } from "@/lib/constants";
import { logActivity } from "@/lib/activity";

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
  void logActivity({
    supabase,
    userId: user.id,
    action: "client.created",
    entityType: "client",
    entityId: client.id,
    clientId: client.id,
    metadata: { name: client.name },
  });
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
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated");
  const { error } = await supabase
    .from("clients")
    .update({
      name: input.name,
      industry: input.industry ?? null,
      notes: input.notes ?? null,
    })
    .eq("id", input.id)
    .eq("user_id", user.id);
  if (error) throw error;
  void logActivity({
    supabase,
    userId: user.id,
    action: "client.updated",
    entityType: "client",
    entityId: input.id,
    clientId: input.id,
    metadata: { name: input.name },
  });
  revalidatePath("/app/clients");
  revalidatePath(`/app/clients/${input.id}`);
}

export async function deleteClientAction(clientId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated");
  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", clientId)
    .eq("user_id", user.id);
  if (error) throw error;
  void logActivity({
    supabase,
    userId: user.id,
    action: "client.deleted",
    entityType: "client",
    entityId: clientId,
    clientId,
  });
  revalidatePath("/app/clients");
  revalidatePath("/app");
}

export async function updateBrandVoiceAction(input: {
  clientId: string;
  brandVoice: Record<string, string | null | undefined>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated");
  const parsed = brandVoiceSchema.parse(input.brandVoice);
  const { error } = await supabase
    .from("clients")
    .update({ brand_voice: parsed })
    .eq("id", input.clientId)
    .eq("user_id", user.id);
  if (error) throw error;
  void logActivity({
    supabase,
    userId: user.id,
    action: "client.brand_voice_updated",
    entityType: "client",
    entityId: input.clientId,
    clientId: input.clientId,
  });
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
  void logActivity({
    supabase,
    userId: user.id,
    action: "project.created",
    entityType: "project",
    entityId: project.id,
    projectId: project.id,
    clientId: project.client_id,
    metadata: { name: project.name },
  });
  revalidatePath("/app");
  revalidatePath("/app/projects");
  return project;
}

export async function updateProjectStatusAction(input: {
  projectId: string;
  status: (typeof PROJECT_STATUSES)[number];
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated");
  const { error } = await supabase
    .from("projects")
    .update({ status: input.status })
    .eq("id", input.projectId)
    .eq("user_id", user.id);
  if (error) throw error;
  void logActivity({
    supabase,
    userId: user.id,
    action: "project.status_changed",
    entityType: "project",
    entityId: input.projectId,
    projectId: input.projectId,
    metadata: { status: input.status },
  });
  revalidatePath(`/app/projects/${input.projectId}`);
  revalidatePath("/app/projects");
}

export async function deleteProjectAction(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated");
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("user_id", user.id);
  if (error) throw error;
  void logActivity({
    supabase,
    userId: user.id,
    action: "project.deleted",
    entityType: "project",
    entityId: projectId,
    projectId,
  });
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
  void logActivity({
    supabase,
    userId: user.id,
    action: "brief.created",
    entityType: "brief",
    entityId: brief.id,
    projectId: data.project_id,
  });
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

  const { data: feedback, error } = await supabase
    .from("feedback")
    .insert({
      user_id: user.id,
      project_id: data.project_id,
      output_id: data.output_id ?? null,
      text: data.text,
    })
    .select("id")
    .maybeSingle();

  if (error) throw error;
  void logActivity({
    supabase,
    userId: user.id,
    action: "feedback.created",
    entityType: "feedback",
    entityId: feedback?.id ?? null,
    projectId: data.project_id,
    metadata: { output_id: data.output_id ?? null },
  });
  revalidatePath(`/app/projects/${data.project_id}`);
}

export async function setPrimaryOutputAction(input: {
  projectId: string;
  outputId: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated");
  const { error } = await supabase.rpc("set_primary_output", {
    p_project_id: input.projectId,
    p_output_id: input.outputId,
    p_user_id: user.id,
  });
  if (error) throw error;

  void logActivity({
    supabase,
    userId: user.id,
    action: "output.primary_set",
    entityType: "output",
    entityId: input.outputId,
    projectId: input.projectId,
  });

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

  void logActivity({
    supabase,
    userId: user.id,
    action: "demo_data.seeded",
    entityType: "project",
    entityId: project.id,
    projectId: project.id,
    clientId: client.id,
    metadata: { name: project.name },
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
  activeBriefUploadId?: string | null;
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

  const payload: Record<string, unknown> = {
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
  };
  if (input.activeBriefUploadId !== undefined) {
    payload.active_brief_upload_id = input.activeBriefUploadId;
  }

  const { data: spec, error } = await supabase
    .from("creative_specs")
    .upsert(
      payload,
      { onConflict: "project_id" }
    )
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!spec) throw new Error("Failed to save creative spec");
  void logActivity({
    supabase,
    userId: user.id,
    action: "creative_spec.saved",
    entityType: "creative_spec",
    entityId: spec.id,
    projectId: parsed.project_id,
  });
  revalidatePath(`/app/projects/${parsed.project_id}`);
  return spec;
}

export async function createConceptAction(input: {
  project_id: string;
  title: string;
  one_liner?: string | null;
  thesis?: string | null;
  product_integration?: string | null;
  scalability?: string | null;
  origin_type?: "human" | "ai_assisted" | "ai_generated";
  seed_text?: string | null;
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
      product_integration: parsed.product_integration ?? null,
      scalability: parsed.scalability ?? null,
      origin_type: parsed.origin_type ?? "human",
      seed_text: parsed.seed_text ?? null,
    })
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!concept) throw new Error("Failed to create concept");
  void logActivity({
    supabase,
    userId: user.id,
    action: "concept.created",
    entityType: "concept",
    entityId: concept.id,
    projectId: parsed.project_id,
  });
  revalidatePath(`/app/projects/${parsed.project_id}`);
  return concept;
}

export async function batchCreateConceptsAction(input: {
  project_id: string;
  concepts: Array<{
    title: string;
    thesis?: string | null;
    seed_text?: string | null;
    origin_type?: "human" | "ai_assisted" | "ai_generated";
    parent_concept_id?: string | null;
  }>;
}) {
  const parsed = batchCreateConceptsSchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated");

  const payload = parsed.concepts.map((concept) => ({
    user_id: user.id,
    project_id: parsed.project_id,
    title: concept.title,
    thesis: concept.thesis ?? null,
    seed_text: concept.seed_text ?? null,
    origin_type: concept.origin_type ?? "human",
    parent_concept_id: concept.parent_concept_id ?? null,
  }));

  const { data: concepts, error } = await supabase
    .from("concepts")
    .insert(payload)
    .select();

  if (error) throw error;
  if (!concepts) throw new Error("Failed to create concepts");
  void logActivity({
    supabase,
    userId: user.id,
    action: "concepts.imported",
    entityType: "concept",
    entityId: concepts[0]?.id ?? null,
    projectId: parsed.project_id,
    metadata: { count: concepts.length },
  });
  revalidatePath(`/app/projects/${parsed.project_id}`);
  return concepts;
}

export async function saveBriefUploadAction(input: {
  projectId: string;
  filename: string;
  fileType: "pdf" | "pptx";
  fileSize?: number | null;
  extractedText: string;
  extractedMeta?: Record<string, unknown> | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated");

  const { data: upload, error } = await supabase
    .from("project_brief_uploads")
    .insert({
      user_id: user.id,
      project_id: input.projectId,
      filename: input.filename,
      file_type: input.fileType,
      file_size: input.fileSize ?? null,
      extracted_text: input.extractedText,
      extracted_meta: input.extractedMeta ?? null,
    })
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!upload) throw new Error("Failed to save brief upload");
  void logActivity({
    supabase,
    userId: user.id,
    action: "brief_upload.saved",
    entityType: "project_brief_upload",
    entityId: upload.id,
    projectId: input.projectId,
    metadata: { filename: upload.filename },
  });
  revalidatePath(`/app/projects/${input.projectId}`);
  return upload;
}

export async function setActiveBriefUploadAction(input: {
  projectId: string;
  uploadId: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated");

  const { data: existing } = await supabase
    .from("creative_specs")
    .select("id")
    .eq("project_id", input.projectId)
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from("creative_specs")
        .update({ active_brief_upload_id: input.uploadId })
        .eq("project_id", input.projectId)
    : await supabase
        .from("creative_specs")
        .insert({
          user_id: user.id,
          project_id: input.projectId,
          raw_brief_text: "",
          active_brief_upload_id: input.uploadId,
        });

  if (error) throw error;

  if (input.uploadId) {
    const { data: upload, error: uploadError } = await supabase
      .from("project_brief_uploads")
      .select("extracted_text")
      .eq("id", input.uploadId)
      .eq("project_id", input.projectId)
      .maybeSingle();

    if (uploadError) throw uploadError;

    const extractedText = upload?.extracted_text?.trim() ?? "";
    if (extractedText) {
      const { data: latestBrief, error: latestBriefError } = await supabase
        .from("briefs")
        .select("raw_text")
        .eq("project_id", input.projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestBriefError) throw latestBriefError;

      if (!latestBrief || latestBrief.raw_text.trim() !== extractedText) {
        const { error: briefError } = await supabase.from("briefs").insert({
          user_id: user.id,
          project_id: input.projectId,
          raw_text: extractedText,
        });

        if (briefError) throw briefError;
      }
    }
  }

  void logActivity({
    supabase,
    userId: user.id,
    action: "brief_upload.active_set",
    entityType: "project_brief_upload",
    entityId: input.uploadId ?? null,
    projectId: input.projectId,
  });

  revalidatePath(`/app/projects/${input.projectId}`);
}

export async function createScriptAction(input: {
  projectId: string;
  format: ScriptFormat;
  scriptMd: string;
  conceptId?: string | null;
  variantId?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated");

  const { data: existing } = await supabase
    .from("scripts")
    .select("version")
    .eq("project_id", input.projectId)
    .eq("format", input.format)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (existing?.version ?? 0) + 1;

  const { data: script, error } = await supabase
    .from("scripts")
    .insert({
      user_id: user.id,
      project_id: input.projectId,
      concept_id: input.conceptId ?? null,
      variant_id: input.variantId ?? null,
      format: input.format,
      script_md: input.scriptMd,
      version: nextVersion,
      origin_type: "human",
    })
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!script) throw new Error("Failed to create script");
  void logActivity({
    supabase,
    userId: user.id,
    action: "script.created",
    entityType: "script",
    entityId: script.id,
    projectId: input.projectId,
    metadata: { format: script.format },
  });
  revalidatePath(`/app/projects/${input.projectId}`);
  return script;
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
  void logActivity({
    supabase,
    userId: user.id,
    action: "variant.created",
    entityType: "concept_variant",
    entityId: variant.id,
    projectId: concept?.project_id ?? null,
  });
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
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated");
  const { error } = await supabase.rpc("set_primary_script", {
    p_project_id: input.projectId,
    p_script_id: input.scriptId,
    p_format: input.format,
    p_user_id: user.id,
  });
  if (error) throw error;

  void logActivity({
    supabase,
    userId: user.id,
    action: "script.primary_set",
    entityType: "script",
    entityId: input.scriptId,
    projectId: input.projectId,
    metadata: { format: input.format },
  });

  revalidatePath(`/app/projects/${input.projectId}`);
  revalidatePath(`/app/projects/${input.projectId}/pitch`);
}

export async function createShareLinkAction(input: {
  projectId: string;
  viewType?: "pitch" | "export";
  label?: string | null;
  expiresAt?: string | null;
}) {
  const parsed = createShareLinkSchema.parse({
    project_id: input.projectId,
    view_type: input.viewType ?? "pitch",
    label: input.label ?? null,
    expires_at: input.expiresAt ?? null,
  });

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated");

  const { data: project } = await supabase
    .from("projects")
    .select("id, client_id")
    .eq("id", parsed.project_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!project) throw new Error("Project not found");

  const expiresAt = parsed.expires_at ? new Date(parsed.expires_at) : null;
  if (parsed.expires_at && Number.isNaN(expiresAt?.getTime())) {
    throw new Error("Invalid expiration date");
  }

  const token = randomBytes(24).toString("base64url");
  const { data: link, error } = await supabase
    .from("share_links")
    .insert({
      user_id: user.id,
      project_id: parsed.project_id,
      token,
      label: parsed.label?.trim() || null,
      view_type: parsed.view_type,
      expires_at: expiresAt ? expiresAt.toISOString() : null,
      is_active: true,
    })
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!link) throw new Error("Failed to create share link");

  void logActivity({
    supabase,
    userId: user.id,
    action: "share_link.created",
    entityType: "share_link",
    entityId: link.id,
    projectId: parsed.project_id,
    clientId: project.client_id,
    metadata: { view_type: link.view_type, label: link.label, expires_at: link.expires_at },
  });

  revalidatePath(`/app/projects/${parsed.project_id}`);
  return link;
}

export async function revokeShareLinkAction(input: { shareLinkId: string }) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated");

  const { data: link } = await supabase
    .from("share_links")
    .select("id, project_id, view_type")
    .eq("id", input.shareLinkId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!link) throw new Error("Share link not found");

  const { error } = await supabase
    .from("share_links")
    .update({ is_active: false })
    .eq("id", input.shareLinkId)
    .eq("user_id", user.id);

  if (error) throw error;

  void logActivity({
    supabase,
    userId: user.id,
    action: "share_link.revoked",
    entityType: "share_link",
    entityId: link.id,
    projectId: link.project_id,
    metadata: { view_type: link.view_type },
  });

  revalidatePath(`/app/projects/${link.project_id}`);
}

export async function listShareLinksAction(input: { projectId: string }) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("share_links")
    .select("*")
    .eq("project_id", input.projectId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function listProjectActivityAction(input: {
  projectId: string;
  offset?: number;
  limit?: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated");

  const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);
  const offset = Math.max(input.offset ?? 0, 0);
  const end = offset + limit;

  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .eq("project_id", input.projectId)
    .order("created_at", { ascending: false })
    .range(offset, end);

  if (error) throw error;

  const events = (data ?? []).slice(0, limit);
  return { events, hasMore: (data ?? []).length > limit };
}
