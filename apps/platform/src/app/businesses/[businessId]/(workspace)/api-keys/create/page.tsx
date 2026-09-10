"use client";

import ArrowIcon from "@/components/icons/arrow";
import PageHeading from "@/components/ui/PageHeader";
import PageState from "@/components/ui/PageState";
import RequiredField from "@/components/ui/RequiredField";
import { createBusinessApiKey } from "@/lib/api/apiKeys";
import { ACCESS_LEVEL, type CreateBusinessApiKeyResponse } from "@/types/types";
import axios from "axios";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { SubmitEvent, useState } from "react";
import { toast } from "sonner";

export default function CreateApiKeyPage() {
  const params = useParams<{
    businessId: string;
  }>();

  const businessId = params.businessId;
  const router = useRouter();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [createdApiKey, setCreatedApiKey] =
    useState<CreateBusinessApiKeyResponse | null>(null);

  const { data: session, status } = useSession();

  const currentAccessLevel = session?.user?.accessLevel;
  const canManageApiKeys = currentAccessLevel === ACCESS_LEVEL.developer;

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const name = formData.get("name");

    if (typeof name !== "string" || !name.trim()) {
      setErrorMessage("A name is required for this API key.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const createToast = toast.promise<CreateBusinessApiKeyResponse>(
        createBusinessApiKey(businessId, name),
        {
          loading: "Creating API key...",
          success: (data) => ({
            message: "API key created.",
            description: `${data.key.name} was created successfully.`,
          }),
          error: (error) => {
            if (axios.isAxiosError<{ error?: string }>(error)) {
              return {
                message: "Failed to create API key.",
                description:
                  error.response?.data?.error ??
                  `Status code: ${error.response?.status ?? "No response"}`,
              };
            }

            return {
              message: "Unexpected error.",
              description: "Something went wrong while creating the API key.",
            };
          },
        },
      );

      const data = await createToast.unwrap();

      setCreatedApiKey(data);
    } catch (error) {
      console.error("Failed to create API key:", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setErrorMessage(
          error.response?.data?.error ?? "Failed to create the API key.",
        );
      } else {
        setErrorMessage("Failed to create the API key.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopy() {
    if (!createdApiKey?.key) {
      return;
    }

    await navigator.clipboard.writeText(createdApiKey.apiKey);

    toast.success("API key copied.");
  }

  const pageState = PageState({
    status,
    isLoading,
    isDeveloper: false,
    canView: canManageApiKeys,
    pageTitle: "Creating Api Keys",
    reason: "Your current access level denies access to creating api keys.",
  });

  if (pageState) {
    return pageState;
  }

  if (createdApiKey) {
    return (
      <section
        className="max-w-[800px] mx-auto p-5"
        aria-labelledby="api-key-created-heading"
      >
        <div className="mb-6">
          <h1 id="api-key-created-heading" className="text-3xl font-semibold">
            API Key Created
          </h1>

          <p className="text-gray-500 mt-1">
            Save this key now. You won&apos;t be able to view it again after
            leaving this page.
          </p>
        </div>

        <section className="border border-gray-300 rounded-xl p-5">
          <div>
            <p className="text-sm text-gray-500">Key Name</p>

            <p className="font-semibold mt-1">{createdApiKey.key.name}</p>
          </div>

          <div className="border-t border-gray-200 my-5" />

          <div>
            <label className="font-semibold" htmlFor="created-api-key">
              API Key
            </label>

            <p className="text-sm text-gray-500 mt-1 mb-2">
              Copy this key and store it somewhere secure.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="created-api-key"
                type="text"
                value={createdApiKey.apiKey}
                readOnly
                className="
                  min-w-0 flex-1
                  rounded-lg
                  border border-gray-300
                  bg-gray-100
                  px-3 py-2
                  font-mono
                "
              />

              <button
                type="button"
                onClick={handleCopy}
                className="
                  shrink-0
                  border border-gray-300
                  rounded-lg
                  px-4 py-2
                  hover:bg-gray-100
                  transition-colors
                "
              >
                Copy
              </button>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4">
            <p className="font-semibold text-amber-900">
              This key will only be shown once.
            </p>

            <p className="text-sm text-amber-800 mt-1">
              If you lose it, you&apos;ll need to create a new API key.
            </p>
          </div>

          <div className="flex justify-end mt-5">
            <button
              type="button"
              onClick={() => {
                router.push(`/businesses/${businessId}/api-keys`);
                setIsLoading(true);
              }}
              className="
                rounded-lg
                border border-gray-300
                px-4 py-2
                hover:bg-gray-100
                transition-colors
              "
            >
              Done
            </button>
          </div>
        </section>
      </section>
    );
  }

  return (
    <section
      className="max-w-[800px] mx-auto p-5 pt-0"
      aria-labelledby="create-api-key-heading"
    >
      {/* Heading */}
      <PageHeading
        path={`/businesses/${businessId}/api-keys`}
        ariaLabel="Return to api keys"
        setIsLoading={setIsLoading}
        headingId="create-api-key-heading"
        heading="Create API Key"
      />

      <p className="text-gray-500 mt-2">
        Generate a new key for accessing this business through the Business
        Platform API.
      </p>

      {/* Form */}
      <section className="border border-gray-300 rounded-xl mt-5 p-5">
        <form onSubmit={handleSubmit}>
          <div>
            <label className="font-semibold" htmlFor="api-key-name">
              Key Name <RequiredField />
            </label>

            <p className="text-sm text-gray-500 mt-1 mb-2">
              Use a name that describes where this key will be used.
            </p>

            <input
              id="api-key-name"
              name="name"
              type="text"
              placeholder="Production Website"
              disabled={isSubmitting}
              required
              className="
                block w-full
                rounded-lg
                border-[0.1rem] border-b-[0.2rem]
                border-blue-400
                bg-gray-100
                px-3 py-2
                disabled:opacity-50
              "
            />
          </div>

          <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="font-semibold">Keep API keys private</p>

            <p className="text-sm text-gray-500 mt-1">
              API keys provide access to your business data. Do not place them
              directly in public client-side code or share them with people who
              should not have access.
            </p>
          </div>

          {errorMessage && (
            <p
              role="alert"
              className="
                mt-4
                rounded-lg
                border border-red-200
                bg-red-50
                px-3 py-2
                text-red-700
              "
            >
              {errorMessage}
            </p>
          )}

          <div className="flex justify-end gap-2 mt-5">
            <Link
              href={`/businesses/${businessId}/api-keys`}
              className="
                rounded-lg
                border border-gray-300
                px-4 py-2
                hover:bg-gray-100
                transition-colors
              "
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSubmitting}
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
              {isSubmitting ? "Creating..." : "Create API Key"}
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}
