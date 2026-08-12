"use client";

import ArrowIcon from "@/components/icons/arrow";
import EditSocialForm from "@/components/ui/socials/EditSocialForm";
import { SOCIAL_PLATFORMS } from "@/data/socials";
import type { SocialJson } from "@/types/types";
import axios from "axios";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { InputEvent, SubmitEvent, useEffect, useState } from "react";
import { toast } from "sonner";

type SocialPlatform = keyof typeof SOCIAL_PLATFORMS;

function getPlatformFromDomain(domain: string): SocialPlatform | null {
  const entry = Object.entries(SOCIAL_PLATFORMS).find(
    ([, value]) => value.domain === domain,
  );

  return entry ? (entry[0] as SocialPlatform) : null;
}

export default function EditSocialPage() {
  const params = useParams<{ socialId: string }>();
  const router = useRouter();

  const socialId = params.socialId;

  const [socialData, setSocialData] = useState<SocialJson | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canSubmit, setCanSubmit] = useState<boolean>(false);
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform | "">(
    "",
  );
  const [previewUrl, setPreviewUrl] = useState<string>("https://");

  const [profileName, setProfileName] = useState<string>("");

  useEffect(() => {
    async function getSocialData() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const socialsToast = toast.promise<SocialJson[]>(
          axios
            .get<{ socials: SocialJson[] }>("/api/business/socials")
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
        setCanSubmit(Boolean(selectedSocial.profileName?.trim()));
        setPreviewUrl(
          selectedPlatform && profileName.trim()
            ? `https://${SOCIAL_PLATFORMS[selectedPlatform].domain}/${profileName.replaceAll(" ", "-")}`
            : "",
        );
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

    void getSocialData();
  }, [socialId, selectedPlatform]);

  function handleFormInput(event: InputEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);

    const platform = formData.get("platform");
    const profileName = formData.get("profileName");
    const profileNameValue =
      typeof profileName === "string" ? profileName.trim() : "";

    const hasPlatform =
      typeof platform === "string" && platform in SOCIAL_PLATFORMS;

    const hasProfileName = profileNameValue !== "";

    setCanSubmit(hasPlatform && hasProfileName);
    setPreviewUrl(
      selectedPlatform && profileNameValue
        ? `https://${SOCIAL_PLATFORMS[selectedPlatform].domain}/${profileNameValue.replaceAll(" ", "-")}`
        : "",
    );
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const platform = formData.get("platform");
    const profileName = formData.get("profileName");

    if (
      typeof platform !== "string" ||
      !(platform in SOCIAL_PLATFORMS) ||
      typeof profileName !== "string" ||
      !profileName.trim()
    ) {
      setErrorMessage("A social platform and profile name are required.");
      return;
    }

    const selectedPlatform = SOCIAL_PLATFORMS[platform as SocialPlatform];

    const requestBody = {
      domain: selectedPlatform.domain,
      profileName: profileName.trim(),
      icon: selectedPlatform.icon,
    };

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const updateToast = toast.promise<SocialJson>(
        axios
          .patch<SocialJson>(`/api/admin/socials/${socialId}`, requestBody)
          .then((response) => response.data),
        {
          loading: "Updating social...",
          success: "Social updated.",
          error: (error) => {
            if (axios.isAxiosError<{ error?: string }>(error)) {
              return {
                message: "Failed to update the social.",
                description: `Status code: ${error.response?.status ?? "No response"}`,
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
          .delete(`/api/admin/socials/${socialId}`)
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
      router.push("/dashboard/socials");
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

  if (isLoading) {
    return <p>Loading social</p>;
  }

  if (errorMessage && !socialData) {
    return <p>{errorMessage}</p>;
  }

  if (!socialData) {
    return <p>This social could not be found.</p>;
  }

  const isProcessing = isSaving || isDeleting;

  return (
    <section aria-labelledby="edit-social-heading">
      <header className="flex items-center gap-3">
        <Link href="/dashboard/socials" aria-label="Return to socials">
          <ArrowIcon direction="left" size={50} />
        </Link>

        <h1 id="edit-social-heading">Edit Social</h1>
      </header>

      <div className="mt-[1.5rem]">
        <EditSocialForm
          handleSubmit={handleSubmit}
          handleFormInput={handleFormInput}
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
        />
      </div>
    </section>
  );
}
