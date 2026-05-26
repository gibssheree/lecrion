import { useState, useMemo } from "react";

export interface PaginationResult<T> {
  slice: T[];
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  from: number;
  to: number;
  hasPrev: boolean;
  hasNext: boolean;
  setPage: (p: number) => void;
  prev: () => void;
  next: () => void;
}

export function usePagination<T>(
  items: T[],
  pageSize = 20,
): PaginationResult<T> {
  const [page, setPageState] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const slice = useMemo(
    () => items.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [items, currentPage, pageSize],
  );

  function setPage(p: number) {
    setPageState(Math.max(1, Math.min(totalPages, p)));
  }

  return {
    slice,
    page: currentPage,
    totalPages,
    totalItems: items.length,
    pageSize,
    from: items.length === 0 ? 0 : (currentPage - 1) * pageSize + 1,
    to: Math.min(currentPage * pageSize, items.length),
    hasPrev: currentPage > 1,
    hasNext: currentPage < totalPages,
    setPage,
    prev: () => setPage(currentPage - 1),
    next: () => setPage(currentPage + 1),
  };
}
