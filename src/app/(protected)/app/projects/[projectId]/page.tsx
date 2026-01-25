import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLatestBrief, getOutputs, getFeedback, getReferences } from "@/lib/data";
import ProjectWorkspace from "@/components/project/project-workspace";
import type { Client, Project } from "@/lib/types";

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

  const [brief, outputs, feedback, references] = await Promise.all([
    getLatestBrief(projectId),
    getOutputs(projectId),
    getFeedback(projectId),
    getReferences(projectId),
  ]);

  return (
    <ProjectWorkspace
      project={project}
      client={project.client}
      brief={brief}
      outputs={outputs}
      feedback={feedback}
      references={references}
      aiEnabled={Boolean(process.env.OPENAI_API_KEY)}
    />
  );
}
