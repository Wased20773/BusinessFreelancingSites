import Skeleton from "./Skeleton";

/*
 *   Placeholder for a page that shows one record's details: a heading, a short
 *   description, one card split into sections of label/value pairs, and
 *   optionally a red danger zone underneath (delete, leave, remove).
 *
 *   `sections` is how many label/value pairs each section of the card has,
 *   e.g. [4, 1, 2] for info (4), settings (1), and activity (2).
 **/
export default function DetailPageSkeleton({
  label,
  sections,
  hasBackLink = true,
  showDanger = false,
  maxWidthClass = "max-w-[1000px]",
}: {
  label: string;
  sections: number[];
  // true: the page has a back arrow heading (PageHeading); false: a plain title.
  hasBackLink?: boolean;
  showDanger?: boolean;
  maxWidthClass?: string;
}) {
  return (
    <section
      aria-busy="true"
      aria-label={label}
      className={`${maxWidthClass} mx-auto p-5 ${hasBackLink ? "pt-0" : ""}`}
    >
      {hasBackLink ? (
        <div className="flex h-[70px] items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <Skeleton className="h-8 w-48" />
        </div>
      ) : (
        <Skeleton className="h-9 w-40" />
      )}

      <Skeleton className="mt-3 h-4 w-80 max-w-full" />

      <div className="mt-5 divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white shadow-sm">
        {sections.map((rows, sectionIndex) => (
          <div key={sectionIndex} className="space-y-4 p-5 sm:p-6">
            <Skeleton className="h-6 w-44" />
            <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {Array.from({ length: rows }, (_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className={`h-4 ${index % 2 ? "w-28" : "w-44"} max-w-full`} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showDanger && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-5">
          <div className="space-y-2">
            <Skeleton className="h-6 w-36 bg-red-100" />
            <Skeleton className="h-4 w-64 max-w-full bg-red-100" />
          </div>
          <Skeleton className="h-9 w-28 rounded-lg bg-red-100" />
        </div>
      )}
    </section>
  );
}
