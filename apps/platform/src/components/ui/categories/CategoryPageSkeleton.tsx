import Skeleton, { SkeletonRows } from "../Skeleton";

const cardClass =
  "overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm";

function CardHeading({ width }: { width: string }) {
  return (
    <div className="border-b border-gray-300 px-5 py-4 sm:px-6">
      <Skeleton className={`h-6 ${width}`} />
    </div>
  );
}

/*
 *   Placeholder for a category or subcategory page while its data loads. It has
 *   the same layout as the real page (heading, actions, info, items, and
 *   subcategories) so the content drops into place without the page jumping.
 **/
export default function CategoryPageSkeleton({
  canManage,
  showSubcategories,
}: {
  canManage: boolean;
  showSubcategories: boolean;
}) {
  return (
    <section
      aria-busy="true"
      aria-label="Loading category"
      className="max-w-[1000px] mx-auto p-5 pt-0"
    >
      {/* Same height as the page heading */}
      <div className="flex h-[70px] items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <Skeleton className="h-8 w-48" />
      </div>

      <div className="mt-[0.5rem] space-y-5">
        {canManage && (
          <div className={`${cardClass} space-y-3 p-4`}>
            <Skeleton className="h-8 w-40" />
            {showSubcategories && <Skeleton className="h-8 w-48" />}
          </div>
        )}

        <div className={cardClass}>
          <CardHeading width="w-52" />
          <div className="grid gap-x-6 gap-y-4 px-5 py-5 sm:grid-cols-2 sm:px-6">
            {["w-32", "w-10", "w-64", "w-12"].map((width, index) => (
              <div
                key={index}
                className={`space-y-2 ${index === 2 ? "sm:col-span-2" : ""}`}
              >
                <Skeleton className="h-3 w-20" />
                <Skeleton className={`h-4 max-w-full ${width}`} />
              </div>
            ))}
          </div>
        </div>

        <div className={cardClass}>
          <CardHeading width="w-16" />
          <SkeletonRows showReorder={canManage} label="Loading items" />
        </div>

        {showSubcategories && (
          <div className={cardClass}>
            <CardHeading width="w-36" />
            <SkeletonRows
              rows={2}
              showReorder={canManage}
              label="Loading subcategories"
            />
          </div>
        )}
      </div>
    </section>
  );
}
