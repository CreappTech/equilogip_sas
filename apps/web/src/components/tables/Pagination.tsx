import React from "react";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  const visiblePages = pages.filter(
    (p) =>
      p === 1 ||
      p === totalPages ||
      Math.abs(p - currentPage) <= 1
  );

  return (
    <div className="flex items-center">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="mr-2 flex h-8 items-center justify-center rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
      >
        Anterior
      </button>
      <div className="flex items-center gap-2">
        {visiblePages.map((page, idx) => {
          const isGap =
            idx > 0 && page - visiblePages[idx - 1] > 1;
          return (
            <React.Fragment key={page}>
              {isGap && <span className="px-1 text-gray-400">…</span>}
              <button
                onClick={() => onPageChange(page)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium ${
                  currentPage === page
                    ? "bg-brand-500 text-white"
                    : "text-gray-700 hover:bg-blue-500/[0.08] hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-500"
                }`}
              >
                {page}
              </button>
            </React.Fragment>
          );
        })}
      </div>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="ml-2 flex h-8 items-center justify-center rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
      >
        Siguiente
      </button>
    </div>
  );
};

export default Pagination;
