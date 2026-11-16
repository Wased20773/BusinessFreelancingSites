import { ChevronLeft, ChevronRight } from "lucide-react";

type PageNavProps = {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  // What's being paged, for screen readers, e.g. "Payment history pages".
  label: string;
  className?: string;
};

const pageButtonClass =
  "flex size-9 items-center justify-center rounded-lg border border-gray-300 text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40";

/*
 *   Previous / next buttons, centered, with "Page 2 of 5" between them.
 *   Hidden when everything fits on one page.
 **/
export default function PageNav({
  page,
  pageCount,
  onChange,
  label,
  className = "mt-4",
}: PageNavProps) {
  if (pageCount <= 1) return null;

  return (
    <nav
      aria-label={label}
      className={`${className} flex items-center justify-center gap-3`}
    >
      <button
        type="button"
        className={pageButtonClass}
        aria-label="Previous page"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft size={18} />
      </button>

      <span className="text-sm tabular-nums text-gray-600" aria-live="polite">
        Page {page} of {pageCount}
      </span>

      <button
        type="button"
        className={pageButtonClass}
        aria-label="Next page"
        disabled={page === pageCount}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight size={18} />
      </button>
    </nav>
  );
}
