"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import PrintButton from "@/components/app/print-button";

export default function ExportControls() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [includeReferences, setIncludeReferences] = useState(true);
  const [includeFeedback, setIncludeFeedback] = useState(true);
  const [includeAppendix, setIncludeAppendix] = useState(true);
  const [includeProvenance, setIncludeProvenance] = useState(false);
  const [includeGallery, setIncludeGallery] = useState(true);
  const [includeConcepts, setIncludeConcepts] = useState(true);
  const [includeScripts, setIncludeScripts] = useState(true);

  useEffect(() => {
    setIncludeReferences(searchParams.get("refs") !== "false");
    setIncludeFeedback(searchParams.get("feedback") !== "false");
    setIncludeAppendix(searchParams.get("appendix") !== "false");
    setIncludeProvenance(searchParams.get("provenance") === "true");
    setIncludeGallery(searchParams.get("gallery") !== "false");
    setIncludeConcepts(searchParams.get("concepts") !== "false");
    setIncludeScripts(searchParams.get("scripts") !== "false");
  }, [searchParams]);

  const updateParam = (key: string, value: boolean) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.delete(key);
    } else {
      params.set(key, "false");
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="no-print flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeReferences}
            onChange={(event) => {
              setIncludeReferences(event.target.checked);
              updateParam("refs", event.target.checked);
            }}
          />
          Show references
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeFeedback}
            onChange={(event) => {
              setIncludeFeedback(event.target.checked);
              updateParam("feedback", event.target.checked);
            }}
          />
          Show feedback
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeConcepts}
            onChange={(event) => {
              setIncludeConcepts(event.target.checked);
              updateParam("concepts", event.target.checked);
            }}
          />
          Show ideas
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeScripts}
            onChange={(event) => {
              setIncludeScripts(event.target.checked);
              updateParam("scripts", event.target.checked);
            }}
          />
          Show scripts
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeAppendix}
            onChange={(event) => {
              setIncludeAppendix(event.target.checked);
              updateParam("appendix", event.target.checked);
            }}
          />
          Show additional results
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeProvenance}
            onChange={(event) => {
              setIncludeProvenance(event.target.checked);
              updateParam("provenance", event.target.checked);
            }}
          />
          Show origin info (internal)
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeGallery}
            onChange={(event) => {
              setIncludeGallery(event.target.checked);
              updateParam("gallery", event.target.checked);
            }}
          />
          Show image gallery
        </label>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => router.back()}>
          Back
        </Button>
        <PrintButton />
      </div>
    </div>
  );
}
