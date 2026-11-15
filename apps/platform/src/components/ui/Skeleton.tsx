import { cn } from "@/lib/utils";

/*
 *   A grey placeholder block with a soft pulse, shown where content will
 *   appear once it loads. Size it with className (e.g. "h-4 w-32").
 *   The pulse stops for users with "reduce motion" turned on.
 **/
export default function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      // cn() lets a className override the defaults (e.g. a red bg in a danger zone).
      className={cn(
        "animate-pulse rounded-md bg-gray-200 motion-reduce:animate-none",
        className,
      )}
    />
  );
}

/*
 *   Placeholder rows for a list card (categories, items). Matches the real
 *   rows' height so the page doesn't jump when the data arrives.
 **/
export function SkeletonRows({
  rows = 4,
  showReorder = false,
  label,
}: {
  rows?: number;
  showReorder?: boolean;
  label: string;
}) {
  // Varied widths so the rows look like real names, not a grid of bars.
  const widths = ["w-40", "w-28", "w-48", "w-32", "w-36", "w-24"];

  return (
    <div role="status" aria-label={label}>
      <ul className="divide-y divide-gray-200">
        {Array.from({ length: rows }, (_, index) => (
          <li key={index} className="flex items-center gap-3 px-3 py-3">
            {showReorder && <Skeleton className="h-9 w-16 shrink-0" />}

            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className={`h-4 max-w-full ${widths[index % widths.length]}`} />
              <Skeleton className="h-3 w-16" />
            </div>

            <Skeleton className="size-6 shrink-0" />
          </li>
        ))}
      </ul>
      <span className="sr-only">{label}</span>
    </div>
  );
}
