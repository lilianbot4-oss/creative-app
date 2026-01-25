"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Concept, ConceptVariant } from "@/lib/types";

export default function ConceptDetail({
  concept,
  variants,
}: {
  concept: Concept;
  variants: ConceptVariant[];
}) {
  const [open, setOpen] = useState(false);

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
          {concept.one_liner ? (
            <p className="text-muted-foreground">{concept.one_liner}</p>
          ) : null}
          {concept.thesis ? (
            <div>
              <p className="font-medium">Thesis</p>
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
              <p className="font-medium">Cast archetypes</p>
              <ul className="list-disc pl-5 text-muted-foreground">
                {concept.cast_archetypes.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {concept.scalability ? (
            <div>
              <p className="font-medium">Scalability</p>
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
