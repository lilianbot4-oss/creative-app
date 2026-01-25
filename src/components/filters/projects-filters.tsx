"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PROJECT_STATUSES } from "@/lib/constants";

export default function ProjectsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "all";

  const updateParams = (nextQuery: string, nextStatus: string) => {
    const params = new URLSearchParams(searchParams);
    if (nextQuery.trim().length > 0) {
      params.set("q", nextQuery.trim());
    } else {
      params.delete("q");
    }
    if (nextStatus && nextStatus !== "all") {
      params.set("status", nextStatus);
    } else {
      params.delete("status");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        className="max-w-xs"
        placeholder="Search projects"
        value={query}
        onChange={(event) => {
          const value = event.target.value;
          updateParams(value, status);
        }}
      />
      <Select
        value={status}
        onValueChange={(value) => {
          updateParams(query, value);
        }}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {PROJECT_STATUSES.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
