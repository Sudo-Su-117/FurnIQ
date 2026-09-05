import React from 'react'
import './Pagination.css'

/**
 * Reusable Pagination component
 * Props:
 *   total      – total number of items
 *   page       – current page (1-indexed)
 *   pageSize   – items per page (default 10)
 *   onChange   – (page) => void
 */
export default function Pagination({ total, page, pageSize = 10, onChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1 && total <= pageSize) return null

  const from = (page - 1) * pageSize + 1
  const to   = Math.min(page * pageSize, total)

  /* Build visible page numbers with ellipsis */
  const pages = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3)            pages.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('...')
    pages.push(totalPages)
  }

  return (
    <div className="pg-wrap">
      <span className="pg-count">
        Showing {from}–{to} of {total}
      </span>
      <div className="pg-controls" role="navigation" aria-label="Pagination">
        {/* Prev */}
        <button
          className="pg-btn pg-btn--nav"
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
        >
          ‹
        </button>

        {/* Page numbers */}
        {pages.map((p, i) =>
          p === '...'
            ? <span key={`ellipsis-${i}`} className="pg-ellipsis">…</span>
            : (
              <button
                key={p}
                className={`pg-btn${p === page ? ' pg-btn--active' : ''}`}
                onClick={() => onChange(p)}
                aria-current={p === page ? 'page' : undefined}
                aria-label={`Page ${p}`}
              >
                {p}
              </button>
            )
        )}

        {/* Next */}
        <button
          className="pg-btn pg-btn--nav"
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Next page"
        >
          ›
        </button>
      </div>
    </div>
  )
}

/** usePagination hook — call in page component */
export function usePagination(data, pageSize = 10) {
  const [page, setPage] = React.useState(1)

  // Reset to page 1 whenever data changes (filter/search)
  React.useEffect(() => { setPage(1) }, [data.length])

  const totalPages = Math.ceil(data.length / pageSize)
  const paged      = data.slice((page - 1) * pageSize, page * pageSize)

  return { page, setPage, paged, total: data.length, totalPages, pageSize }
}
