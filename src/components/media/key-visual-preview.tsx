"use client";

import { useMemo, useState } from "react";
import { ImageOff, Search } from "lucide-react";
import ImageLightbox from "@/components/media/image-lightbox";
import { cn } from "@/lib/utils";

const ASPECT_CLASSES: Record<"hero" | "card" | "thumb", string> = {
  hero: "aspect-[16/9] max-h-[560px] print:max-h-[320px]",
  card: "aspect-[16/10] max-h-[260px]",
  thumb: "aspect-square max-h-[160px]",
};

export default function KeyVisualPreview({
  src,
  alt,
  label,
  enableLightbox = true,
  aspect = "card",
  className,
  priorityHint = false,
}: {
  src: string;
  alt: string;
  label?: string;
  enableLightbox?: boolean;
  aspect?: "hero" | "card" | "thumb";
  className?: string;
  priorityHint?: boolean;
}) {
  const [hasError, setHasError] = useState(false);
  const content = useMemo(() => {
    if (!src || hasError) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/30 text-xs text-muted-foreground">
          <ImageOff className="h-4 w-4" />
          <span>Image unavailable</span>
        </div>
      );
    }
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-contain"
          loading={priorityHint ? "eager" : "lazy"}
          decoding="async"
          onError={() => setHasError(true)}
        />
        {enableLightbox ? (
          <div className="no-print absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 opacity-0 transition hover:bg-black/45 hover:opacity-100">
            <div className="flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-[11px] font-medium text-white">
              <Search className="h-3.5 w-3.5" />
              Click to enlarge
            </div>
          </div>
        ) : null}
      </>
    );
  }, [alt, enableLightbox, hasError, priorityHint, src]);

  const frame = (
    <div
      className={cn(
        "group relative w-full overflow-hidden rounded-2xl border border-border/60 bg-muted/10 p-3",
        className
      )}
    >
      {label ? (
        <span className="no-print absolute left-3 top-3 z-10 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shadow-sm">
          {label}
        </span>
      ) : null}
      <div className={cn("relative w-full rounded-xl bg-background/60", ASPECT_CLASSES[aspect])}>
        {content}
      </div>
    </div>
  );

  if (!enableLightbox || !src || hasError) {
    return frame;
  }

  return (
    <ImageLightbox src={src} alt={alt} openInNewTab>
      <button type="button" className="w-full cursor-zoom-in text-left" aria-label={alt}>
        {frame}
      </button>
    </ImageLightbox>
  );
}
