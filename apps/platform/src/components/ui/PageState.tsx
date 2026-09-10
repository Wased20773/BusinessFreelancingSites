import LoadingBar from "@/components/ui/LoadingBar";

type PageStateProps = {
  status?: "loading" | "authenticated" | "unauthenticated";
  isLoading?: boolean;
  isDeveloper?: boolean | null;
  canView?: boolean;
  pageTitle: string;
  reason?: string;
};

// TODO: Make classname 'dashboard-card' component defined; `${variant}-card`
// TODO: The title and heading for the (isDeveloper || !canView) condition should
//       be different. Maybe only include one after verifying...
export default function PageState({
  status,
  isLoading,
  isDeveloper,
  canView,
  pageTitle,
  reason,
}: PageStateProps) {
  if (isDeveloper || !canView) {
    return (
      <section
        aria-labelledby="restricted-heading"
        className="max-w-[1000px] mx-auto p-5"
      >
        <h1 id="restricted-heading">{pageTitle}</h1>

        <div className="mt-[1.5rem]">
          <div className="dashboard-card">
            <h2 className="text-xl font-semibold">{pageTitle} unavailable</h2>

            <p className="text-gray-500 mt-1">{reason}</p>
          </div>
        </div>
      </section>
    );
  }

  if (status === "loading" || isLoading) {
    return <LoadingBar />;
  }

  if (status === "unauthenticated") {
    return <p className="p-5">You must be signed in to view this page.</p>;
  }

  return null;
}
