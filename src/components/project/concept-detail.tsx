"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Concept, ConceptAsset, ConceptVariant } from "@/lib/types";
import { getPublicStorageUrl } from "@/lib/storage";

const ORIGIN_LABELS: Record<string, string> = {
  human: "Human",
  ai_assisted: "AI Assisted",
  ai_generated: "AI Generated",
};

export default function ConceptDetail({
  concept,
  variants,
  assets,
}: {
  concept: Concept;
  variants: ConceptVariant[];
  assets: ConceptAsset[];
}) {
  const [open, setOpen] = useState(false);
  const keyVisuals = assets.filter((asset) => asset.asset_type === "key_visual");
  const primaryAsset = keyVisuals.find((asset) => asset.is_primary) ?? null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          View details
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{concept.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{ORIGIN_LABELS[concept.origin_type ?? "human"]}</Badge>
            {concept.seed_text ? (
              <span className="text-xs text-muted-foreground">Seed: {concept.seed_text}</span>
            ) : null}
          </div>
          {primaryAsset ? (
            <div className="space-y-2">
              <p className="font-medium">Main image</p>
              <div className="overflow-hidden rounded-xl border border-border/60">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getPublicStorageUrl(primaryAsset.storage_bucket, primaryAsset.storage_path)}
                  alt="Main image"
                  className="h-48 w-full object-cover"
                />
              </div>
            </div>
          ) : null}
          {keyVisuals.length > 0 ? (
            <div className="space-y-2">
              <p className="font-medium">Image gallery</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {keyVisuals.map((asset) => (
                  <div key={asset.id} className="overflow-hidden rounded-xl border border-border/60">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getPublicStorageUrl(asset.storage_bucket, asset.storage_path)}
                      alt="Generated image"
                      className="h-28 w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {concept.one_liner ? (
            <p className="text-muted-foreground">{concept.one_liner}</p>
          ) : null}
          {concept.thesis ? (
            <div>
              <p className="font-medium">Core idea</p>
              <p className="text-muted-foreground">{concept.thesis}</p>
            </div>
          ) : null}
          {concept.share_triggers?.length ? (
            <div>
              <p className="font-medium">Why it spreads</p>
              <ul className="list-disc pl-5 text-muted-foreground">
                {concept.share_triggers.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {concept.cast_archetypes?.length ? (
            <div>
              <p className="font-medium">Character types</p>
              <ul className="list-disc pl-5 text-muted-foreground">
                {concept.cast_archetypes.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {concept.scalability ? (
            <div>
              <p className="font-medium">Growth potential</p>
              <p className="text-muted-foreground">{concept.scalability}</p>
            </div>
          ) : null}
          <div>
            <p className="font-medium">Variants</p>
            {variants.length === 0 ? (
              <p className="text-muted-foreground">No variants yet.</p>
            ) : (
              variants.map((variant) => (
                <div key={variant.id} className="rounded-lg border border-border/60 p-2">
                  <p className="font-medium">{variant.angle}</p>
                  {variant.summary ? (
                    <p className="text-muted-foreground">{variant.summary}</p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
