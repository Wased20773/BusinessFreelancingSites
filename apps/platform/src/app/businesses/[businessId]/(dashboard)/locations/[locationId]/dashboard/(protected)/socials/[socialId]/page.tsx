"use client";

import PageHeading from "@/components/ui/PageHeader";
import PageState from "@/components/ui/PageState";
import FormPageSkeleton from "@/components/ui/FormPageSkeleton";
import { motion } from "motion/react";
import { fadeInMotion } from "@/components/motion/listMotion";
import SocialForm from "@/components/ui/socials/SocialForm";
import {
  buildSocialUrl,
  getPlatformFromDomain,
  normalizeProfileName,
  SOCIAL_PLATFORMS,
  type SocialPlatform,
} from "@/data/socials";
import { ACCESS_LEVEL, type SocialJson } from "@/types/types";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { type SubmitEvent, useEffect, useState } from "react";
import { toast } from "sonner";

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
  // isFetching: the social is loading (shows the form skeleton).
  // isLoading: a link was clicked and the next page is opening.
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
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
      setIsFetching(true);
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
        setIsFetching(false);
      }
    }

    if (status === "authenticated" && canManageSocials) {
      void getSocialData();
    }
  }, [businessId, locationId, socialId, status, canManageSocials]);

  const result = selectedPlatform
    ? normalizeProfileName(selectedPlatform, profileName)
    : null;
  const validName =
    result && "profileName" in result ? result.profileName : null;

  // A social saved before the link rules were fixed (e.g. TikTok without "@") can
  // be saved as-is to rebuild its link.
  const hasChanges =
    socialData !== null &&
    selectedPlatform !== "" &&
    validName !== null &&
    (SOCIAL_PLATFORMS[selectedPlatform].domain !== socialData.domain ||
      validName !== socialData.profileName ||
      isSynced !== socialData.isSynced ||
      buildSocialUrl(selectedPlatform, validName) !== socialData.url);

  const canSubmit = hasChanges;

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!socialData || !selectedPlatform || !validName) {
      setErrorMessage("Choose a platform and enter a valid profile name.");
      return;
    }

    if (!hasChanges) return;

    const requestBody = {
      platform: selectedPlatform,
      profileName: validName,
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

  if (isFetching) {
    return (
      <FormPageSkeleton
        label="Loading social"
        fields={["input", "input", "checkbox"]}
      />
    );
  }

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
    <motion.section
      {...fadeInMotion}
      aria-labelledby="edit-social-heading"
      className="relative max-w-[1000px] mx-auto"
    >
      <PageHeading
        path={`/businesses/${businessId}/locations/${locationId}/dashboard/socials`}
        ariaLabel="Return to socials"
        setIsLoading={setIsLoading}
        headingId="edit-social-heading"
        heading="Go Back"
      />

      <div className="mt-6 p-5 pt-0">
        <SocialForm
          onSubmit={handleSubmit}
          platform={selectedPlatform}
          setPlatform={setSelectedPlatform}
          profileName={profileName}
          setProfileName={setProfileName}
          isSynced={isSynced}
          setIsSynced={setIsSynced}
          showSync={Boolean(socialData.syncGroupId)}
          syncDescription="Synchronize this social across locations"
          canSubmit={canSubmit}
          isProcessing={isProcessing}
          isSubmitting={isSaving}
          submitLabel="Save"
          submittingLabel="Saving..."
          errorMessage={errorMessage}
          onDelete={handleDelete}
          isDeleting={isDeleting}
        />
      </div>
    </motion.section>
  );
}
