"use client";

import ArrowIcon from "@/components/icons/arrow";
import PageState from "@/components/ui/PageState";
import { formatTime } from "@/lib/time/formatTime";
import { ACCESS_LEVEL, type DashboardOverviewJson } from "@/types/types";
import axios from "axios";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const cardClass =
  "overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm";

const cardLinkClass =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500";

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export default function OverviewPage() {
  const { businessId, locationId } = useParams<{
    businessId: string;
    locationId: string;
  }>();

  const [overviewData, setOverviewData] =
    useState<DashboardOverviewJson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: session, status } = useSession();
  const accessLevel = session?.user?.accessLevel;

  const canViewOverview =
    accessLevel === ACCESS_LEVEL.owner ||
    accessLevel === ACCESS_LEVEL.admin ||
    accessLevel === ACCESS_LEVEL.staff;

  const canManage =
    accessLevel === ACCESS_LEVEL.owner || accessLevel === ACCESS_LEVEL.admin;

  const isDeveloper = accessLevel === ACCESS_LEVEL.developer;

  useEffect(() => {
    if (status !== "authenticated" || !canViewOverview) return;

    async function getOverviewData() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const overviewToast = toast.promise<DashboardOverviewJson>(
          axios
            .get<DashboardOverviewJson>(
              `/api/businesses/${businessId}/locations/${locationId}/overview`,
            )
            .then((response) => response.data),
          {
            loading: "Loading dashboard overview...",
            success: "Dashboard overview loaded.",
            error: (error) => {
              if (axios.isAxiosError<{ error?: string }>(error)) {
                return {
                  message: "Failed to load dashboard overview.",
                  description:
                    error.response?.data?.error ??
                    `Status code: ${error.response?.status ?? "No response"}`,
                };
              }

              return {
                message: "Unexpected error.",
                description:
                  "Something went wrong while loading the dashboard overview.",
              };
            },
          },
        );

        setOverviewData(await overviewToast.unwrap());
      } catch (error) {
        console.error("Error in Overview page:", error);

        setErrorMessage(
          axios.isAxiosError<{ error?: string }>(error)
            ? (error.response?.data?.error ??
                "Failed to load dashboard overview.")
            : "Failed to load dashboard overview.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void getOverviewData();
  }, [businessId, locationId, status, canViewOverview]);

  const pageState = PageState({
    status,
    isLoading,
    isDeveloper,
    canView: canViewOverview,
    pageTitle: "Overview",
    reason:
      "Your current access level does not include dashboard overview access.",
  });

  if (pageState) return pageState;

  if (errorMessage && !overviewData) {
    return (
      <p role="alert" className="mx-auto max-w-[1000px] p-5 text-red-700">
        {errorMessage}
      </p>
    );
  }

  if (!overviewData) {
    return (
      <p className="mx-auto max-w-[1000px] p-5 text-gray-600">
        Dashboard overview data could not be found.
      </p>
    );
  }

  const { categories, items, contacts, socials, days, address } = overviewData;

  const subcategoryCount = categories.reduce(
    (total, category) => total + (category.subcategories?.length ?? 0),
    0,
  );

  const businessContactCount = contacts.filter(
    (contact) => !contact.isPersonal,
  ).length;

  const personalContactCount = contacts.filter(
    (contact) => contact.isPersonal,
  ).length;

  const basePath = `/businesses/${businessId}/locations/${locationId}/dashboard`;

  return (
    <section
      aria-labelledby="overview-heading"
      className="mx-auto w-full max-w-[1000px] px-5 py-8 sm:py-10"
    >
      <header className="mb-7">
        <h1
          id="overview-heading"
          className="text-3xl font-bold tracking-tight text-gray-900"
        >
          Overview
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          A quick look at this location’s hours, menu, and contact information.
        </p>
      </header>

      <div className="space-y-6">
        {/* Location and business hours */}
        <section aria-labelledby="location-heading" className={cardClass}>
          <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <h2
                id="location-heading"
                className="text-lg font-semibold text-gray-900"
              >
                Location
              </h2>
              <p className="mt-1 break-words text-sm text-gray-600">
                {address}
              </p>
            </div>

            <Link
              className={cardLinkClass}
              href={`${basePath}/location`}
              aria-label="Go to location page"
            >
              <ArrowIcon size={20} />
            </Link>
          </div>

          {days.length === 0 ? (
            <div className="px-5 py-8 sm:px-6">
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-5 py-8 text-center">
                <p className="font-medium text-gray-900">
                  No business days set up
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  {canManage
                    ? "Open the location page to set up business days and hours."
                    : "Business days and hours have not been added yet."}
                </p>
              </div>
            </div>
          ) : (
            <div className="px-5 py-2 sm:px-6">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[360px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-300 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <th scope="col" className="py-3 pr-4">
                        Day
                      </th>
                      <th scope="col" className="py-3 pr-4">
                        Status
                      </th>
                      <th scope="col" className="py-3 text-right">
                        Hours
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200">
                    {days.map((day) => (
                      <tr key={day.id}>
                        <th
                          scope="row"
                          className="py-3 pr-4 text-left font-medium text-gray-900"
                        >
                          {day.dayOfWeek}
                        </th>

                        <td className="py-3 pr-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                              day.isClosed
                                ? "bg-gray-100 text-gray-600"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            <span
                              aria-hidden="true"
                              className={`h-1.5 w-1.5 rounded-full ${
                                day.isClosed ? "bg-gray-400" : "bg-emerald-500"
                              }`}
                            />
                            {day.isClosed ? "Closed" : "Open"}
                          </span>
                        </td>

                        <td className="py-3 text-right tabular-nums text-gray-700">
                          {day.isClosed
                            ? "—"
                            : day.hour?.openTime
                              ? `${formatTime(day.hour.openTime)} – ${formatTime(day.hour.closeTime)}`
                              : "Hours not set"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <section
            aria-labelledby="menu-heading"
            className={`${cardClass} flex flex-col`}
          >
            <div className="flex items-center justify-between gap-3 px-5 pt-5">
              <h2
                id="menu-heading"
                className="text-lg font-semibold text-gray-900"
              >
                Menu
              </h2>
              <Link
                className={cardLinkClass}
                href={`${basePath}/menu`}
                aria-label="Go to menu page"
              >
                <ArrowIcon size={20} />
              </Link>
            </div>

            <div className="flex-1 px-5 pb-5 pt-4">
              <p className="text-xl font-semibold tabular-nums text-gray-900">
                {pluralize(items.length, "item")}
              </p>

              <div className="mt-5 space-y-2 border-t border-gray-200 pt-4 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-gray-600">Categories</span>
                  <span className="font-medium tabular-nums text-gray-900">
                    {categories.length}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-600">Subcategories</span>
                  <span className="font-medium tabular-nums text-gray-900">
                    {subcategoryCount}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section
            aria-labelledby="contacts-heading"
            className={`${cardClass} flex flex-col`}
          >
            <div className="flex items-center justify-between gap-3 px-5 pt-5">
              <h2
                id="contacts-heading"
                className="text-lg font-semibold text-gray-900"
              >
                Contacts
              </h2>
              <Link
                className={cardLinkClass}
                href={`${basePath}/contacts`}
                aria-label="Go to contacts page"
              >
                <ArrowIcon size={20} />
              </Link>
            </div>

            <div className="flex-1 px-5 pb-5 pt-4">
              <p className="text-xl font-semibold tabular-nums text-gray-900">
                {pluralize(contacts.length, "contact")}
              </p>

              <div className="mt-5 space-y-2 border-t border-gray-200 pt-4 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-gray-600">Business</span>
                  <span className="font-medium tabular-nums text-gray-900">
                    {businessContactCount}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-600">Personal</span>
                  <span className="font-medium tabular-nums text-gray-900">
                    {personalContactCount}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section
            aria-labelledby="socials-heading"
            className={`${cardClass} flex flex-col`}
          >
            <div className="flex items-center justify-between gap-3 px-5 pt-5">
              <h2
                id="socials-heading"
                className="text-lg font-semibold text-gray-900"
              >
                Socials
              </h2>
              <Link
                className={cardLinkClass}
                href={`${basePath}/socials`}
                aria-label="Go to socials page"
              >
                <ArrowIcon size={20} />
              </Link>
            </div>

            <div className="flex-1 px-5 pb-5 pt-4">
              <p className="text-xl font-semibold tabular-nums text-gray-900">
                {pluralize(socials.length, "social profile")}
              </p>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
