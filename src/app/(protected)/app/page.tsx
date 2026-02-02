import Link from "next/link";
import { redirect } from "next/navigation";
import { getClientProjectCounts, getClients, getProjects } from "@/lib/data";
import CreateClientDialog from "@/components/forms/create-client-dialog";
import CreateProjectDialog from "@/components/forms/create-project-dialog";
import DemoDataButton from "@/components/forms/demo-data-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  FolderKanban,
  Sparkles,
  ArrowRight,
  HelpCircle
} from "lucide-react";

export default async function DashboardPage() {
  const { clientCount, projectCount, outputCount } = await getClientProjectCounts();
  if (clientCount === 0 && projectCount === 0) {
    redirect("/app/onboarding");
  }
  const [clients, projects] = await Promise.all([getClients(), getProjects()]);
  const recentProjects = projects.slice(0, 5);

  const stats = [
    {
      label: "Total Clients",
      value: clientCount,
      icon: Users,
      tone: "text-primary-foreground bg-primary border-border",
    },
    {
      label: "Active Projects",
      value: projectCount,
      icon: FolderKanban,
      tone: "text-secondary-foreground bg-secondary border-border",
    },
    {
      label: "Campaign Outputs",
      value: outputCount,
      icon: Sparkles,
      tone: "text-accent-foreground bg-accent border-border",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <div className="border-2 border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">
              Campaign Command
            </p>
            <h2 className="text-4xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground">
              Here&apos;s what&apos;s happening with your creative campaigns.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <CreateProjectDialog clients={clients} />
            <CreateClientDialog />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className="border-2 border-border"
          >
            <CardContent className="flex items-center gap-4 p-6">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-none border-2 ${stat.tone}`}
              >
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold tracking-tight">Recent Projects</h3>
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
              <Link href="/app/projects" className="gap-1">
                View all <ArrowRight size={14} />
              </Link>
            </Button>
          </div>

          {recentProjects.length === 0 ? (
            <Card className="border-2 border-dashed border-border bg-transparent">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-none border-2 border-border bg-muted">
                  <FolderKanban size={32} className="text-muted-foreground/60" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold">No projects yet</p>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Create your first project to start generating high-converting campaigns.
                  </p>
                </div>
                <CreateProjectDialog clients={clients} />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {recentProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/app/projects/${project.id}`}
                  className="group flex flex-wrap items-center justify-between gap-4 rounded-none border-2 border-border bg-card p-5 hover:bg-muted"
                >
                  <div className="space-y-1">
                    <p className="font-bold group-hover:text-primary transition-colors">{project.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground">
                        {project.client?.name ?? "Internal"}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60">•</span>
                      <span className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-widest leading-none">
                        Created {new Date(project.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="rounded-none bg-background opacity-100">
                    <ArrowRight size={18} />
                  </Button>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold tracking-tight">Quick Actions</h3>
          <div className="grid gap-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Get Started</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  New to the platform? Try spinning up dummy data to see how the workflow feels.
                </p>
                <DemoDataButton />
              </CardContent>
            </Card>

            <Link
              href="/app/help"
              className="flex items-center gap-3 rounded-none border-2 border-border bg-card p-4 hover:bg-muted"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-none border-2 border-border bg-accent text-accent-foreground">
                <HelpCircle size={20} />
              </div>
              <div>
                <p className="text-sm font-bold">Need help?</p>
                <p className="text-[10px] text-muted-foreground">Read the documentation</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
