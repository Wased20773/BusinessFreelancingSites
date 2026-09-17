"use client";

import { getApiKeys } from "@/lib/api/apiKeys";
import { getBusiness } from "@/lib/api/business";
import { getLocations } from "@/lib/api/locations";
import { getBusinessUsers } from "@/lib/api/users";
import { formatDateTime } from "@/lib/time/formatDateTime";
import { ACCESS_LEVEL, type BusinessJson } from "@/types/types";
import axios from "axios";
import { ExternalLink } from "lucide-react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import PageState from "@/components/ui/PageState";

export default function WorkspacePage() {
  const params = useParams<{
    businessId: string;
  }>();

  const businessId = params.businessId;

  const [businessData, setBusinessData] = useState<BusinessJson | null>(null);
  const [locationCount, setLocationCount] = useState<number>(0);
  const [memberCount, setMemberCount] = useState<number>(0);
  const [apiKeyCount, setApiKeyCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: session, status } = useSession();
  const currentAccessLevel = session?.user?.accessLevel;

  const canViewOverview =
    currentAccessLevel === ACCESS_LEVEL.owner ||
    currentAccessLevel === ACCESS_LEVEL.admin ||
    currentAccessLevel === ACCESS_LEVEL.staff ||
    currentAccessLevel === ACCESS_LEVEL.developer;

  const canViewLocations =
    currentAccessLevel === ACCESS_LEVEL.owner ||
    currentAccessLevel === ACCESS_LEVEL.admin ||
    currentAccessLevel === ACCESS_LEVEL.staff;

  const canViewMembers =
    currentAccessLevel === ACCESS_LEVEL.owner ||
    currentAccessLevel === ACCESS_LEVEL.admin ||
    currentAccessLevel === ACCESS_LEVEL.staff;

  const canViewApiKeys =
    currentAccessLevel === ACCESS_LEVEL.owner ||
    currentAccessLevel === ACCESS_LEVEL.admin ||
    currentAccessLevel === ACCESS_LEVEL.developer;

  useEffect(() => {
    async function getOverviewData() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        /*
         * Only request resources the current access
         * level is actually allowed to view.
         *
         * Promise.resolve(null) keeps Promise.all nice
         * and predictable without making the request.
         */
        const overviewToast = toast.promise(
          Promise.all([
            getBusiness(businessId),

            canViewLocations ? getLocations(businessId) : Promise.resolve(null),

            canViewMembers
              ? getBusinessUsers(businessId)
              : Promise.resolve(null),

            canViewApiKeys ? getApiKeys(businessId) : Promise.resolve(null),
          ]),
          {
            loading: "Loading business overview...",
            success: "Business overview loaded.",

            error: (error) => {
              if (axios.isAxiosError<{ error?: string }>(error)) {
                return {
                  message: "Failed to load business overview.",

                  description:
                    error.response?.data?.error ??
                    `Status code: ${error.response?.status ?? "No response"}`,
                };
              }

              return {
                message: "Unexpected error.",

                description:
                  "Something went wrong while loading the business overview.",
              };
            },
          },
        );

        const [business, locations, members, apiKeys] =
          await overviewToast.unwrap();

        setBusinessData(business);

        if (locations) {
          setLocationCount(locations.length);
        }

        if (members) {
          /*
           * Keeping your existing behavior:
           * getBusinessUsers() does not include the
           * authenticated user in this count.
           */
          setMemberCount(members.length + 1);
        }

        if (apiKeys) {
          setApiKeyCount(apiKeys.length);
        }
      } catch (error) {
        console.error("Error in business overview page:", error);

        if (axios.isAxiosError<{ error?: string }>(error)) {
          setErrorMessage(
            error.response?.data?.error ?? "Failed to load business overview.",
          );
        } else {
          setErrorMessage("Failed to load business overview.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    if (status === "authenticated" && canViewOverview) {
      void getOverviewData();
    }
  }, [
    businessId,
    status,
    canViewLocations,
    canViewMembers,
    canViewApiKeys,
    canViewOverview,
  ]);

  const pageState = PageState({
    status,
    isLoading,
    isDeveloper: false,
    canView: canViewOverview,
    pageTitle: "Overview",
    reason: "Your current access level does not include overview information.",
  });

  if (pageState) {
    return pageState;
  }

  if (errorMessage) {
    return <p className="p-5">{errorMessage}</p>;
  }

  if (!businessData) {
    return <p className="p-5">Business could not be found.</p>;
  }

  return (
    <section
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
        {/* Business Identity */}
        <section
          aria-labelledby="business-identity-heading"
          className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
        >
          <div className="border-b border-gray-300 px-5 py-4 sm:px-6">
            <h2
              id="business-identity-heading"
              className="text-lg font-semibold text-gray-900"
            >
              Business
            </h2>
          </div>

          <div className="px-5 py-5 sm:px-6">
            <p className="text-xl font-semibold text-gray-900">
              {businessData.name}
            </p>

            {businessData.domain && (
              <a
                href={`https://${businessData.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex max-w-full items-center gap-2 break-all text-sm text-blue-700 hover:underline"
              >
                <ExternalLink size={15} className="shrink-0" />
                https://{businessData.domain}
              </a>
            )}

            <p className="mt-3 text-sm text-gray-600">
              Created {formatDateTime(businessData.createdAt, "date")}
            </p>
          </div>
        </section>

        {/* Workspace Summary */}
        <section
          aria-labelledby="workspace-summary-heading"
          className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
        >
          <div className="border-b border-gray-300 px-5 py-4 sm:px-6">
            <h2
              id="workspace-summary-heading"
              className="text-lg font-semibold text-gray-900"
            >
              Workspace Summary
            </h2>

            <p className="mt-1 text-sm text-gray-600">
              Resources available to you within this business.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 px-5 py-5 sm:px-6">
            {canViewLocations && (
              <div className="min-w-[160px] flex-[1_1_160px] rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm text-gray-600">Locations</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
                  {locationCount}
                </p>
              </div>
            )}

            {canViewMembers && (
              <div className="min-w-[160px] flex-[1_1_160px] rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm text-gray-600">Members</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
                  {memberCount}
                </p>
              </div>
            )}

            {canViewApiKeys && (
              <div className="min-w-[160px] flex-[1_1_160px] rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm text-gray-600">API Keys</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
                  {apiKeyCount}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
