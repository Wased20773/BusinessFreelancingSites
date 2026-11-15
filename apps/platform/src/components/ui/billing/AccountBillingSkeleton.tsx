import Skeleton from "../Skeleton";

const CARD = "rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6";

/*
 *   Placeholder for Settings → Billing while it loads: total spent, your
 *   subscriptions, payment history, and payment methods.
 **/
export default function AccountBillingSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label="Loading your billing"
      className="mx-auto max-w-[1000px] p-5"
    >
      <Skeleton className="h-9 w-28" />
      <Skeleton className="mt-3 h-4 w-96 max-w-full" />

      <div className="mt-6 space-y-5">
        {/* Total spent */}
        <div className={`${CARD} space-y-2`}>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-4 w-48 max-w-full" />
        </div>

        {/* Subscriptions */}
        <div className={CARD}>
          <Skeleton className="h-5 w-40" />
          <ul className="mt-3 divide-y divide-gray-200">
            {Array.from({ length: 2 }, (_, index) => (
              <li
                key={index}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="space-y-2">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-3 w-56 max-w-full" />
                </div>
                <Skeleton className="h-9 w-24 rounded-lg" />
              </li>
            ))}
          </ul>
        </div>

        {/* Payment history */}
        <div className={CARD}>
          <Skeleton className="h-5 w-36" />
          <div className="mt-3 divide-y divide-gray-100">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="flex items-center gap-3 py-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-14" />
              </div>
            ))}
          </div>
        </div>

        {/* Payment methods */}
        <div className={CARD}>
          <Skeleton className="h-5 w-40" />
          <div className="mt-3 space-y-3">
            {Array.from({ length: 2 }, (_, index) => (
              <div key={index} className="flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-48 max-w-full" />
                <Skeleton className="h-8 w-20 rounded-lg" />
              </div>
            ))}
          </div>
          <Skeleton className="mt-4 h-9 w-32 rounded-lg" />
        </div>
      </div>
    </section>
  );
}
