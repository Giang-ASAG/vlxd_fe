import { useEffect, useMemo, useState } from "react";

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function usePagination(
  items,
  initialPageSize = 10,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS
) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const safeTotalItems = Array.isArray(items) ? items.length : 0;
  const safePageSize = Math.max(1, Number(pageSize) || 10);
  const totalPages = Math.max(1, Math.ceil(safeTotalItems / safePageSize));

  const paginatedItems = useMemo(() => {
    if (!Array.isArray(items)) return [];
    const start = (currentPage - 1) * safePageSize;
    const end = start + safePageSize;
    return items.slice(start, end);
  }, [items, currentPage, safePageSize]);

  const goToPage = (page) => {
    const pageNumber = Math.max(1, Math.min(Number(page) || 1, totalPages));
    setCurrentPage(pageNumber);
  };

  const nextPage = () => goToPage(currentPage + 1);
  const prevPage = () => goToPage(currentPage - 1);

  useEffect(() => {
    // Clamp currentPage when items/pageSize changes (e.g. after filtering)
    if (currentPage > totalPages) setCurrentPage(totalPages);
    if (currentPage < 1) setCurrentPage(1);
  }, [currentPage, totalPages]);

  useEffect(() => {
    // When changing page size, reset back to page 1 for predictable UX
    setCurrentPage(1);
  }, [safePageSize]);

  const rangeStart = safeTotalItems === 0 ? 0 : (currentPage - 1) * safePageSize + 1;
  const rangeEnd = safeTotalItems === 0 ? 0 : Math.min(currentPage * safePageSize, safeTotalItems);

  return {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage,
    nextPage,
    prevPage,
    setCurrentPage,
    pageSize: safePageSize,
    setPageSize,
    pageSizeOptions,
    totalItems: safeTotalItems,
    rangeStart,
    rangeEnd,
  };
}
