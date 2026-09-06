"use client";

import { getApiKeys } from "@/lib/api/apiKeys";
import { getBusiness } from "@/lib/api/business";
import { getLocations } from "@/lib/api/locations";
import { getBusinessUsers } from "@/lib/api/users";
import { formatDateTime } from "@/lib/dateTime/formatDateTime";
import type { BusinessJson } from "@/types/types";
import axios from "axios";
import { ExternalLink } from "lucide-react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import LoadingBar from "@/components/ui/LoadingBar";

export default function WorkspacePage() {
  const params = useParams<{
    businessId: string;
  }>();

  const businessId = params.businessId;

  const { data: session, status } = useSession();
  const [businessData, setBusinessData] = useState<BusinessJson | null>(null);
  const [locationCount, setLocationCount] = useState<number>(0);
  const [memberCount, setMemberCount] = useState<number>(0);
  const [apiKeyCount, setApiKeyCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const accessLevel = session?.user?.accessLevel;

  /*
   * Location information is part of the normal
   * business workspace.
   *
   * Developers are limited to developer resources.
   */
  const canViewLocations =
    accessLevel === "owner" ||
    accessLevel === "admin" ||
    accessLevel === "staff";

  /*
   * Member information is visible to:
   *
   * Owner/Admin -> manageable
   * Staff       -> read-only
   * Developer   -> unavailable
   */
  const canViewMembers =
    accessLevel === "owner" ||
    accessLevel === "admin" ||
    accessLevel === "staff";

  /*
   * API key information is visible to:
   *
   * Developer   -> manageable
   * Owner/Admin -> read-only
   * Staff       -> unavailable
   */
  const canViewApiKeys =
    accessLevel === "developer" ||
    accessLevel === "owner" ||
    accessLevel === "admin";

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

    /*
     * Wait until Auth knows which business role
     * is currently selected before deciding which
     * overview requests should run.
     */
    if (status === "authenticated") {
      void getOverviewData();
    }
  }, []);

  if (status === "loading") {
    return <LoadingBar />;
  }

  if (status === "unauthenticated") {
    return <p className="p-5">You must be signed in to view this page.</p>;
  }

  if (isLoading) {
    return <LoadingBar />;
  }

  if (errorMessage) {
    return <p className="p-5">{errorMessage}</p>;
  }

  if (!businessData) {
    return <p className="p-5">Business could not be found.</p>;
  }

  return (
    <section className="max-w-[1000px] mx-auto p-5">
      {/* Heading */}
      <div className="mb-6">
        <h1 className="text-3xl font-semibold">Overview</h1>

        <p className="text-gray-500 mt-1">
          View your business details and workspace activity.
        </p>
      </div>

      {/* Business Identity */}
      <section className="border border-gray-300 rounded-xl p-5 mb-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold">{businessData.name}</h2>

          {businessData.domain && (
            <a
              href={`https://${businessData.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:underline w-fit"
            >
              <ExternalLink size={15} />
              https://{businessData.domain}
            </a>
          )}

          <p className="text-sm text-gray-500 mt-2">
            Created {formatDateTime(businessData.createdAt, "date")}
          </p>
        </div>
      </section>

      {/* Workspace Summary */}
      <section className="border border-gray-300 rounded-xl p-5">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Workspace Summary</h2>

          <p className="text-sm text-gray-500 mt-1">
            Resources available to you within this business.
          </p>
        </div>

        <div
          className={`
            grid grid-cols-1 gap-3
            ${
              canViewLocations && canViewMembers && canViewApiKeys
                ? "sm:grid-cols-2 md:grid-cols-3"
                : "sm:grid-cols-2"
            }
          `}
        >
          {/* Locations */}
          {canViewLocations && (
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-500">Locations</p>

              <p className="text-3xl font-semibold mt-1">{locationCount}</p>
            </div>
          )}

          {/* Members */}
          {canViewMembers && (
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-500">Members</p>

              <p className="text-3xl font-semibold mt-1">{memberCount}</p>
            </div>
          )}

          {/* API Keys */}
          {canViewApiKeys && (
            <div
              className={`
                border border-gray-200
                rounded-lg p-4
                ${
                  canViewLocations && canViewMembers
                    ? "sm:col-span-2 sm:w-1/2 sm:justify-self-center md:col-span-1 md:w-full"
                    : ""
                }
              `}
            >
              <p className="text-sm text-gray-500">API Keys</p>

              <p className="text-3xl font-semibold mt-1">{apiKeyCount}</p>
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
