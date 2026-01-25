"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";

export default function ClientsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";

  const applySearch = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value.trim().length > 0) {
      params.set("q", value.trim());
    } else {
      params.delete("q");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="max-w-xs">
      <Input
        placeholder="Search clients"
        value={query}
        onChange={(event) => {
          const value = event.target.value;
          applySearch(value);
        }}
      />
    </div>
  );
}
