import { createClient } from "@/lib/supabase/server";
import type {
  Client,
  Project,
  Brief,
  Output,
  Feedback,
  Reference,
  CreativeSpec,
  Concept,
  ConceptVariant,
  Script,
  Storyboard,
} from "@/lib/types";

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getClients(options?: { query?: string }) {
  const supabase = await createClient();
  let query = supabase.from("clients").select("*");
  if (options?.query) {
    const q = options.query.trim();
    if (q.length > 0) {
      query = query.or(`name.ilike.%${q}%,industry.ilike.%${q}%`);
    }
  }
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Client[];
}

export async function getClient(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .maybeSingle();
  if (error) throw error;
  return data as Client | null;
}

export async function getProjects(options?: { query?: string; status?: string }) {
  const supabase = await createClient();
  let query = supabase
    .from("projects")
    .select("*, client:clients(name)");
  if (options?.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  const projects = (data ?? []) as Array<Project & { client: { name: string } | null }>;
  if (options?.query) {
    const q = options.query.toLowerCase();
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(q) ||
        project.client?.name?.toLowerCase().includes(q)
    );
  }
  return projects;
}

export async function getProjectsForClient(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Project[];
}

export async function getProject(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw error;
  return data as Project | null;
}

export async function getLatestBrief(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("briefs")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as Brief | null;
}

export async function getOutputs(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("outputs")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Output[];
}

export async function getFeedback(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feedback")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Feedback[];
}

export async function getReferences(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("references")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Reference[];
}

export async function getClientProjectCounts() {
  const supabase = await createClient();
  const { count: clientCount, error: clientError } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true });
  if (clientError) throw clientError;

  const { count: projectCount, error: projectError } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true });
  if (projectError) throw projectError;

  return {
    clientCount: clientCount ?? 0,
    projectCount: projectCount ?? 0,
  };
}

export async function getCreativeSpec(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("creative_specs")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw error;
  return data as CreativeSpec | null;
}

export async function upsertCreativeSpec(input: {
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("creative_specs")
    .upsert(
      {
        user_id: user.id,
        project_id: input.projectId,
        raw_brief_text: input.rawBriefText,
        parsed_json: input.parsedJson ?? null,
        must_do: input.mustDo ?? null,
        must_avoid: input.mustAvoid ?? null,
        tone_tags: input.toneTags ?? null,
        deliverables: input.deliverables ?? null,
        key_message: input.keyMessage ?? null,
        audience: input.audience ?? null,
      },
      { onConflict: "project_id" }
    )
    .select()
    .maybeSingle();
  if (error) throw error;
  return data as CreativeSpec | null;
}

export async function listConcepts(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("concepts")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Concept[];
}

export async function listVariants(conceptId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("concept_variants")
    .select("*")
    .eq("concept_id", conceptId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ConceptVariant[];
}

export async function listScripts(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scripts")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Script[];
}

export async function listScriptsForConcept(conceptId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scripts")
    .select("*")
    .eq("concept_id", conceptId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Script[];
}

export async function getStoryboard(scriptId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("storyboards")
    .select("*")
    .eq("script_id", scriptId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as Storyboard | null;
}
