import Skeleton from "../Skeleton";

/*
 *   Placeholder business cards for /businesses while the list loads. Same grid
 *   and card size as BusinessList.
 **/
export default function BusinessListSkeleton() {
  return (
    <div role="status" aria-label="Loading your businesses">
      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <li
            key={index}
            className="space-y-2 rounded-lg border border-gray-100 px-4 py-4 shadow-md"
          >
            <Skeleton className="h-6 w-40 max-w-full" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-5 h-4 w-28" />
          </li>
        ))}
      </ul>
      <span className="sr-only">Loading your businesses</span>
    </div>
  );
}
