import Skeleton from "../Skeleton";

const cardClass =
  "overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm";

/*
 *   Placeholder for the Location page while it loads: the address heading,
 *   the location information card, and the business days card.
 **/
export default function LocationPageSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label="Loading location"
      className="max-w-[1000px] mx-auto p-5"
    >
      <Skeleton className="h-9 w-64 max-w-full" />

      <div className="mt-6 space-y-5">
        <div className={cardClass}>
          <div className="flex items-center justify-between border-b border-gray-300 px-5 py-4 sm:px-6">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="size-12 rounded-lg" />
          </div>
          <div className="grid gap-x-6 gap-y-4 px-5 py-5 sm:grid-cols-2 sm:px-6">
            {["w-40", "w-24", "w-20", "w-16", "w-28", "w-10", "w-10", "w-10"].map(
              (width, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className={`h-4 ${width}`} />
                </div>
              ),
            )}
          </div>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between border-b border-gray-300 px-5 py-4 sm:px-6">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="size-12 rounded-lg" />
          </div>
          <ul className="divide-y divide-gray-200">
            {Array.from({ length: 7 }, (_, index) => (
              <li key={index} className="flex items-center justify-between px-5 py-3 sm:px-6">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
