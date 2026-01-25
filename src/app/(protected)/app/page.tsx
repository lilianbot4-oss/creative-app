import Link from "next/link";
import { getClients, getProjects } from "@/lib/data";
import CreateClientDialog from "@/components/forms/create-client-dialog";
import CreateProjectDialog from "@/components/forms/create-project-dialog";
import DemoDataButton from "@/components/forms/demo-data-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const [clients, projects] = await Promise.all([getClients(), getProjects()]);
  const recentProjects = projects.slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Quick access to your latest projects and client workspaces.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CreateClientDialog />
          <CreateProjectDialog clients={clients} />
        </div>
      </div>

      {projects.length === 0 && clients.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Get started with a demo workspace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Spin up a sample client, project, and output so you can explore the
              workflow before adding your real data.
            </p>
            <DemoDataButton />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Recent projects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentProjects.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No projects yet. Create one to start generating campaigns.
              </div>
            ) : (
              <div className="space-y-3">
                {recentProjects.map((project) => (
                  <div
                    key={project.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/60 bg-background/70 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">{project.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {project.client?.name ?? "No client"}
                      </p>
                    </div>
                    <Button asChild variant="secondary">
                      <Link href={`/app/projects/${project.id}`}>Open</Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
