"use client";

import ExternalLinkIcon from "@/components/icons/external-link.svg";
import EditIcon from "@/components/icons/edit.svg";
import RequiredField from "@/components/ui/RequiredField";
import type { BusinessJson } from "@/types/types";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { SubmitEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import "../page.css";
import { ExternalLink } from "lucide-react";

const DOMAIN_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9-]+)*\.[a-z]{2,}$/;

export default function SettingsPage() {
  const params = useParams<{
    businessId: string;
  }>();

  const businessId = params.businessId;

  const { data: session, status, update } = useSession();

  const [businessData, setBusinessData] = useState<BusinessJson | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Business Name
  const [name, setName] = useState<string>("");
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [isSavingName, setIsSavingName] = useState<boolean>(false);
  const [errorMessageName, setErrorMessageName] = useState<string | null>(null);

  // Domain
  const [domain, setDomain] = useState<string>("");
  const [isEditingDomain, setIsEditingDomain] = useState<boolean>(false);
  const [isSavingDomain, setIsSavingDomain] = useState<boolean>(false);
  const [errorMessageDomain, setErrorMessageDomain] = useState<string | null>(
    null,
  );

  const accessLevel = session?.user?.accessLevel;

  const canManageSettings = accessLevel === "owner" || accessLevel === "admin";

  const canViewSettings = canManageSettings || accessLevel === "staff";

  const isDeveloper = accessLevel === "developer";

  useEffect(() => {
    async function getBusinessData() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const businessToast = toast.promise<BusinessJson>(
          axios
            .get<BusinessJson>(`/api/businesses/${businessId}`)
            .then((response) => response.data),
          {
            loading: "Loading business settings...",
            success: "Business settings loaded.",
            error: (error) => {
              if (axios.isAxiosError<{ error?: string }>(error)) {
                return {
                  message: "Failed to load business settings.",
                  description:
                    error.response?.data?.error ??
                    `Status code: ${error.response?.status ?? "No response"}`,
                };
              }

              return {
                message: "Unexpected error.",
                description:
                  "Something went wrong while loading the business settings.",
              };
            },
          },
        );

        const data = await businessToast.unwrap();

        setBusinessData(data);
        setName(data.name);
        setDomain(data.domain ?? "");
      } catch (error) {
        console.error("Error in Business Settings page:", error);

        if (axios.isAxiosError<{ error?: string }>(error)) {
          setErrorMessage(
            error.response?.data?.error ?? "Failed to load business settings.",
          );
        } else {
          setErrorMessage("Failed to load business settings.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    if (status === "authenticated" && canViewSettings) {
      void getBusinessData();
    }
  }, [businessId, status, canViewSettings]);

  async function handleNameSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!businessData || !canManageSettings) {
      return;
    }

    const businessName = name.trim();

    if (!businessName) {
      setErrorMessageName("A business name must be entered.");
      return;
    }

    if (businessName === businessData.name) {
      setIsEditingName(false);
      return;
    }

    setIsSavingName(true);
    setErrorMessageName(null);

    try {
      const updateToast = toast.promise<BusinessJson>(
        axios
          .patch<BusinessJson>(`/api/businesses/${businessId}`, {
            name: businessName,
          })
          .then((response) => response.data),
        {
          loading: "Updating business name...",
          success: "Business name updated.",
          error: (error) => {
            if (axios.isAxiosError<{ error?: string }>(error)) {
              return {
                message: "Failed to update business name.",
                description:
                  error.response?.data?.error ??
                  `Status code: ${error.response?.status ?? "No response"}`,
              };
            }

            return {
              message: "Unexpected error.",
              description:
                "Something went wrong while updating the business name.",
            };
          },
        },
      );

      const updatedBusiness = await updateToast.unwrap();

      setBusinessData((current) =>
        current
          ? {
              ...current,
              ...updatedBusiness,
            }
          : updatedBusiness,
      );

      setName(updatedBusiness.name);

      /*
       * Refresh the JWT's selected-business context.
       * This updates businessName in the sidebar/nav.
       */
      await update({
        businessId,
      });

      setIsEditingName(false);
    } catch (error) {
      console.error("Error updating business name:", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setErrorMessageName(
          error.response?.data?.error ?? "Failed to update the business name.",
        );
      } else {
        setErrorMessageName("Failed to update the business name.");
      }
    } finally {
      setIsSavingName(false);
    }
  }

  async function handleDomainSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!businessData || !canManageSettings) {
      return;
    }

    const businessDomain = domain.trim();

    if (!businessDomain) {
      setErrorMessageDomain("A business domain must be entered.");
      return;
    }

    if (!DOMAIN_REGEX.test(businessDomain)) {
      setErrorMessageDomain(
        "The domain must end with a valid TLD, such as .com, .net, or .org.",
      );
      return;
    }

    if (businessDomain === (businessData.domain ?? "")) {
      setIsEditingDomain(false);
      return;
    }

    setIsSavingDomain(true);
    setErrorMessageDomain(null);

    try {
      const updateToast = toast.promise<BusinessJson>(
        axios
          .patch<BusinessJson>(`/api/businesses/${businessId}`, {
            domain: businessDomain,
          })
          .then((response) => response.data),
        {
          loading: "Updating business domain...",
          success: "Business domain updated.",
          error: (error) => {
            if (axios.isAxiosError<{ error?: string }>(error)) {
              return {
                message: "Failed to update business domain.",
                description:
                  error.response?.data?.error ??
                  `Status code: ${error.response?.status ?? "No response"}`,
              };
            }

            return {
              message: "Unexpected error.",
              description:
                "Something went wrong while updating the business domain.",
            };
          },
        },
      );

      const updatedBusiness = await updateToast.unwrap();

      setBusinessData((current) =>
        current
          ? {
              ...current,
              ...updatedBusiness,
            }
          : updatedBusiness,
      );

      setDomain(updatedBusiness.domain ?? "");

      setIsEditingDomain(false);
    } catch (error) {
      console.error("Error updating business domain:", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setErrorMessageDomain(
          error.response?.data?.error ??
            "Failed to update the business domain.",
        );
      } else {
        setErrorMessageDomain("Failed to update the business domain.");
      }
    } finally {
      setIsSavingDomain(false);
    }
  }

  function handleDomainChange(value: string) {
    const formattedDomain = value
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/[^a-z0-9.-]/g, "");

    setDomain(formattedDomain);
  }

  function cancelNameEdit() {
    if (!businessData) return;

    setName(businessData.name);
    setErrorMessageName(null);
    setIsEditingName(false);
  }

  function cancelDomainEdit() {
    if (!businessData) return;

    setDomain(businessData.domain ?? "");

    setErrorMessageDomain(null);
    setIsEditingDomain(false);
  }

  if (status === "loading") {
    return <p>Loading session...</p>;
  }

  if (status === "unauthenticated") {
    return <p>You must be signed in to view this page.</p>;
  }

  /*
   * Developer role is limited to developer
   * resources such as API keys.
   */
  if (isDeveloper || !canViewSettings) {
    return (
      <section className="max-w-[1000px] mx-auto">
        <div className="border border-gray-300 rounded-xl p-5">
          <h1 className="text-2xl font-semibold">Settings unavailable</h1>

          <p className="text-gray-500 mt-1">
            Your current access level does not include business settings.
          </p>
        </div>
      </section>
    );
  }

  if (isLoading) {
    return <p>Loading business settings...</p>;
  }

  if (errorMessage) {
    return <p>{errorMessage}</p>;
  }

  if (!businessData) {
    return <p>No business data was found.</p>;
  }

  return (
    <section
      className="max-w-[1000px] mx-auto"
      aria-labelledby="settings-heading"
    >
      {/* Heading */}
      <div className="mb-6">
        <h1 id="settings-heading" className="text-3xl font-semibold">
          Settings
        </h1>

        <p className="text-gray-500 mt-1">
          {canManageSettings
            ? "Manage your business identity and website information."
            : "View your business identity and website information."}
        </p>
      </div>

      {/* Settings */}
      <section className="border border-gray-300 rounded-xl p-5">
        {/* Business Name */}
        <div>
          <div className="flex justify-between items-start gap-4">
            <div>
              <h2 className="text-xl font-semibold">Business Name</h2>

              <p className="text-sm text-gray-500 mt-1 max-w-[700px]">
                Your business name is used throughout the platform and may be
                displayed on your business website.
              </p>
            </div>

            {canManageSettings && !isEditingName && (
              <button
                type="button"
                aria-label="Edit business name"
                className="shrink-0 rounded-lg p-2 hover:bg-gray-100 transition-colors"
                onClick={() => setIsEditingName(true)}
              >
                <Image src={EditIcon} alt="" width={22} height={22} />
              </button>
            )}
          </div>

          {isEditingName ? (
            <form className="mt-4" onSubmit={handleNameSubmit}>
              <label className="font-semibold" htmlFor="business-name">
                Business Name <RequiredField />
              </label>

              <input
                id="business-name"
                name="name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={isSavingName}
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

              {errorMessageName && (
                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">
                  {errorMessageName}
                </p>
              )}

              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  disabled={isSavingName}
                  onClick={cancelNameEdit}
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
                  disabled={
                    isSavingName ||
                    !name.trim() ||
                    name.trim() === businessData.name
                  }
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
                  {isSavingName ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-gray-500">Current Name</p>

              <p className="font-medium mt-1">{businessData.name}</p>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 my-6" />

        {/* Domain */}
        <div>
          <div className="flex justify-between items-start gap-4">
            <div>
              <h2 className="text-xl font-semibold">Domain</h2>

              <p className="text-sm text-gray-500 mt-1 max-w-[700px]">
                The domain identifies the website associated with this business.
                Only change it when the website&apos;s domain changes or the
                current value is incorrect.
              </p>
            </div>

            {canManageSettings && !isEditingDomain && (
              <button
                type="button"
                aria-label="Edit business domain"
                className="shrink-0 rounded-lg p-2 hover:bg-gray-100 transition-colors"
                onClick={() => setIsEditingDomain(true)}
              >
                <Image src={EditIcon} alt="" width={22} height={22} />
              </button>
            )}
          </div>

          {isEditingDomain ? (
            <form className="mt-4" onSubmit={handleDomainSubmit}>
              <label className="font-semibold" htmlFor="business-domain">
                Domain <RequiredField />
              </label>

              <div className="flex items-center mt-1">
                <span className="shrink-0 rounded-l-lg border-[0.1rem] border-r-0 border-b-[0.2rem] border-blue-400 bg-gray-200 px-3 py-2 text-gray-500">
                  https://
                </span>

                <input
                  id="business-domain"
                  name="domain"
                  type="text"
                  value={domain}
                  onChange={(event) => handleDomainChange(event.target.value)}
                  disabled={isSavingDomain}
                  required
                  className="
                    min-w-0 flex-1
                    rounded-r-lg
                    border-[0.1rem] border-b-[0.2rem]
                    border-blue-400
                    bg-gray-100
                    px-3 py-2
                    disabled:opacity-50
                  "
                />
              </div>

              {errorMessageDomain && (
                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">
                  {errorMessageDomain}
                </p>
              )}

              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  disabled={isSavingDomain}
                  onClick={cancelDomainEdit}
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
                  disabled={
                    isSavingDomain ||
                    !domain.trim() ||
                    domain === (businessData.domain ?? "")
                  }
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
                  {isSavingDomain ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-gray-500">Current Domain</p>

              {businessData.domain ? (
                <Link
                  href={`https://${businessData.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-1 text-blue-600 hover:underline"
                >
                  <ExternalLink size={15} />

                  <span>
                    https://
                    {businessData.domain}
                  </span>
                </Link>
              ) : (
                <p className="font-medium mt-1 text-gray-500">
                  No domain configured
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
