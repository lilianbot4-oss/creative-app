"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  createShareLinkAction,
  revokeShareLinkAction,
} from "@/app/(protected)/app/actions";
import type { ShareLink } from "@/lib/types";

const VIEW_OPTIONS = [
  { value: "pitch", label: "Pitch view" },
  { value: "export", label: "Export view" },
] as const;

function formatDateTime(value: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function ShareProjectButton({
  projectId,
  shareLinks,
}: {
  projectId: string;
  shareLinks: ShareLink[];
}) {
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState<ShareLink[]>(shareLinks);
  const [origin, setOrigin] = useState("");
  const [viewType, setViewType] = useState<"pitch" | "export">("pitch");
  const [label, setLabel] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    setLinks(shareLinks);
  }, [shareLinks]);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isCreating) return;

    const expiresDate = expiresAt ? new Date(expiresAt) : null;
    if (expiresAt && Number.isNaN(expiresDate?.getTime())) {
      toast.error("Invalid expiration date");
      return;
    }

    setIsCreating(true);
    try {
      const link = await createShareLinkAction({
        projectId,
        viewType,
        label: label.trim() || null,
        expiresAt: expiresDate ? expiresDate.toISOString() : null,
      });
      setLinks((prev) => [link as ShareLink, ...prev]);
      setLabel("");
      setExpiresAt("");
      setViewType("pitch");
      toast.success("Share link created");
    } catch {
      toast.error("Failed to create share link");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async (token: string) => {
    try {
      const url = `${window.location.origin}/share/${token}`;
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleRevoke = async (linkId: string) => {
    setRevokingId(linkId);
    try {
      await revokeShareLinkAction({ shareLinkId: linkId });
      setLinks((prev) => prev.filter((link) => link.id !== linkId));
      toast.success("Link revoked");
    } catch {
      toast.error("Failed to revoke link");
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Share</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Share project</DialogTitle>
          <DialogDescription>
            Generate read-only links so clients can view pitch or export pages without logging in.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleCreate}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>View type</Label>
              <Select value={viewType} onValueChange={(value) => setViewType(value as "pitch" | "export")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select view" />
                </SelectTrigger>
                <SelectContent>
                  {VIEW_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="share-label">Label (optional)</Label>
              <Input
                id="share-label"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="e.g. Q1 client review"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="share-expiry">Expiration (optional)</Label>
              <Input
                id="share-expiry"
                type="datetime-local"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
              />
            </div>
          </div>
          <Button type="submit" disabled={isCreating}>
            {isCreating ? "Creating..." : "Create share link"}
          </Button>
        </form>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Active links</h4>
            <Badge variant="secondary">{links.length}</Badge>
          </div>
          {links.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active links yet.</p>
          ) : (
            <div className="space-y-3">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">
                        {link.label ? link.label : "Untitled link"}
                      </span>
                      <Badge variant="outline">{link.view_type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Expires: {formatDateTime(link.expires_at)}
                    </p>
                    {origin ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {origin}/share/{link.token}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={() => handleCopy(link.token)}>
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevoke(link.id)}
                      disabled={revokingId === link.id}
                    >
                      {revokingId === link.id ? "Revoking..." : "Revoke"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
