"use client";

import { getApiKeys } from "@/lib/api/apiKeys";
import { getBusiness } from "@/lib/api/business";
import { getLocations } from "@/lib/api/locations";
import { getBusinessUsers } from "@/lib/api/users";
import { formatDateTime } from "@/lib/dateTime/formatDateTime";
import { BusinessJson } from "@/types/types";
import axios from "axios";
import { ExternalLink } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function WorkspacePage() {
  const params = useParams<{
    businessId: string;
  }>();
  const [businessData, setBusinessData] = useState<BusinessJson | null>(null);
  const [locationCount, setLocationCount] = useState<number>(0);
  const [memberCount, setMemberCount] = useState<number>(0);
  const [apiKeyCount, setApiKeyCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const businessId = params.businessId;

  useEffect(() => {
    async function getOverviewData() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const overViewToast = toast.promise(
          Promise.all([
            getBusiness(businessId),
            getLocations(businessId),
            getBusinessUsers(businessId),
            getApiKeys(businessId),
          ]),
          {
            loading: "Loading business...",
            success: "Business loaded.",
            error: (error) => {
              if (axios.isAxiosError<{ error?: string }>(error)) {
                return {
                  message: "Failed to load business.",
                  description:
                    error.response?.data?.error ??
                    `Status code: ${error.response?.status ?? "No response"}`,
                };
              }

              return {
                message: "Unexpected error.",
                description: "Something went wrong while loading the business.",
              };
            },
          },
        );

        const [business, locations, members, apiKeys] =
          await overViewToast.unwrap();

        setBusinessData(business);
        setLocationCount(locations.length);
        // count auth user
        setMemberCount(members.length + 1);
        setApiKeyCount(apiKeys.length);
      } catch (error) {
        console.error("Error in business page:", error);

        if (axios.isAxiosError<{ error?: string }>(error)) {
          setErrorMessage(
            error.response?.data?.error ?? "Failed to load business data.",
          );
        } else {
          setErrorMessage("Failed to load business data.");
        }
      } finally {
        setIsLoading(false);
      }
    }
    void getOverviewData();
  }, [businessId]);

  if (isLoading) return <p>Loading business...</p>;

  if (!businessData) return <p>Business could not be found.</p>;

  return (
    <section className="max-w-[1000px] mx-auto">
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
              className="flex items-center gap-2 text-sm text-blue-600 hover:underline w-fit"
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
            Resources currently connected to this business.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-500">Locations</p>
            <p className="text-3xl font-semibold mt-1">{locationCount}</p>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-500">Members</p>
            <p className="text-3xl font-semibold mt-1">{memberCount}</p>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 sm:col-span-2 sm:w-1/2 sm:justify-self-center md:col-span-1 md:w-full">
            <p className="text-sm text-gray-500">API Keys</p>
            <p className="text-3xl font-semibold mt-1">{apiKeyCount}</p>
          </div>
        </div>
      </section>
    </section>
  );
}
