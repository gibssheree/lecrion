import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PaginationResult } from "../../hooks/usePagination";

type Props = Pick<
  PaginationResult<unknown>,
  "page" | "totalPages" | "totalItems" | "from" | "to" | "hasPrev" | "hasNext" | "prev" | "next" | "setPage"
>;

export default function Pagination({
  page,
  totalPages,
  totalItems,
  from,
  to,
  hasPrev,
  hasNext,
  prev,
  next,
  setPage,
}: Props) {
  if (totalItems === 0 || totalPages <= 1) return null;

  // Build page window: always show 1, last, and ±1 of current
  const pages: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
  }

  return (
    <div className="pagination">
      <span className="pagination-info">
        {from}–{to} dari {totalItems}
      </span>
      <div className="pagination-controls">
        <button className="pagination-btn" onClick={prev} disabled={!hasPrev} aria-label="Halaman sebelumnya">
          <ChevronLeft size={13} />
        </button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`d${i}`} className="pagination-dots">…</span>
          ) : (
            <button
              key={p}
              className={`pagination-btn${page === p ? " pagination-btn--active" : ""}`}
              onClick={() => setPage(p as number)}
            >
              {p}
            </button>
          ),
        )}
        <button className="pagination-btn" onClick={next} disabled={!hasNext} aria-label="Halaman berikutnya">
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}
