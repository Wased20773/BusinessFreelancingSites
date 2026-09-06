"use client";

import ArrowIcon from "@/components/icons/arrow";
import EditIcon from "@/components/icons/edit.svg";
import ExitIconBlack from "@/components/icons/exit-black.svg";
import RequiredField from "@/components/ui/RequiredField";
import { formatDateTime } from "@/lib/dateTime/formatDateTime";
import {
  deleteBusinessApiKey,
  getApiKeys,
  updateBusinessApiKey,
} from "@/lib/api/apiKeys";
import type { BusinessApiKeyJson } from "@/types/types";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { SubmitEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import LoadingBar from "@/components/ui/LoadingBar";
import { useSession } from "next-auth/react";

export default function ApiKeyDetailsPage() {
  const params = useParams<{
    businessId: string;
    apiKeyId: string;
  }>();

  const businessId = params.businessId;
  const apiKeyId = params.apiKeyId;

  const router = useRouter();

  const [apiKeyData, setApiKeyData] = useState<BusinessApiKeyJson | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Edit
  const [isEdit, setIsEdit] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [selectedName, setSelectedName] = useState<string>("");
  const [selectedIsActive, setSelectedIsActive] = useState<boolean>(true);

  // Delete
  const [clickedDelete, setClickedDelete] = useState<boolean>(false);
  const [loadingDelete, setLoadingDelete] = useState<boolean>(false);
  const [deleteVerification, setDeleteVerification] = useState<string>("");

  const { status } = useSession();

  useEffect(() => {
    async function getApiKeyData() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const apiKeyToast = toast.promise<BusinessApiKeyJson[]>(
          getApiKeys(businessId),
          {
            loading: "Loading API key...",
            success: "API key loaded.",
            error: (error) => {
              if (axios.isAxiosError<{ error?: string }>(error)) {
                return {
                  message: "Failed to load API key.",
                  description:
                    error.response?.data?.error ??
                    `Status code: ${error.response?.status ?? "No response"}`,
                };
              }

              return {
                message: "Unexpected error.",
                description: "Something went wrong while loading the API key.",
              };
            },
          },
        );

        const data = await apiKeyToast.unwrap();

        const selectedApiKey = data.find((apiKey) => apiKey.id === apiKeyId);

        if (!selectedApiKey) {
          setApiKeyData(null);
          setErrorMessage("API key could not be found.");
          return;
        }

        setApiKeyData(selectedApiKey);
        setSelectedName(selectedApiKey.name);
        setSelectedIsActive(selectedApiKey.isActive);
      } catch (error) {
        console.error("Error in API Key page:", error);

        if (axios.isAxiosError<{ error?: string }>(error)) {
          setErrorMessage(
            error.response?.data?.error ?? "Failed to load API key.",
          );
        } else {
          setErrorMessage("Failed to load API key.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    void getApiKeyData();
  }, []);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!apiKeyData) return;

    const name = selectedName.trim();

    if (!name) {
      setErrorMessage("API key name is required.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const updateToast = toast.promise(
        updateBusinessApiKey(businessId, apiKeyData.id, {
          name,
          isActive: selectedIsActive,
        }),
        {
          loading: "Updating API key...",
          success: (data) => ({
            message: "API key updated.",
            description: `${data.name} was updated successfully.`,
          }),
          error: (error) => {
            if (axios.isAxiosError<{ error?: string }>(error)) {
              return {
                message: "Failed to update API key.",
                description:
                  error.response?.data?.error ??
                  `Status code: ${error.response?.status ?? "No response"}`,
              };
            }

            return {
              message: "Unexpected error.",
              description: "Something went wrong while updating the API key.",
            };
          },
        },
      );

      const updatedApiKey = await updateToast.unwrap();

      /*
       * PATCH only returns the fields it selects,
       * so preserve the fields from the original record.
       */
      setApiKeyData((current) =>
        current
          ? {
              ...current,
              ...updatedApiKey,
            }
          : current,
      );

      setSelectedName(updatedApiKey.name);
      setSelectedIsActive(updatedApiKey.isActive);

      setIsEdit(false);
    } catch (error) {
      console.error("Failed to update API key:", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setErrorMessage(
          error.response?.data?.error ?? "Failed to update API key.",
        );
      } else {
        setErrorMessage("Failed to update API key.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  function cancelEdit() {
    if (!apiKeyData) return;

    setSelectedName(apiKeyData.name);
    setSelectedIsActive(apiKeyData.isActive);
    setErrorMessage(null);
    setIsEdit(false);
  }

  async function handleDelete(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!apiKeyData) return;

    if (deleteVerification !== apiKeyData.name) {
      return;
    }

    setLoadingDelete(true);
    setErrorMessage(null);

    try {
      const deleteToast = toast.promise(
        deleteBusinessApiKey(businessId, apiKeyData.id),
        {
          loading: "Deleting API key...",
          success: (data) => ({
            message: "API key deleted.",
            description: data.message,
          }),
          error: (error) => {
            if (axios.isAxiosError<{ error?: string }>(error)) {
              return {
                message: "Failed to delete API key.",
                description:
                  error.response?.data?.error ??
                  `Status code: ${error.response?.status ?? "No response"}`,
              };
            }

            return {
              message: "Unexpected error.",
              description: "Something went wrong while deleting the API key.",
            };
          },
        },
      );

      await deleteToast.unwrap();

      router.push(`/businesses/${businessId}/api-keys`);
    } catch (error) {
      console.error("Failed to delete API key:", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setErrorMessage(
          error.response?.data?.error ?? "Failed to delete API key.",
        );
      } else {
        setErrorMessage("Failed to delete API key.");
      }
    } finally {
      setLoadingDelete(false);
    }
  }

  if (status === "loading") {
    return <LoadingBar />;
  }

  if (status === "unauthenticated") {
    return <p className="p-5">You must be signed in to view this page.</p>;
  }

  if (isLoading) {
    return <LoadingBar />;
  }

  if (!apiKeyData) {
    return (
      <p className="p-5">{errorMessage ?? "API key could not be found."}</p>
    );
  }

  return (
    <section
      className="max-w-[1000px] mx-auto p-5"
      aria-labelledby="api-key-heading"
    >
      {/* Heading */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/businesses/${businessId}/api-keys`}
          aria-label="Return to API keys"
          onClick={() => setIsLoading(true)}
        >
          <ArrowIcon direction="left" size={42} />
        </Link>

        <div className="min-w-0">
          <h1 id="api-key-heading" className="text-3xl font-semibold truncate">
            {apiKeyData.name}
          </h1>

          <p className="text-gray-500 mt-1">
            View and manage this Business Platform API key.
          </p>
        </div>
      </div>

      {/* Main Information */}
      <section className="border border-gray-300 rounded-xl p-5">
        {/* Key Information */}
        <div>
          <h2 className="text-xl font-semibold">API Key Information</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mt-4">
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="font-medium mt-1">{apiKeyData.name}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Status</p>

              <span
                className={`
                  inline-flex mt-1
                  rounded-md border
                  px-2 py-1
                  text-sm font-medium
                  ${
                    apiKeyData.isActive
                      ? "border-green-200 bg-green-50 text-green-700"
                      : "border-gray-200 bg-gray-100 text-gray-500"
                  }
                `}
              >
                {apiKeyData.isActive ? "Active" : "Inactive"}
              </span>
            </div>

            <div>
              <p className="text-sm text-gray-500">Key Identifier</p>
              <p className="font-mono text-sm mt-1 break-all">
                {apiKeyData.keyPrefix}••••••••
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 my-6" />

        {/* Settings */}
        <div>
          <div className="flex justify-between items-start gap-4">
            <div>
              <h2 className="text-xl font-semibold">Settings</h2>
              <p className="text-sm text-gray-500 mt-1">
                Change the name or availability of this API key.
              </p>
            </div>

            {!isEdit && (
              <button
                type="button"
                aria-label="Edit API key"
                className="shrink-0 rounded-lg p-2 hover:bg-gray-100 transition-colors"
                onClick={() => setIsEdit(true)}
              >
                <Image src={EditIcon} alt="" width={22} height={22} />
              </button>
            )}
          </div>

          {isEdit ? (
            <form className="mt-5" onSubmit={handleSubmit}>
              {/* Name */}
              <div>
                <label className="font-semibold" htmlFor="api-key-name">
                  Key Name <RequiredField />
                </label>

                <input
                  id="api-key-name"
                  name="name"
                  type="text"
                  value={selectedName}
                  onChange={(event) => setSelectedName(event.target.value)}
                  disabled={isSaving}
                  required
                  className="
                    block w-full mt-1
                    rounded-lg
                    border-[0.1rem] border-b-[0.2rem]
                    border-blue-400
                    bg-gray-100
                    px-3 py-2
                    disabled:opacity-50
                  "
                />
              </div>

              {/* Active */}
              <div className="flex items-start justify-between gap-5 mt-5">
                <div>
                  <label className="font-semibold" htmlFor="api-key-active">
                    API Key Active
                  </label>

                  <p className="text-sm text-gray-500 mt-1">
                    An inactive key can no longer be used to access this
                    business through the API.
                  </p>
                </div>

                <input
                  id="api-key-active"
                  type="checkbox"
                  checked={selectedIsActive}
                  onChange={(event) =>
                    setSelectedIsActive(event.target.checked)
                  }
                  disabled={isSaving}
                  className="size-5 shrink-0"
                />
              </div>

              <div className="flex justify-end gap-2 mt-5">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={cancelEdit}
                  className="
                    rounded-lg
                    border border-gray-300
                    px-4 py-2
                    hover:bg-gray-100
                    transition-colors
                    disabled:opacity-50
                  "
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="
                    rounded-lg
                    border border-green-500
                    bg-emerald-300
                    px-4 py-2
                    text-green-900
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mt-4">
              <div>
                <p className="text-sm text-gray-500">Key Name</p>
                <p className="font-medium mt-1">{apiKeyData.name}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Availability</p>
                <p className="font-medium mt-1">
                  {apiKeyData.isActive ? "Enabled" : "Disabled"}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 my-6" />

        {/* Activity */}
        <div>
          <h2 className="text-xl font-semibold">Activity</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mt-4">
            <div>
              <p className="text-sm text-gray-500">Created</p>
              <p className="mt-1">
                {formatDateTime(apiKeyData.createdAt, "date")}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Last Updated</p>
              <p className="mt-1">
                {formatDateTime(apiKeyData.updatedAt, "date")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="border border-red-400 bg-red-50 rounded-xl p-5 mt-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-red-700">
              Delete API Key
            </h2>

            <p className="text-sm text-red-400 mt-1">
              Permanently delete this API key. Any application using it will
              immediately lose access.
            </p>
          </div>

          <button
            type="button"
            className="
              shrink-0
              rounded-lg
              border border-red-400
              bg-red-100
              px-4 py-2
              font-medium text-red-700
              hover:bg-red-200
              transition-colors
            "
            onClick={() => setClickedDelete(true)}
          >
            Delete API Key
          </button>
        </div>
      </section>

      {/* Delete Modal */}
      {clickedDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5">
          <div className="w-full max-w-[500px] rounded-xl border border-gray-300 bg-white p-5">
            <div className="flex justify-between items-start gap-5">
              <div>
                <h2 className="text-xl font-semibold">Delete API Key?</h2>
                <p className="text-gray-500 mt-1">
                  This action cannot be undone.
                </p>
              </div>

              <button
                type="button"
                aria-label="Close delete API key modal"
                disabled={loadingDelete}
                className="p-1"
                onClick={() => {
                  setClickedDelete(false);
                  setDeleteVerification("");
                }}
              >
                <Image src={ExitIconBlack} alt="" width={22} height={22} />
              </button>
            </div>

            <form
              className="mt-5"
              onSubmit={handleDelete}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                }
              }}
            >
              <p className="text-sm text-gray-600">
                To confirm, type the API key name:
              </p>

              <p className="font-semibold mt-1 break-all">{apiKeyData.name}</p>

              <input
                id="delete-api-key"
                name="delete-api-key"
                type="text"
                value={deleteVerification}
                onChange={(event) => setDeleteVerification(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                disabled={loadingDelete}
                className="
                  w-full mt-3
                  rounded-lg
                  border border-gray-300
                  bg-gray-100
                  px-3 py-2
                  disabled:opacity-50
                "
              />

              <div className="flex justify-end gap-2 mt-5">
                <button
                  type="button"
                  disabled={loadingDelete}
                  className="
                    rounded-lg
                    border border-gray-300
                    px-4 py-2
                    disabled:opacity-50
                  "
                  onClick={() => {
                    setClickedDelete(false);
                    setDeleteVerification("");
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    deleteVerification !== apiKeyData.name || loadingDelete
                  }
                  className="
                    rounded-lg
                    border border-red-400
                    bg-red-100
                    px-4 py-2
                    font-medium text-red-700
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  {loadingDelete ? "Deleting..." : "Delete API Key"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {errorMessage && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700"
        >
          {errorMessage}
        </p>
      )}
    </section>
  );
}
