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
  ConceptAsset,
  ProjectBriefUpload,
  Script,
  Storyboard,
  ActivityEvent,
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
  const [
    { count: clientCount, error: clientError },
    { count: projectCount, error: projectError },
    { count: outputCount, error: outputError },
  ] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }),
    supabase.from("projects").select("id", { count: "exact", head: true }),
    supabase.from("outputs").select("id", { count: "exact", head: true }),
  ]);

  if (clientError) throw clientError;
  if (projectError) throw projectError;
  if (outputError) throw outputError;

  return {
    clientCount: clientCount ?? 0,
    projectCount: projectCount ?? 0,
    outputCount: outputCount ?? 0,
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

export async function listBriefUploads(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_brief_uploads")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ProjectBriefUpload[];
}

export async function listConceptAssetsByProject(projectId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("concept_assets")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ConceptAsset[];
}

export async function getPrimaryKeyVisualsForProject(projectId: string) {
  const [concepts, assets] = await Promise.all([
    listConcepts(projectId),
    listConceptAssetsByProject(projectId),
  ]);

  const conceptById = new Map(concepts.map((concept) => [concept.id, concept]));
  const keyVisuals = assets.filter(
    (asset) => asset.asset_type === "key_visual" && asset.concept_id
  );
  const grouped = new Map<string, ConceptAsset[]>();

  keyVisuals.forEach((asset) => {
    const conceptId = asset.concept_id as string;
    const list = grouped.get(conceptId) ?? [];
    list.push(asset);
    grouped.set(conceptId, list);
  });

  return Array.from(grouped.entries()).map(([conceptId, list]) => {
    const sorted = list.slice().sort((a, b) => (a.created_at > b.created_at ? -1 : 1));
    const primary = list.find((asset) => asset.is_primary) ?? sorted[0] ?? null;
    const gallery = primary
      ? [primary, ...sorted.filter((asset) => asset.id !== primary.id)].slice(0, 4)
      : sorted.slice(0, 4);

    return {
      concept_id: conceptId,
      concept_title: conceptById.get(conceptId)?.title ?? null,
      primary,
      gallery,
    };
  });
}

export async function listConceptAssetsByConcept(conceptId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("concept_assets")
    .select("*")
    .eq("concept_id", conceptId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ConceptAsset[];
}

export async function getPrimaryKeyVisualForConcept(conceptId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("concept_assets")
    .select("*")
    .eq("concept_id", conceptId)
    .eq("asset_type", "key_visual")
    .eq("is_primary", true)
    .maybeSingle();
  if (error) throw error;
  return data as ConceptAsset | null;
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

export async function getProjectActivity(
  projectId: string,
  options?: { limit?: number; offset?: number }
) {
  const supabase = await createClient();
  let query = supabase
    .from("activity_log")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (typeof options?.offset === "number" && typeof options?.limit === "number") {
    const start = Math.max(options.offset, 0);
    const end = start + Math.max(options.limit, 1) - 1;
    query = query.range(start, end);
  } else if (typeof options?.limit === "number") {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ActivityEvent[];
}
