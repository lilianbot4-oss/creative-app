import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLatestBrief, getOutputs, getFeedback, getReferences } from "@/lib/data";
import ProjectWorkspace from "@/components/project/project-workspace";

interface ProjectPageProps {
  params: { projectId: string };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("*, client:clients(*)")
    .eq("id", params.projectId)
    .maybeSingle();

  if (!project) {
    notFound();
  }

  const [brief, outputs, feedback, references] = await Promise.all([
    getLatestBrief(params.projectId),
    getOutputs(params.projectId),
    getFeedback(params.projectId),
    getReferences(params.projectId),
  ]);

  return (
    <ProjectWorkspace
      project={project}
      client={project.client}
      brief={brief}
      outputs={outputs}
      feedback={feedback}
      references={references}
    />
  );
}
