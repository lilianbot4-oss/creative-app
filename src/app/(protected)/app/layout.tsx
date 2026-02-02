import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/app/sidebar";
import ThemeToggle from "@/components/theme-toggle";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="no-print border-r border-border/60 bg-card/70 backdrop-blur-xl">
        <div className="relative h-full">
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <Sidebar userEmail={user.email} />
        </div>
      </aside>
      <div className="flex min-h-screen flex-col">
        <header className="no-print relative z-10 flex items-center justify-between border-b border-border/60 bg-background/80 px-6 py-4 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Creative Copilot
            </p>
            <h1 className="text-lg font-semibold">Command Center</h1>
            <p className="text-xs text-muted-foreground">
              Organize projects, generate content, build presentations.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 px-6 py-10">{children}</main>
      </div>
    </div>
  );
}
