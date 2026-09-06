"use client";

import ActionItem from "@/components/ui/ActionItem";
import { useParams } from "next/navigation";
import KeyIcon from "@/components/icons/key.svg";
import AddIcon from "@/components/icons/add.svg";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import type { BusinessApiKeyJson } from "@/types/types";
import { getApiKeys } from "@/lib/api/apiKeys";
import "../page.css";
import { formatDateTime } from "@/lib/dateTime/formatDateTime";
import { useSession } from "next-auth/react";
import LoadingBar from "@/components/ui/LoadingBar";

export default function ApiKeysPage() {
  const params = useParams<{
    businessId: string;
  }>();

  const businessId = params.businessId;

  const { data: session, status } = useSession();

  const [apiKeyData, setApiKeyData] = useState<BusinessApiKeyJson[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const accessLevel = session?.user?.accessLevel;

  const canManageApiKeys = accessLevel === "developer";

  const canViewApiKeys =
    accessLevel === "developer" ||
    accessLevel === "owner" ||
    accessLevel === "admin";

  const isStaff = accessLevel === "staff";

  useEffect(() => {
    async function getApiKeyData() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const apiKeyResponse = toast.promise<BusinessApiKeyJson[]>(
          getApiKeys(businessId),
          {
            loading: "Loading API keys...",
            success: "API keys loaded.",
            error: (error) => {
              if (axios.isAxiosError<{ error?: string }>(error)) {
                return {
                  message: "Failed to load API keys.",
                  description:
                    error.response?.data?.error ??
                    `Status code: ${error.response?.status ?? "No response"}`,
                };
              }

              return {
                message: "Unexpected error.",
                description: "Something went wrong while loading the API keys.",
              };
            },
          },
        );

        const data = await apiKeyResponse.unwrap();

        setApiKeyData(data);
      } catch (error) {
        console.error("Error in API Keys page:", error);

        if (axios.isAxiosError<{ error?: string }>(error)) {
          setErrorMessage(
            error.response?.data?.error ?? "Failed to load API keys.",
          );
        } else {
          setErrorMessage("Failed to load API keys.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    /*
     * Only Developer, Owner, and Admin should
     * retrieve API key information.
     *
     * Staff should not even make this request.
     */
    if (status === "authenticated" && canViewApiKeys) {
      void getApiKeyData();
    }
  }, []);

  if (status === "loading" || isLoading) {
    return <LoadingBar />;
  }

  if (status === "unauthenticated") {
    return <p className="p-5">You must be signed in to view this page.</p>;
  }

  /*
   * Staff cannot view API-key information.
   */
  if (isStaff || !canViewApiKeys) {
    return (
      <section className="max-w-[1000px] mx-auto p-5">
        <div className="border border-gray-300 rounded-xl p-5">
          <h1 className="text-2xl font-semibold">API Keys unavailable</h1>

          <p className="text-gray-500 mt-1">
            Your current access level does not include API key information.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="max-w-[1000px] mx-auto p-5"
      aria-labelledby="api-keys-heading"
    >
      {/* Heading */}
      <div className="mb-6">
        <h1 id="api-keys-heading" className="text-3xl font-semibold">
          API Keys
        </h1>

        <p className="text-gray-500 mt-1">
          {canManageApiKeys
            ? "Connect and manage your business website using generated Business Platform API keys."
            : "View the API keys connected to this business."}
        </p>
      </div>

      {/* Developer Actions */}
      {canManageApiKeys && (
        <section className="workspace-card mb-5">
          <ActionItem
            href={`/businesses/${businessId}/api-keys/create`}
            icon={AddIcon}
            label="Create API Key"
            setIsLoading={setIsLoading}
          />
        </section>
      )}

      {/* API Keys */}
      <section className="border border-gray-300 rounded-xl p-5">
        <div className="flex flex-col gap-1 mb-4 sm:flex-row sm:justify-between sm:items-start sm:gap-4">
          <div>
            <h2 className="text-xl font-semibold">Business API Keys</h2>

            <p className="text-sm text-gray-500 mt-1">
              {canManageApiKeys
                ? "Manage the keys used to access your business data."
                : "View keys currently configured for this business."}
            </p>
          </div>

          <span className="text-sm text-gray-500 sm:whitespace-nowrap">
            {apiKeyData.length} {apiKeyData.length === 1 ? "key" : "keys"}
          </span>
        </div>

        {errorMessage ? (
          <div className="border border-red-200 bg-red-50 rounded-lg p-4">
            <p className="text-red-700">{errorMessage}</p>
          </div>
        ) : apiKeyData.length === 0 ? (
          <div className="border border-dashed border-gray-300 rounded-lg px-5 py-8 text-center">
            <Image
              src={KeyIcon}
              alt=""
              width={28}
              height={28}
              className="mx-auto mb-3 opacity-60"
            />

            <p className="font-semibold">No API keys created</p>

            <p className="text-sm text-gray-500 mt-1">
              {canManageApiKeys
                ? "Create an API key when you're ready to connect a website to this business."
                : "This business does not currently have any API keys."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {apiKeyData.map((apiKey) => {
              const keyContent = (
                <>
                  {/* Name + Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex justify-center items-center w-10 h-10 rounded-lg bg-gray-100 shrink-0">
                        <Image src={KeyIcon} alt="" width={20} height={20} />
                      </div>

                      <div className="min-w-0">
                        <p className="font-medium truncate">{apiKey.name}</p>

                        <p className="text-sm text-gray-500 font-mono truncate mt-1">
                          {apiKey.keyPrefix}••••••••
                        </p>
                      </div>
                    </div>

                    <span
                      className={`
                        shrink-0
                        text-xs font-medium
                        rounded-md border px-2 py-1
                        ${
                          apiKey.isActive
                            ? "border-green-200 bg-green-50 text-green-700"
                            : "border-gray-200 bg-gray-100 text-gray-500"
                        }
                      `}
                    >
                      {apiKey.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* Metadata */}
                  <div className="border-t border-gray-200 mt-4 pt-3">
                    <p className="text-sm text-gray-500">
                      Created {formatDateTime(apiKey.createdAt, "date")}
                    </p>
                  </div>
                </>
              );

              /*
               * Developer:
               * clickable row -> edit/detail page
               *
               * Owner/Admin:
               * same information, but view-only
               */
              if (canManageApiKeys) {
                return (
                  <Link
                    key={apiKey.id}
                    href={`/businesses/${businessId}/api-keys/${apiKey.id}`}
                    className="
                      block
                      border border-gray-200 rounded-lg
                      p-4
                      hover:bg-gray-50
                      hover:border-gray-300
                      transition-colors
                    "
                    onClick={() => setIsLoading(true)}
                  >
                    {keyContent}
                  </Link>
                );
              }

              return (
                <div
                  key={apiKey.id}
                  className="
                    block
                    border border-gray-200 rounded-lg
                    p-4
                  "
                >
                  {keyContent}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}
