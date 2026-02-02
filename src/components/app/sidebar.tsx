"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import SignOutButton from "@/components/app/sign-out-button";
import { 
  LayoutDashboard, 
  Users, 
  FolderKanban, 
  Cpu, 
  HelpCircle,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/clients", label: "Clients", icon: Users },
  { href: "/app/projects", label: "Projects", icon: FolderKanban },
  { href: "/app/settings/models", label: "AI Models", icon: Cpu },
  { href: "/app/help", label: "Help", icon: HelpCircle },
];

export default function Sidebar({ userEmail }: { userEmail?: string | null }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col gap-8 px-6 py-8">
      <div className="space-y-4">
        <div className="flex items-center gap-3 px-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/30 bg-primary/15 text-primary shadow-[0_10px_30px_-20px] shadow-primary/60">
            <Sparkles size={18} />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Creative Copilot
            </p>
            <h2 className="text-xl font-semibold tracking-tight">Workspace</h2>
          </div>
        </div>
        <Badge
          variant="secondary"
          className="ml-1 w-fit border border-primary/20 bg-primary/10 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary"
        >
          Pro Member
        </Badge>
      </div>

      <nav className="space-y-2 text-sm">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/app" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition-all duration-200",
                isActive
                  ? "border-primary/30 bg-primary/10 text-foreground shadow-[0_12px_30px_-22px] shadow-primary/60"
                  : "border-transparent text-muted-foreground hover:border-border/60 hover:bg-card/60 hover:text-foreground"
              )}
            >
              <item.icon 
                size={18} 
                className={cn(
                  "transition-colors duration-200",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )} 
              />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <Separator className="opacity-60" />

      <div className="mt-auto space-y-4">
        <div className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-[0_12px_30px_-24px] shadow-primary/40">
          <div className="mb-3 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Account
            </p>
            <p className="truncate text-sm font-semibold text-foreground">
              {userEmail ?? ""}
            </p>
          </div>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
