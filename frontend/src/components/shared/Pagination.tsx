interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visible = pages.filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
  );

  // Insert ellipsis markers
  const withEllipsis: (number | '...')[] = [];
  for (let i = 0; i < visible.length; i++) {
    if (i > 0 && visible[i] - visible[i - 1] > 1) withEllipsis.push('...');
    withEllipsis.push(visible[i]);
  }

  return (
    <nav className="flex items-center justify-center gap-1 mt-4" aria-label="Pagination">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="px-3 py-1.5 rounded text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        aria-label="Previous page"
      >
        ‹
      </button>

      {withEllipsis.map((item, idx) =>
        item === '...' ? (
          <span key={`ellipsis-${idx}`} className="px-2 text-gray-400 text-sm">
            …
          </span>
        ) : (
          <button
            key={item}
            onClick={() => onPageChange(item as number)}
            aria-current={item === page ? 'page' : undefined}
            className={`px-3 py-1.5 rounded text-sm cursor-pointer transition-colors duration-150 ${
              item === page
                ? 'bg-teal-600 text-white font-semibold'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {item}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="px-3 py-1.5 rounded text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        aria-label="Next page"
      >
        ›
      </button>
    </nav>
  );
}
