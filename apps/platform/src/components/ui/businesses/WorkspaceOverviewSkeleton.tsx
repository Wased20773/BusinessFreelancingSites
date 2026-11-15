import Skeleton from "../Skeleton";

const cardClass =
  "overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm";

/*
 *   Placeholder for the workspace Overview while it loads. The heading is real
 *   text (it never changes); the Business and Workspace Summary cards are
 *   placeholders in the same layout.
 **/
export default function WorkspaceOverviewSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-labelledby="workspace-overview-heading"
      className="mx-auto max-w-[1000px] p-5"
    >
      <div className="mb-5">
        <h1 id="workspace-overview-heading" className="text-3xl font-semibold">
          Overview
        </h1>
        <p className="mt-2 text-gray-500">
          View your business details and workspace activity.
        </p>
      </div>

      <div className="space-y-5">
        <div className={cardClass}>
          <div className="border-b border-gray-300 px-5 py-4 sm:px-6">
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="space-y-3 px-5 py-5 sm:px-6">
            <Skeleton className="h-7 w-56 max-w-full" />
            <Skeleton className="h-4 w-48 max-w-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        <div className={cardClass}>
          <div className="space-y-2 border-b border-gray-300 px-5 py-4 sm:px-6">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
          <div className="flex flex-wrap gap-3 px-5 py-5 sm:px-6">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="min-w-[160px] flex-[1_1_160px] space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-4"
              >
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-10" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <span className="sr-only" role="status">
        Loading overview
      </span>
    </section>
  );
}
