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
          <div className="flex h-10 w-10 items-center justify-center rounded-none border-2 border-border bg-primary text-primary-foreground">
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
          className="ml-1 w-fit border-2 border-border bg-secondary px-3 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-secondary-foreground"
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
                "group flex items-center gap-3 rounded-none border-2 px-3 py-2.5",
                isActive
                  ? "border-border bg-primary text-primary-foreground"
                  : "border-transparent text-muted-foreground hover:border-border hover:bg-card hover:text-foreground"
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
        <div className="rounded-none border-2 border-border bg-card p-4 shadow-none">
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
