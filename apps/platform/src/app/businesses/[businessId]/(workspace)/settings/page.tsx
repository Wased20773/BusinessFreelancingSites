"use client";

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
import PageState from "@/components/ui/PageState";
import Divider from "@/components/layout/Divider";

const DOMAIN_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9-]+)*\.[a-z]{2,}$/;

export default function SettingsPage() {
  const params = useParams<{
    businessId: string;
  }>();

  const businessId = params.businessId;

  const { data: session, status, update } = useSession();

  const [businessData, setBusinessData] = useState<BusinessJson | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isEditingImage, setIsEditingImage] = useState<boolean>(false);
  const [isSavingImage, setIsSavingImage] = useState<boolean>(false);
  const [errorMessageImage, setErrorMessageImage] = useState<string | null>(
    null,
  );

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

  const currentAccessLevel = session?.user?.accessLevel;

  const canManageSettings =
    currentAccessLevel === "owner" || currentAccessLevel === "admin";
  const canViewSettings =
    canManageSettings ||
    currentAccessLevel === "staff" ||
    currentAccessLevel === "developer";

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
        setImagePreview(data.imageKey ?? null);
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

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedImage = event.target.files?.[0];

    if (!selectedImage) {
      return;
    }

    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setImage(selectedImage);
    setImagePreview(URL.createObjectURL(selectedImage));
    setErrorMessageImage(null);
  }

  async function handleImageSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!businessData || !canManageSettings || !image) {
      return;
    }

    setIsSavingImage(true);
    setErrorMessageImage(null);

    const formData = new FormData();
    formData.append("image", image);

    try {
      const imageRequest = businessData.imageKey
        ? axios.patch(`/api/businesses/${businessId}/image`, formData)
        : axios.post(`/api/businesses/${businessId}/image`, formData);

      const imageToast = toast.promise(imageRequest, {
        loading: businessData.imageKey
          ? "Replacing business image..."
          : "Uploading business image...",

        success: businessData.imageKey
          ? "Business image replaced."
          : "Business image uploaded.",

        error: (error) => {
          if (axios.isAxiosError<{ error?: string }>(error)) {
            return {
              message: businessData.imageKey
                ? "Failed to replace business image."
                : "Failed to upload business image.",

              description:
                error.response?.data?.error ??
                `Status code: ${error.response?.status ?? "No response"}`,
            };
          }

          return {
            message: "Unexpected error.",
            description:
              "Something went wrong while updating the business image.",
          };
        },
      });

      await imageToast.unwrap();

      /*
       * Refresh the selected-business JWT context.
       *
       * This generates a new presigned image URL and updates
       * the sidebar/navbar immediately.
       */
      const updatedSession = await update({
        businessId,
      });

      const updatedImageKey = updatedSession?.user?.businessImageKey ?? null;

      setBusinessData((current) =>
        current
          ? {
              ...current,
              imageKey: updatedImageKey,
            }
          : current,
      );

      if (imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }

      setImage(null);
      setImagePreview(updatedImageKey);
      setIsEditingImage(false);
    } catch (error) {
      console.error("Error updating business image:", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setErrorMessageImage(
          error.response?.data?.error ?? "Failed to update the business image.",
        );
      } else {
        setErrorMessageImage("Failed to update the business image.");
      }
    } finally {
      setIsSavingImage(false);
    }
  }

  async function handleDeleteImage() {
    if (!businessData?.imageKey || !canManageSettings) {
      return;
    }

    setIsSavingImage(true);
    setErrorMessageImage(null);

    try {
      const imageToast = toast.promise(
        axios.delete(`/api/businesses/${businessId}/image`),
        {
          loading: "Deleting business image...",
          success: "Business image deleted.",

          error: (error) => {
            if (axios.isAxiosError<{ error?: string }>(error)) {
              return {
                message: "Failed to delete business image.",
                description:
                  error.response?.data?.error ??
                  `Status code: ${error.response?.status ?? "No response"}`,
              };
            }

            return {
              message: "Unexpected error.",
              description:
                "Something went wrong while deleting the business image.",
            };
          },
        },
      );

      await imageToast.unwrap();

      /*
       * Refresh the JWT so the sidebar/navbar also removes
       * the deleted business image.
       */
      await update({
        businessId,
      });

      if (imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }

      setBusinessData((current) =>
        current
          ? {
              ...current,
              imageKey: null,
            }
          : current,
      );

      setImage(null);
      setImagePreview(null);
      setIsEditingImage(false);
    } catch (error) {
      console.error("Error deleting business image:", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setErrorMessageImage(
          error.response?.data?.error ?? "Failed to delete the business image.",
        );
      } else {
        setErrorMessageImage("Failed to delete the business image.");
      }
    } finally {
      setIsSavingImage(false);
    }
  }

  function cancelImageEdit() {
    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setImage(null);
    setImagePreview(businessData?.imageKey ?? null);
    setErrorMessageImage(null);
    setIsEditingImage(false);
  }

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

  const pageState = PageState({
    status,
    isLoading,
    isDeveloper: false,
    canView: canViewSettings,
    pageTitle: "Business Settings",
    reason: "Your current access level does not include business settings.",
  });

  if (pageState) {
    return pageState;
  }

  if (errorMessage) {
    return <p className="p-5">{errorMessage}</p>;
  }

  if (!businessData) {
    return <p className="p-5">No business data was found.</p>;
  }

  return (
    <section
      className="max-w-[1000px] mx-auto p-5"
      aria-labelledby="settings-heading"
    >
      {/* Heading */}
      <div>
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
      <section className="border border-gray-300 rounded-xl mt-5 p-5">
        {/* Business Image */}
        <div>
          <div className="flex justify-between items-start gap-4">
            <div>
              <h2 className="text-xl font-semibold">Business Image</h2>

              <p className="text-sm text-gray-800 mt-1 max-w-[700px]">
                Your business image is used throughout the platform and may be
                displayed on your business website.
              </p>
            </div>

            {canManageSettings && !isEditingImage && (
              <button
                type="button"
                aria-label="Edit business image"
                className="shrink-0 rounded-lg p-2 hover:bg-gray-100 transition-colors"
                onClick={() => setIsEditingImage(true)}
              >
                <Image src={EditIcon} alt="" width={22} height={22} />
              </button>
            )}
          </div>

          {isEditingImage ? (
            <form className="mt-4" onSubmit={handleImageSubmit}>
              <label className="font-semibold" htmlFor="business-image">
                Business Image
              </label>

              <input
                id="business-image"
                name="image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                disabled={isSavingImage}
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

              {imagePreview && (
                <div className="mt-4">
                  <Image
                    src={imagePreview}
                    alt="Business image preview"
                    width={120}
                    height={120}
                    className="rounded-lg object-contain"
                  />
                </div>
              )}

              {errorMessageImage && (
                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">
                  {errorMessageImage}
                </p>
              )}

              <div className="flex justify-between gap-2 mt-4">
                <div>
                  {businessData.imageKey && (
                    <button
                      type="button"
                      disabled={isSavingImage}
                      onClick={() => void handleDeleteImage()}
                      className="
                rounded-lg
                border border-red-400
                px-4 py-2
                text-red-700
                hover:bg-red-50
                transition-colors
                disabled:opacity-50
              "
                    >
                      Delete Image
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isSavingImage}
                    onClick={cancelImageEdit}
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
                    disabled={isSavingImage || !image}
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
                    {isSavingImage
                      ? "Saving..."
                      : businessData.imageKey
                        ? "Replace Image"
                        : "Upload Image"}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-gray-500">Current Image</p>

              {imagePreview ? (
                <Image
                  src={imagePreview}
                  alt={`${businessData.name} image`}
                  width={120}
                  height={120}
                  className="mt-2 rounded-lg object-contain"
                />
              ) : (
                <p className="font-medium mt-1 text-gray-500">
                  No business image configured
                </p>
              )}
            </div>
          )}
        </div>

        <Divider />

        {/* Business Name */}
        <div>
          <div className="flex justify-between items-start gap-4">
            <div>
              <h2 className="text-xl font-semibold">Business Name</h2>

              <p className="text-sm text-gray-800 mt-1 max-w-[700px]">
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

        <Divider />

        {/* Domain */}
        <div>
          <div className="flex justify-between items-start gap-4">
            <div>
              <h2 className="text-xl font-semibold">Domain</h2>

              <p className="text-sm text-gray-700 mt-1 max-w-[700px]">
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
