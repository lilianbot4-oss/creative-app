import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getLatestBrief,
  getOutputs,
  getFeedback,
  getReferences,
  getCreativeSpec,
  listConcepts,
  listVariants,
  listScripts,
  listConceptAssetsByProject,
  listBriefUploads,
  getStoryboard,
  getProjectActivity,
} from "@/lib/data";
import { getResolvedAISettings } from "@/lib/ai/settings";
import ProjectWorkspace from "@/components/project/project-workspace";
import type { Client, Project, ConceptVariant, Storyboard, ShareLink } from "@/lib/types";

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  const supabase = await createClient();
  const ACTIVITY_PAGE_SIZE = 20;
  let project: (Project & { client: Client | null }) | null = null;
  try {
    const { data } = await supabase
      .from("projects")
      .select("*, client:clients(*)")
      .eq("id", projectId)
      .maybeSingle();
    project = data as (Project & { client: Client | null }) | null;
  } catch (error) {
    console.error("Project fetch failed", { projectId, error });
    throw error;
  }

  if (!project) {
    notFound();
  }

  const [
    brief,
    outputs,
    feedback,
    references,
    creativeSpec,
    concepts,
    scripts,
    aiSettings,
    briefUploads,
    conceptAssets,
    activityRows,
    shareLinksResult,
  ] =
    await Promise.all([
      getLatestBrief(projectId),
      getOutputs(projectId),
      getFeedback(projectId),
      getReferences(projectId),
      getCreativeSpec(projectId),
      listConcepts(projectId),
      listScripts(projectId),
      getResolvedAISettings(projectId),
      listBriefUploads(projectId),
      listConceptAssetsByProject(projectId),
      getProjectActivity(projectId, { limit: ACTIVITY_PAGE_SIZE + 1 }),
      supabase
        .from("share_links")
        .select("*")
        .eq("project_id", projectId)
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
    ]);

  if (shareLinksResult.error) {
    throw shareLinksResult.error;
  }

  const shareLinks = (shareLinksResult.data ?? []) as ShareLink[];
  const activityEvents = activityRows.slice(0, ACTIVITY_PAGE_SIZE);
  const activityHasMore = activityRows.length > ACTIVITY_PAGE_SIZE;

  const variantsByConceptEntries = await Promise.all(
    concepts.map(async (concept) => {
      const variants = await listVariants(concept.id);
      return [concept.id, variants] as [string, ConceptVariant[]];
    })
  );
  const variantsByConcept = Object.fromEntries(variantsByConceptEntries);

  const storyboardsEntries = await Promise.all(
    scripts.map(async (script) => {
      const storyboard = await getStoryboard(script.id);
      return [script.id, storyboard] as [string, Storyboard | null];
    })
  );
  const storyboardsByScript = Object.fromEntries(storyboardsEntries);

  const assetsByConceptEntries = concepts.map((concept) => {
    const assets = conceptAssets.filter((asset) => asset.concept_id === concept.id);
    return [concept.id, assets];
  });
  const assetsByConcept = Object.fromEntries(assetsByConceptEntries);

  const assetsByScriptEntries = scripts.map((script) => {
    const assets = conceptAssets.filter(
      (asset) => asset.script_id === script.id && asset.asset_type === "storyboard_frame"
    );
    return [script.id, assets];
  });
  const assetsByScript = Object.fromEntries(assetsByScriptEntries);

  return (
    <ProjectWorkspace
      project={project}
      client={project.client}
      brief={brief}
      creativeSpec={creativeSpec}
      briefUploads={briefUploads}
      outputs={outputs}
      feedback={feedback}
      activityEvents={activityEvents}
      activityHasMore={activityHasMore}
      references={references}
      concepts={concepts}
      assetsByConcept={assetsByConcept}
      assetsByScript={assetsByScript}
      variantsByConcept={variantsByConcept}
      scripts={scripts}
      storyboardsByScript={storyboardsByScript}
      shareLinks={shareLinks}
      aiSettings={aiSettings}
      aiEnabled={Boolean(
        process.env.OPENAI_API_KEY ||
          process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
          process.env.GOOGLE_CLOUD_PROJECT ||
          process.env.GEMINI_API_KEY
      )}
    />
  );
}
