"use client";

import { ExternalLink, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ImageLightbox({
  src,
  alt,
  children,
  openInNewTab = false,
  className,
}: {
  src: string;
  alt: string;
  children: React.ReactNode;
  openInNewTab?: boolean;
  className?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "no-print flex h-[90vh] w-[95vw] max-w-[95vw] flex-col gap-3 border border-white/10 bg-black/85 p-4 text-white shadow-2xl sm:w-[95vw] sm:max-w-[95vw]",
          className
        )}
      >
        <DialogHeader>
          <DialogTitle className="sr-only">{alt || "Image preview"}</DialogTitle>
        </DialogHeader>
        <div className="no-print flex items-center justify-between gap-2">
          {openInNewTab ? (
            <Button
              size="sm"
              variant="secondary"
              asChild
              className="text-xs"
            >
              <a href={src} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                Open in new tab
              </a>
            </Button>
          ) : (
            <div />
          )}
          <DialogClose asChild>
            <Button size="sm" variant="ghost" className="text-white">
              <X className="h-4 w-4" />
              Close
            </Button>
          </DialogClose>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="max-h-[90vh] max-w-[95vw] object-contain"
            loading="eager"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
