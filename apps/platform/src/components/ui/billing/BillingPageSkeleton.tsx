import Skeleton from "../Skeleton";

const cardClass =
  "rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6";

/*
 *   Placeholder for the business Billing page while it loads: the current plan
 *   card, the four plans (two per row), and the location slots card.
 **/
export default function BillingPageSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label="Loading billing"
      className="mx-auto max-w-[1000px] p-5"
    >
      <Skeleton className="h-9 w-32" />
      <Skeleton className="mt-3 h-4 w-96 max-w-full" />

      <div className="mt-6 space-y-5">
        {/* Current plan */}
        <div>
          <Skeleton className="mb-3 h-7 w-36" />
          <div className={`${cardClass} space-y-4`}>
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-56 max-w-full" />
            <Skeleton className="h-9 w-40 rounded-lg" />
          </div>
        </div>

        {/* Plans */}
        <div className="mt-8">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-3/4" />

          <div className="mt-6 grid gap-3 px-3 md:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className={`${cardClass} space-y-3`}>
                <Skeleton className="h-6 w-36" />
                <Skeleton className="h-8 w-24" />
                {Array.from({ length: 4 }, (_, row) => (
                  <Skeleton key={row} className="h-4 w-48 max-w-full" />
                ))}
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>

        {/* Location slots */}
        <div className="mt-8">
          <Skeleton className="mb-3 h-7 w-40" />
          <div className={`${cardClass} space-y-4`}>
            <Skeleton className="h-4 w-64 max-w-full" />
            <Skeleton className="h-9 w-36 rounded-lg" />
          </div>
        </div>
      </div>
    </section>
  );
}
