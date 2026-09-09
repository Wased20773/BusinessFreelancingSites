"use client";

import "./page.css";
import Divider from "@/components/layout/Divider";
import ArrowIcon from "@/components/icons/arrow";
import Link from "next/link";
import PageState from "@/components/ui/PageState";
import { ACCESS_LEVEL, type DashboardOverviewJson } from "@/types/types";
import axios from "axios";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import "./page.css";
import { formatTime } from "@/lib/time/formatTime";

export default function OverviewPage() {
  const params = useParams<{
    businessId: string;
    locationId: string;
  }>();

  const businessId = params.businessId;
  const locationId = params.locationId;

  const [overviewData, setOverviewData] =
    useState<DashboardOverviewJson | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: session, status } = useSession();
  const accessLevel = session?.user?.accessLevel;
  const canViewOverview =
    accessLevel === ACCESS_LEVEL.owner ||
    accessLevel === ACCESS_LEVEL.admin ||
    accessLevel === ACCESS_LEVEL.staff;
  const isDeveloper = accessLevel === ACCESS_LEVEL.developer;

  useEffect(() => {
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

        const data = await overviewToast.unwrap();

        setOverviewData(data);
      } catch (error) {
        console.error("Error in Overview page:", error);

        if (axios.isAxiosError<{ error?: string }>(error)) {
          setErrorMessage(
            error.response?.data?.error ?? "Failed to load dashboard overview.",
          );
        } else {
          setErrorMessage("Failed to load dashboard overview.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    if (status === "authenticated" && canViewOverview) {
      void getOverviewData();
    }
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

  if (pageState) {
    return pageState;
  }

  if (errorMessage && !overviewData) {
    return (
      <p role="alert" className="p-5">
        {errorMessage}
      </p>
    );
  }

  if (!overviewData) {
    return <p className="p-5">Dashboard overview data could not be found.</p>;
  }

  /*
   * ##############################
   * ##### OVERVIEW DATA ##########
   * ##############################
   */

  // Base data
  const categories = overviewData.categories;
  const items = overviewData.items;
  const contacts = overviewData.contacts;
  const socials = overviewData.socials;

  // Counts
  const categoryCount = categories.length;

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

  return (
    <section
      aria-labelledby="overview-heading"
      className="max-w-[1000px] mx-auto p-5"
    >
      <h1 id="overview-heading">Overview</h1>

      <div className="mt-[1.5rem]">
        <section>
          {/* Location */}
          <div className="dashboard-card flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h2>Location</h2>
              <Link
                className="p-2"
                href={`/businesses/${businessId}/locations/${locationId}/dashboard/location`}
                aria-label="Go to location page"
                onClick={() => setIsLoading(true)}
              >
                <ArrowIcon size={35} />
              </Link>
            </div>

            <div className="px-2 rounded-lg ">
              {/* Header */}
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold">{overviewData.address}</span>
              </div>

              {/* Body */}
              <table className="w-full [&_td]:py-3 [&_th]:px-2 [&_th]:py-1">
                <thead>
                  <tr className="border-b-[0.1rem] border-gray-500">
                    <th className="mx-auto font-semibold">Open</th>
                    <th className="text-left font-semibold">Day</th>
                    <th className="text-right font-semibold">Hour</th>
                  </tr>
                </thead>

                <tbody>
                  {overviewData.days.map((day, idx) => (
                    <tr
                      key={day.id}
                      className={[
                        `border-gray-200`,
                        overviewData.days.length !== idx + 1 &&
                          "border-b-[0.1rem]",
                      ].join(" ")}
                    >
                      <td>
                        <div
                          className={[
                            `border rounded-full w-[0.75rem] h-[0.75rem] mx-auto`,
                            day.isClosed ? "bg-red-400" : "bg-green-400",
                          ].join(" ")}
                        ></div>
                      </td>

                      <td>{day.dayOfWeek}</td>

                      <td className="text-right">
                        {day.hour?.openTime
                          ? `${formatTime(day.hour.openTime)} - ${formatTime(day.hour.closeTime)}`
                          : "---"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Divider />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Category */}
            <div className="dashboard-card flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <h2>Menu</h2>

                <Link
                  href={`/businesses/${businessId}/locations/${locationId}/dashboard/menu`}
                  aria-label="Go to menu page"
                  onClick={() => setIsLoading(true)}
                >
                  <ArrowIcon size={35} />
                </Link>
              </div>

              <div className="px-3">
                <p>
                  {categoryCount === 0
                    ? `${categoryCount} categories`
                    : categoryCount === 1
                      ? `${categoryCount} category`
                      : `${categoryCount} categories`}
                </p>
                <p>
                  {subcategoryCount === 0
                    ? `${subcategoryCount} subcategories`
                    : subcategoryCount === 1
                      ? `${subcategoryCount} subcategory`
                      : `${subcategoryCount} subcategories`}
                </p>
                <p>
                  {items.length === 0
                    ? `${items.length} items`
                    : items.length === 1
                      ? `${items.length} item`
                      : `${items.length} items`}
                </p>
              </div>
            </div>

            {/* Contacts */}
            <div className="dashboard-card flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <h2>Contacts</h2>
                <Link
                  href={`/businesses/${businessId}/locations/${locationId}/dashboard/contacts`}
                >
                  <ArrowIcon size={35} />
                </Link>
              </div>

              <div className="px-3">
                <p>
                  {contacts.length === 0
                    ? `${contacts.length} contacts`
                    : contacts.length === 1
                      ? `${contacts.length} contact`
                      : `${contacts.length} contacts`}
                </p>
                <p>
                  {businessContactCount === 0
                    ? `${businessContactCount} business contacts`
                    : businessContactCount === 1
                      ? `${businessContactCount} business contact`
                      : `${businessContactCount} business contacts`}
                </p>
                <p>
                  {personalContactCount === 0
                    ? `${personalContactCount} personal contacts`
                    : personalContactCount === 1
                      ? `${personalContactCount} personal contact`
                      : `${personalContactCount} personal contacts`}
                </p>
              </div>
            </div>

            <div className="dashboard-card flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <h2>Socials</h2>
                <Link
                  href={`/businesses/${businessId}/locations/${locationId}/dashboard/socials`}
                >
                  <ArrowIcon size={35} />
                </Link>
              </div>

              <div className="px-3">
                <p>
                  {socials.length === 0
                    ? `${socials.length} socials`
                    : socials.length === 1
                      ? `${socials.length} social`
                      : `${socials.length} socials`}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
