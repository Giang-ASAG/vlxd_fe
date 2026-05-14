"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function PageSizeSelect({
  pageSize,
  onChange,
  options = DEFAULT_PAGE_SIZE_OPTIONS,
  className = "h-8 w-fit",
}) {
  if (typeof onChange !== "function") return null;

  return (
    <Select value={String(pageSize)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt} value={String(opt)}>
            {opt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

