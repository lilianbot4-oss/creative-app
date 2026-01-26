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
    <div className="flex h-full flex-col gap-8 p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Sparkles size={18} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80">
              Creative Copilot
            </p>
            <h2 className="text-xl font-bold tracking-tight">Workspace</h2>
          </div>
        </div>
        <Badge variant="secondary" className="ml-1 w-fit px-2 py-0 text-[10px] font-bold uppercase tracking-wider">
          Pro Member
        </Badge>
      </div>

      <nav className="space-y-1 text-sm">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/app" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-all duration-200",
                isActive 
                  ? "bg-primary/5 text-primary border-primary/10 shadow-sm" 
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
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

      <Separator className="opacity-50" />

      <div className="mt-auto space-y-4">
        <div className="rounded-2xl border border-border/40 bg-muted/30 p-4">
          <div className="mb-3 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
              Account
            </p>
            <p className="truncate text-sm font-semibold text-foreground/90">
              {userEmail ?? ""}
            </p>
          </div>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
