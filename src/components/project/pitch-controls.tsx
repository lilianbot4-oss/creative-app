"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import PrintButton from "@/components/app/print-button";

export default function PitchControls() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [includeConstraints, setIncludeConstraints] = useState(true);
  const [includeAppendix, setIncludeAppendix] = useState(true);
  const [includeReferences, setIncludeReferences] = useState(true);
  const [includeFeedback, setIncludeFeedback] = useState(false);
  const [includeProvenance, setIncludeProvenance] = useState(false);
  const [includeGallery, setIncludeGallery] = useState(false);

  useEffect(() => {
    setIncludeConstraints(searchParams.get("constraints") !== "false");
    setIncludeAppendix(searchParams.get("appendix") !== "false");
    setIncludeReferences(searchParams.get("refs") !== "false");
    setIncludeFeedback(searchParams.get("feedback") === "true");
    setIncludeProvenance(searchParams.get("provenance") === "true");
    setIncludeGallery(searchParams.get("gallery") === "true");
  }, [searchParams]);

  const updateParam = (key: string, value: boolean, truthyValue = "true") => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, truthyValue);
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
            checked={includeConstraints}
            onChange={(event) => {
              setIncludeConstraints(event.target.checked);
              updateParam("constraints", event.target.checked);
            }}
          />
          Show constraints
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
              updateParam("feedback", event.target.checked, "true");
            }}
          />
          Show feedback
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeProvenance}
            onChange={(event) => {
              setIncludeProvenance(event.target.checked);
              updateParam("provenance", event.target.checked, "true");
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
              updateParam("gallery", event.target.checked, "true");
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
