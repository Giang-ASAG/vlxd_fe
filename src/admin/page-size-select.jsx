"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function PageSizeSelect({
  pageSize,
  onChange,
  options = DEFAULT_PAGE_SIZE_OPTIONS,
  className = "h-9 w-[90px]",
}) {
  if (typeof onChange !== "function") return null;

  return (
    <Select value={String(pageSize)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger className={cn(
        "border-muted bg-muted/30 hover:bg-muted/50 transition-colors",
        className
      )}>
        <SelectValue placeholder="10" />
      </SelectTrigger>
      <SelectContent className="min-w-[80px]">
        {options.map((opt) => (
          <SelectItem key={opt} value={String(opt)} className="cursor-pointer">
            {opt} / trang
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}