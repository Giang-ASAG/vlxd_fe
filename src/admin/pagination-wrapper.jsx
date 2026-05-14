import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function PaginationWrapper({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  pageSizeOptions = [10, 20, 50, 100],
  onPageSizeChange,
  pageSizeLabel = "Hiển thị",
}) {
  const showPager = totalPages > 1;
  const showPageSize = typeof onPageSizeChange === "function" && Number.isFinite(pageSize);

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let startPage = Math.max(1, currentPage - 2);
      let endPage = Math.min(totalPages, currentPage + 2);

      if (startPage === 1) {
        endPage = 5;
      } else if (endPage === totalPages) {
        startPage = totalPages - 4;
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }

    return pages.map((page) => (
      <PaginationItem key={page}>
        <PaginationLink
          href="#"
          isActive={currentPage === page}
          onClick={(e) => {
            e.preventDefault();
            onPageChange(page);
          }}
          className={cn(
            "rounded-lg transition-colors",
            currentPage === page && "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {page}
        </PaginationLink>
      </PaginationItem>
    ));
  };

  return (
    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      {showPageSize && (
        <div className="flex items-center gap-2">
          {pageSizeLabel ? (
            <span className="text-sm text-muted-foreground">{pageSizeLabel}</span>
          ) : null}
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger className="h-9 w-[90px] rounded-lg border-muted bg-muted/30 hover:bg-muted/50 transition-colors">
              <SelectValue placeholder="10" />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((opt) => (
                <SelectItem key={opt} value={String(opt)} className="cursor-pointer">
                  {opt} / trang
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {!showPager ? null : (
        <Pagination className="mt-0">
          <PaginationContent className="gap-1">
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1) onPageChange(currentPage - 1);
                }}
                className={cn(
                  "rounded-lg transition-colors",
                  currentPage === 1 && "pointer-events-none opacity-50"
                )}
              />
            </PaginationItem>
            
            {renderPageNumbers()}

            {totalPages > 5 && currentPage < totalPages - 2 && (
              <PaginationItem>
                <PaginationEllipsis className="rounded-lg" />
              </PaginationItem>
            )}

            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage < totalPages) onPageChange(currentPage + 1);
                }}
                className={cn(
                  "rounded-lg transition-colors",
                  currentPage === totalPages && "pointer-events-none opacity-50"
                )}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}