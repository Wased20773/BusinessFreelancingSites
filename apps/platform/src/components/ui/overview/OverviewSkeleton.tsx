import Skeleton from "../Skeleton";

const cardClass =
  "overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm";

function SummaryCardSkeleton({ rows }: { rows: number }) {
  return (
    <div className={`${cardClass} flex flex-col`}>
      <div className="flex items-center justify-between gap-3 px-5 pt-5">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="size-9 rounded-lg" />
      </div>
      <div className="flex-1 px-5 pb-5 pt-4">
        <Skeleton className="h-7 w-28" />
        {rows > 0 && (
          <div className="mt-5 space-y-3 border-t border-gray-200 pt-4">
            {Array.from({ length: rows }, (_, index) => (
              <div key={index} className="flex justify-between gap-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-6" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/*
 *   Placeholder for the Overview page while it loads. The heading is real text
 *   (it never changes), and the cards are placeholders in the same layout.
 **/
export default function OverviewSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-labelledby="overview-heading"
      className="mx-auto w-full max-w-[1000px] px-5 py-8 sm:py-10"
    >
      <header className="mb-7">
        <h1
          id="overview-heading"
          className="text-3xl font-bold tracking-tight text-gray-900"
        >
          Overview
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          A quick look at this location’s hours, menu, and contact information.
        </p>
      </header>

      <div className="space-y-6">
        <div className={cardClass}>
          <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 sm:px-6">
            <div className="space-y-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-56 max-w-full" />
            </div>
            <Skeleton className="size-9 rounded-lg" />
          </div>
          <ul className="divide-y divide-gray-200 px-5 py-2 sm:px-6">
            {Array.from({ length: 7 }, (_, index) => (
              <li key={index} className="flex items-center justify-between gap-4 py-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCardSkeleton rows={2} />
          <SummaryCardSkeleton rows={2} />
          <SummaryCardSkeleton rows={0} />
        </div>
      </div>

      <span className="sr-only" role="status">
        Loading overview
      </span>
    </section>
  );
}
