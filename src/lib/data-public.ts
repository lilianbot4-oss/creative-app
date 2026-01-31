import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Brief,
  Output,
  Feedback,
  Reference,
  CreativeSpec,
  Concept,
  ConceptVariant,
  Script,
  ConceptAsset,
  Storyboard,
} from "@/lib/types";

export async function getLatestBrief(supabase: SupabaseClient, projectId: string) {
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

export async function getOutputs(supabase: SupabaseClient, projectId: string) {
  const { data, error } = await supabase
    .from("outputs")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Output[];
}

export async function getFeedback(supabase: SupabaseClient, projectId: string) {
  const { data, error } = await supabase
    .from("feedback")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Feedback[];
}

export async function getReferences(supabase: SupabaseClient, projectId: string) {
  const { data, error } = await supabase
    .from("references")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Reference[];
}

export async function getCreativeSpec(supabase: SupabaseClient, projectId: string) {
  const { data, error } = await supabase
    .from("creative_specs")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw error;
  return data as CreativeSpec | null;
}

export async function listConcepts(supabase: SupabaseClient, projectId: string) {
  const { data, error } = await supabase
    .from("concepts")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Concept[];
}

export async function listVariants(supabase: SupabaseClient, conceptId: string) {
  const { data, error } = await supabase
    .from("concept_variants")
    .select("*")
    .eq("concept_id", conceptId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ConceptVariant[];
}

export async function listScripts(supabase: SupabaseClient, projectId: string) {
  const { data, error } = await supabase
    .from("scripts")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Script[];
}

export async function listConceptAssetsByProject(supabase: SupabaseClient, projectId: string) {
  const { data, error } = await supabase
    .from("concept_assets")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ConceptAsset[];
}

export async function getStoryboard(supabase: SupabaseClient, scriptId: string) {
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

export async function getPrimaryKeyVisualsForProject(
  supabase: SupabaseClient,
  projectId: string
) {
  const [concepts, assets] = await Promise.all([
    listConcepts(supabase, projectId),
    listConceptAssetsByProject(supabase, projectId),
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
