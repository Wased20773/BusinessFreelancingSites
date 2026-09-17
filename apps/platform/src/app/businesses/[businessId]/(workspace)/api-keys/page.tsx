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
import { formatDateTime } from "@/lib/time/formatDateTime";
import { useSession } from "next-auth/react";
import PageState from "@/components/ui/PageState";

export default function ApiKeysPage() {
  const params = useParams<{
    businessId: string;
  }>();

  const businessId = params.businessId;

  const { data: session, status } = useSession();

  const [apiKeyData, setApiKeyData] = useState<BusinessApiKeyJson[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentAccessLevel = session?.user?.accessLevel;
  const canManageApiKeys = currentAccessLevel === "developer";
  const canViewApiKeys =
    currentAccessLevel === "developer" ||
    currentAccessLevel === "owner" ||
    currentAccessLevel === "admin";
  const isStaff = currentAccessLevel === "staff";

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

    if (status === "authenticated" && canViewApiKeys) {
      void getApiKeyData();
    }
  }, [businessId, status, canViewApiKeys]);

  const pageState = PageState({
    status,
    isLoading,
    isDeveloper: isStaff,
    canView: canViewApiKeys,
    pageTitle: "API Keys",
    reason: "Your current access level does not include API key information.",
  });

  if (pageState) {
    return pageState;
  }

  return (
    <section
      className="mx-auto max-w-[1000px] p-5"
      aria-labelledby="api-keys-heading"
    >
      <div className="mb-6">
        <h1 id="api-keys-heading" className="text-3xl font-semibold">
          API Keys
        </h1>

        <p className="mt-1 text-gray-500">
          {canManageApiKeys
            ? "Connect and manage your business website using generated Business Platform API keys."
            : "View the API keys connected to this business."}
        </p>
      </div>

      <div className="space-y-5">
        {canManageApiKeys && (
          <nav
            aria-label="API key actions"
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-3 shadow-sm"
          >
            <ActionItem
              href={`/businesses/${businessId}/api-keys/create`}
              icon={AddIcon}
              label="Create API Key"
              setIsLoading={setIsLoading}
            />
          </nav>
        )}

        <section
          aria-labelledby="business-api-keys-heading"
          className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-300 px-5 py-4 sm:px-6">
            <div>
              <h2
                id="business-api-keys-heading"
                className="text-lg font-semibold text-gray-900"
              >
                Business API Keys
              </h2>

              <p className="mt-1 text-sm text-gray-600">
                {canManageApiKeys
                  ? "Manage the keys used to access your business data."
                  : "View keys currently configured for this business."}
              </p>
            </div>

            <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-sm tabular-nums text-gray-700">
              {apiKeyData.length} {apiKeyData.length === 1 ? "key" : "keys"}
            </span>
          </div>

          <div className="px-5 py-5 sm:px-6">
            {errorMessage ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p role="alert" className="text-sm text-red-700">
                  {errorMessage}
                </p>
              </div>
            ) : apiKeyData.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-5 py-8 text-center">
                <Image
                  src={KeyIcon}
                  alt=""
                  width={28}
                  height={28}
                  className="mx-auto mb-3 opacity-60"
                />

                <p className="font-semibold text-gray-900">
                  No API keys created
                </p>

                <p className="mt-1 text-sm text-gray-600">
                  {canManageApiKeys
                    ? "Create an API key when you're ready to connect a website to this business."
                    : "This business does not currently have any API keys."}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {apiKeyData.map((apiKey) => {
                  const keyContent = (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                            <Image
                              src={KeyIcon}
                              alt=""
                              width={20}
                              height={20}
                            />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900">
                              {apiKey.name}
                            </p>

                            <p className="mt-1 truncate font-mono text-xs text-gray-600">
                              {apiKey.keyPrefix}••••••••
                            </p>
                          </div>
                        </div>

                        <span
                          className={`shrink-0 rounded-md border px-2 py-1 text-xs font-medium ${
                            apiKey.isActive
                              ? "border-green-200 bg-green-50 text-green-700"
                              : "border-gray-200 bg-gray-100 text-gray-600"
                          }`}
                        >
                          {apiKey.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="mt-3 border-t border-gray-200 pt-2">
                        <p className="text-xs text-gray-600">
                          Created {formatDateTime(apiKey.createdAt, "date")}
                        </p>
                      </div>
                    </>
                  );

                  if (canManageApiKeys) {
                    return (
                      <Link
                        key={apiKey.id}
                        href={`/businesses/${businessId}/api-keys/${apiKey.id}`}
                        className="block rounded-lg border border-gray-200 p-3 transition-colors hover:border-gray-300 hover:bg-gray-50"
                        onClick={() => setIsLoading(true)}
                      >
                        {keyContent}
                      </Link>
                    );
                  }

                  return (
                    <div
                      key={apiKey.id}
                      className="rounded-lg border border-gray-200 p-3"
                    >
                      {keyContent}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
