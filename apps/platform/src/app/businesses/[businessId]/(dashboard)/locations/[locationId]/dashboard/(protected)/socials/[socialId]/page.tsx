"use client";

import PageHeading from "@/components/ui/PageHeader";
import PageState from "@/components/ui/PageState";
import EditSocialForm from "@/components/ui/socials/EditSocialForm";
import { SOCIAL_PLATFORMS } from "@/data/socials";
import { ACCESS_LEVEL, type SocialJson } from "@/types/types";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { type SubmitEvent, useEffect, useState } from "react";
import { toast } from "sonner";

type SocialPlatform = keyof typeof SOCIAL_PLATFORMS;

function getPlatformFromDomain(domain: string): SocialPlatform | null {
  const entry = Object.entries(SOCIAL_PLATFORMS).find(
    ([, value]) => value.domain === domain,
  );

  return entry ? (entry[0] as SocialPlatform) : null;
}

export default function EditSocialPage() {
  const params = useParams<{
    businessId: string;
    locationId: string;
    socialId: string;
  }>();

  const router = useRouter();

  const businessId = params.businessId;
  const locationId = params.locationId;
  const socialId = params.socialId;

  const [socialData, setSocialData] = useState<SocialJson | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isSynced, setIsSynced] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform | "">(
    "",
  );
  const [profileName, setProfileName] = useState<string>("");

  const { data: session, status } = useSession();
  const currentAccessLevel = session?.user?.accessLevel;

  const canManageSocials =
    currentAccessLevel === ACCESS_LEVEL.owner ||
    currentAccessLevel === ACCESS_LEVEL.admin;

  const isDeveloper = currentAccessLevel === ACCESS_LEVEL.developer;

  useEffect(() => {
    async function getSocialData() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const socialsToast = toast.promise<SocialJson[]>(
          axios
            .get<{ socials: SocialJson[] }>("/api/business/socials", {
              headers: {
                "x-business-id": businessId,
                "x-location-id": locationId,
              },
            })
            .then((response) => response.data.socials),
          {
            loading: "Loading social...",
            success: "Social loaded.",
            error: (error) => {
              if (axios.isAxiosError<{ error?: string }>(error)) {
                return {
                  message: "Failed to load social.",
                  description:
                    error.response?.data?.error ??
                    `Status code: ${error.response?.status ?? "No response"}`,
                };
              }

              return {
                message: "Unexpected error.",
                description: "Something went wrong while loading the social.",
              };
            },
          },
        );

        const socials = await socialsToast.unwrap();
        const selectedSocial = socials.find((social) => social.id === socialId);

        if (!selectedSocial) {
          setErrorMessage("This social could not be found.");
          return;
        }

        setSocialData(selectedSocial);
        setSelectedPlatform(getPlatformFromDomain(selectedSocial.domain) ?? "");
        setProfileName(selectedSocial.profileName);
        setIsSynced(selectedSocial.isSynced);
      } catch (error) {
        console.error("Error in Edit Social page:", error);

        if (axios.isAxiosError<{ error?: string }>(error)) {
          setErrorMessage(
            error.response?.data?.error ?? "Failed to load social data.",
          );
        } else {
          setErrorMessage("Failed to load social data.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    if (status === "authenticated" && canManageSocials) {
      void getSocialData();
    }
  }, [businessId, locationId, socialId, status, canManageSocials]);

  const trimmedProfileName = profileName.trim();

  const validPlatform =
    selectedPlatform !== "" &&
    Object.prototype.hasOwnProperty.call(SOCIAL_PLATFORMS, selectedPlatform);

  const selectedPlatformData = validPlatform
    ? SOCIAL_PLATFORMS[selectedPlatform as SocialPlatform]
    : null;

  const previewUrl =
    selectedPlatformData && trimmedProfileName
      ? `https://${selectedPlatformData.domain}/${trimmedProfileName.replaceAll(
          " ",
          "-",
        )}`
      : "";

  const hasChanges =
    socialData !== null &&
    selectedPlatformData !== null &&
    (selectedPlatformData.domain !== socialData.domain ||
      trimmedProfileName !== socialData.profileName.trim() ||
      isSynced !== socialData.isSynced);

  const canSubmit =
    selectedPlatformData !== null && trimmedProfileName !== "" && hasChanges;

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!socialData || !selectedPlatformData || !trimmedProfileName) {
      setErrorMessage("A social platform and profile name are required.");
      return;
    }

    const changed =
      selectedPlatformData.domain !== socialData.domain ||
      trimmedProfileName !== socialData.profileName.trim() ||
      isSynced !== socialData.isSynced;

    if (!changed) return;

    const requestBody = {
      domain: selectedPlatformData.domain,
      profileName: trimmedProfileName,
      icon: selectedPlatformData.icon,
      isSynced,
    };

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const updateToast = toast.promise<SocialJson>(
        axios
          .patch<SocialJson>(
            `/api/businesses/${businessId}/locations/${locationId}/socials/${socialId}`,
            requestBody,
          )
          .then((response) => response.data),
        {
          loading: "Updating social...",
          success: "Social updated.",
          error: (error) => {
            if (axios.isAxiosError<{ error?: string }>(error)) {
              return {
                message: "Failed to update the social.",
                description:
                  error.response?.data?.error ??
                  `Status code: ${error.response?.status ?? "No response"}`,
              };
            }

            return {
              message: "Unexpected error.",
              description: "Something went wrong while updating the social.",
            };
          },
        },
      );

      const updatedSocial = await updateToast.unwrap();

      setSocialData(updatedSocial);
      setSelectedPlatform(getPlatformFromDomain(updatedSocial.domain) ?? "");
      setProfileName(updatedSocial.profileName);
      setIsSynced(updatedSocial.isSynced);
    } catch (error) {
      console.error("Error updating social:", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setErrorMessage(
          error.response?.data?.error ?? "Failed to update the social.",
        );
      } else {
        setErrorMessage("Failed to update the social.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const deleteToast = toast.promise(
        axios
          .delete(
            `/api/businesses/${businessId}/locations/${locationId}/socials/${socialId}`,
            {
              data: {
                deleteAllSynced: isSynced,
              },
            },
          )
          .then((response) => response.data),
        {
          loading: "Deleting social...",
          success: "Social deleted.",
          error: (error) => {
            if (axios.isAxiosError<{ error?: string }>(error)) {
              return {
                message: "Failed to delete social.",
                description:
                  error.response?.data?.error ??
                  `Status code: ${error.response?.status ?? "No response"}`,
              };
            }

            return {
              message: "Unexpected error.",
              description: "Something went wrong while deleting the social.",
            };
          },
        },
      );

      await deleteToast.unwrap();

      router.push(
        `/businesses/${businessId}/locations/${locationId}/dashboard/socials`,
      );
    } catch (error) {
      console.error("Error deleting social:", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setErrorMessage(
          error.response?.data?.error ?? "Failed to delete the social.",
        );
      } else {
        setErrorMessage("Failed to delete the social.");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  const pageState = PageState({
    status,
    isLoading,
    isDeveloper,
    canView: canManageSocials,
    pageTitle: "Socials",
    reason: "Your current access level does not include social management.",
  });

  if (pageState) return pageState;

  if (errorMessage && !socialData) {
    return (
      <p role="alert" className="p-5">
        {errorMessage}
      </p>
    );
  }

  if (!socialData) {
    return <p className="p-5">This social could not be found.</p>;
  }

  const isProcessing = isSaving || isDeleting;

  return (
    <section
      aria-labelledby="edit-social-heading"
      className="max-w-[1000px] mx-auto p-5 pt-0"
    >
      <PageHeading
        path={`/businesses/${businessId}/locations/${locationId}/dashboard/socials`}
        ariaLabel="Return to socials"
        setIsLoading={setIsLoading}
        headingId="edit-social-heading"
        heading="Edit Social"
      />

      <div className="mt-[0.5rem]">
        <EditSocialForm
          handleSubmit={handleSubmit}
          handleDelete={handleDelete}
          isProcessing={isProcessing}
          selectedPlatform={selectedPlatform}
          setSelectedPlatform={setSelectedPlatform}
          profileName={profileName}
          setProfileName={setProfileName}
          previewUrl={previewUrl}
          errorMessage={errorMessage}
          canSubmit={canSubmit}
          isSaving={isSaving}
          isDeleting={isDeleting}
          socialData={socialData}
          isSynced={isSynced}
          setIsSynced={setIsSynced}
        />
      </div>
    </section>
  );
}
