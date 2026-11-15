import Skeleton, { SkeletonRows } from "./Skeleton";

export type SkeletonField =
  | "input"
  | "textarea"
  | "checkbox"
  | "image"
  // A list inside the form, like an item's options.
  | "rows"
  // One day of the week: an open checkbox and its open/close times.
  | "day";

// Varied label widths so the placeholder looks like a real form.
const labelWidths = ["w-24", "w-32", "w-20", "w-28", "w-16"];

function Field({ kind, index }: { kind: SkeletonField; index: number }) {
  const labelWidth = labelWidths[index % labelWidths.length];

  switch (kind) {
    case "checkbox":
      return (
        <div className="flex items-center gap-2">
          <Skeleton className="size-5 rounded" />
          <Skeleton className={`h-4 ${labelWidth}`} />
        </div>
      );
    case "textarea":
      return (
        <div className="space-y-2">
          <Skeleton className={`h-4 ${labelWidth}`} />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      );
    case "image":
      return (
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="size-32 rounded-lg" />
        </div>
      );
    case "day":
      return (
        <div className="space-y-3 rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2">
            <Skeleton className="size-5 rounded" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>
      );
    case "rows":
      return (
        <div className="space-y-2">
          <Skeleton className="h-5 w-24" />
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <SkeletonRows rows={2} label="Loading options" />
          </div>
        </div>
      );
    default:
      return (
        <div className="space-y-2">
          <Skeleton className={`h-4 ${labelWidth}`} />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      );
  }
}

/*
 *   Placeholder for an edit page while its record loads: the page heading,
 *   then one form card with the given fields and a button bar. Pass the same
 *   fields the real form has so it drops into place without the page jumping.
 **/
export default function FormPageSkeleton({
  label,
  fields,
  showDelete = true,
}: {
  label: string;
  fields: SkeletonField[];
  showDelete?: boolean;
}) {
  return (
    <section
      aria-busy="true"
      aria-label={label}
      className="max-w-[1000px] mx-auto p-5 pt-0"
    >
      {/* Same height as the page heading */}
      <div className="flex h-[70px] items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <Skeleton className="h-8 w-44" />
      </div>

      <div className="mt-[0.5rem] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="space-y-5 p-5 sm:p-6">
          <Skeleton className="h-5 w-36" />
          {fields.map((kind, index) => (
            <Field key={index} kind={kind} index={index} />
          ))}
        </div>

        <div
          className={`flex items-center gap-3 border-t border-gray-300 bg-gray-50 px-5 py-4 sm:px-6 ${
            showDelete ? "justify-between" : "justify-end"
          }`}
        >
          {showDelete && <Skeleton className="h-9 w-32 rounded-lg" />}
          <Skeleton className="h-9 w-20 rounded-lg" />
        </div>
      </div>
    </section>
  );
}
