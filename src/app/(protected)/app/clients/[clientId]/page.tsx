import Link from "next/link";
import { notFound } from "next/navigation";
import { getClient, getProjectsForClient } from "@/lib/data";
import ClientDetailsForm from "@/components/forms/client-details-form";
import BrandVoiceForm from "@/components/forms/brand-voice-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ClientDetailPageProps {
  params: Promise<{ clientId: string }>;
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { clientId } = await params;
  const [client, projects] = await Promise.all([
    getClient(clientId),
    getProjectsForClient(clientId),
  ]);

  if (!client) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">{client.name}</h2>
        <p className="text-sm text-muted-foreground">
          Manage brand voice and related projects.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Client details</CardTitle>
          </CardHeader>
          <CardContent>
            <ClientDetailsForm client={client} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Brand voice</CardTitle>
          </CardHeader>
          <CardContent>
            <BrandVoiceForm clientId={client.id} brandVoice={client.brand_voice} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No projects yet. Create one from the dashboard.
            </p>
          ) : (
            projects.map((project) => (
              <div
                key={project.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/70 px-4 py-3"
              >
                <div>
                  <p className="font-medium">{project.name}</p>
                  <p className="text-xs text-muted-foreground">{project.status}</p>
                </div>
                <Button asChild variant="secondary">
                  <Link href={`/app/projects/${project.id}`}>Open</Link>
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
