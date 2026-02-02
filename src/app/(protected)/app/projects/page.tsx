import Link from "next/link";
import { redirect } from "next/navigation";
import { getClientProjectCounts, getClients, getProjects } from "@/lib/data";
import CreateProjectDialog from "@/components/forms/create-project-dialog";
import DeleteProjectButton from "@/components/forms/delete-project-button";
import ProjectsFilters from "@/components/filters/projects-filters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ProjectsPageProps {
  searchParams?: Promise<{ q?: string; status?: string }> | { q?: string; status?: string };
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const { clientCount, projectCount } = await getClientProjectCounts();
  if (clientCount === 0 || projectCount === 0) {
    redirect("/app/onboarding");
  }
  const resolvedParams = await Promise.resolve(searchParams);
  const query = resolvedParams?.q ?? "";
  const status = resolvedParams?.status ?? "all";
  const [projects, clients] = await Promise.all([
    getProjects({ query, status }),
    getClients(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Projects</h2>
          <p className="text-sm text-muted-foreground">
            Track all active and archived client projects.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ProjectsFilters />
          <CreateProjectDialog clients={clients} />
        </div>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No projects yet. Create one to start working.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="flex h-full flex-col">
              <CardHeader>
                <CardTitle>{project.name}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {project.client?.name ?? "No client"}
                </p>
              </CardHeader>
              <CardContent className="mt-auto flex items-center justify-between">
                <Button asChild variant="secondary">
                  <Link href={`/app/projects/${project.id}`}>Open</Link>
                </Button>
                <DeleteProjectButton projectId={project.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
