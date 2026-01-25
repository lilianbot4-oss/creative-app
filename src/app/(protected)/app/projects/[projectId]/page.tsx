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
  listBriefUploads,
  getStoryboard,
} from "@/lib/data";
import { getResolvedAISettings } from "@/lib/ai/settings";
import ProjectWorkspace from "@/components/project/project-workspace";
import type { Client, Project, ConceptVariant, Storyboard } from "@/lib/types";

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  let project: (Project & { client: Client | null }) | null = null;
  try {
    const supabase = await createClient();
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

  const [brief, outputs, feedback, references, creativeSpec, concepts, scripts, aiSettings, briefUploads] =
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
  ]);

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

  return (
    <ProjectWorkspace
      project={project}
      client={project.client}
      brief={brief}
      creativeSpec={creativeSpec}
      briefUploads={briefUploads}
      outputs={outputs}
      feedback={feedback}
      references={references}
      concepts={concepts}
      variantsByConcept={variantsByConcept}
      scripts={scripts}
      storyboardsByScript={storyboardsByScript}
      aiSettings={aiSettings}
      aiEnabled={Boolean(process.env.OPENAI_API_KEY)}
    />
  );
}
