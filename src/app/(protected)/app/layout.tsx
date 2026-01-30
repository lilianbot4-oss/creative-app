import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/app/sidebar";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="no-print border-r border-border/60 bg-card/70">
        <Sidebar userEmail={user.email} />
      </aside>
      <div className="flex min-h-screen flex-col">
        <header className="no-print flex items-center justify-between border-b border-border/60 bg-background/80 px-6 py-4 backdrop-blur">
          <div>
            <h1 className="text-lg font-semibold">Creative Copilot</h1>
            <p className="text-xs text-muted-foreground">
              Organize projects, generate content, build presentations.
            </p>
          </div>
        </header>
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
