import Link from "next/link";
import { getClients } from "@/lib/data";
import CreateClientDialog from "@/components/forms/create-client-dialog";
import DeleteClientButton from "@/components/forms/delete-client-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Clients</h2>
          <p className="text-sm text-muted-foreground">
            Manage client profiles and brand voice guidance.
          </p>
        </div>
        <CreateClientDialog />
      </div>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No clients yet. Create one to start organizing projects.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.id} className="flex h-full flex-col">
              <CardHeader>
                <CardTitle>{client.name}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {client.industry ?? "Industry not set"}
                </p>
              </CardHeader>
              <CardContent className="mt-auto flex items-center justify-between">
                <Button asChild variant="secondary">
                  <Link href={`/app/clients/${client.id}`}>Open</Link>
                </Button>
                <DeleteClientButton clientId={client.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
