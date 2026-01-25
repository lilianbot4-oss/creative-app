import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import SignOutButton from "@/components/app/sign-out-button";

const navItems = [
  { href: "/app", label: "Dashboard" },
  { href: "/app/clients", label: "Clients" },
  { href: "/app/projects", label: "Projects" },
  { href: "/app/settings/models", label: "AI Models" },
  { href: "/app/help", label: "Help" },
];

export default function Sidebar({ userEmail }: { userEmail?: string | null }) {
  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Creative Copilot
        </p>
        <h2 className="text-2xl font-semibold">Workspace</h2>
        <Badge variant="secondary" className="w-fit">
          MVP
        </Badge>
      </div>
      <nav className="space-y-2 text-sm">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center justify-between rounded-xl border border-transparent px-3 py-2 text-muted-foreground transition hover:border-border/60 hover:bg-muted/40 hover:text-foreground"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <Separator />
      <div className="mt-auto space-y-3">
        <div className="text-xs text-muted-foreground">Signed in as</div>
        <div className="text-sm font-medium text-foreground/90">
          {userEmail ?? ""}
        </div>
        <SignOutButton />
      </div>
    </div>
  );
}
