"use client";

import { ACCESS_LEVEL, type SocialJson } from "@/types/types";
import { useSession } from "next-auth/react";
import PageState from "@/components/ui/PageState";
import axios from "axios";
import { SubmitEvent, useState } from "react";
import { toast } from "sonner";
import "../../page.css";
import { SOCIAL_PLATFORMS } from "@/data/socials";
import CreateSocialForm from "@/components/ui/socials/CreateSocialForm";
import { useParams, useRouter } from "next/navigation";
import PageHeading from "@/components/ui/PageHeader";

type SocialPlatform = keyof typeof SOCIAL_PLATFORMS;

export default function CreateSocialPage() {
  const params = useParams<{
    businessId: string;
    locationId: string;
  }>();

  const businessId = params.businessId;
  const locationId = params.locationId;

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canSubmit, setCanSubmit] = useState<boolean>(false);
  const [isSynced, setIsSynced] = useState<boolean>(false);

  const router = useRouter();

  const { data: session, status } = useSession();
  const currentAccessLevel = session?.user?.accessLevel;
  const canCreateSocial =
    currentAccessLevel === ACCESS_LEVEL.owner ||
    currentAccessLevel === ACCESS_LEVEL.admin;
  const isDeveloper = currentAccessLevel === ACCESS_LEVEL.developer;

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsCreating(true);
    setErrorMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const platform = formData.get("platform");
    const profileName = formData.get("profileName");

    if (
      typeof platform !== "string" ||
      !(platform in SOCIAL_PLATFORMS) ||
      typeof profileName !== "string" ||
      !profileName.trim()
    ) {
      setErrorMessage("A social platform and profile name are required");
      setIsCreating(false);
      return;
    }

    const selectedPlatform = SOCIAL_PLATFORMS[platform as SocialPlatform];

    const requestBody = {
      domain: selectedPlatform.domain,
      profileName: profileName.trim(),
      icon: selectedPlatform.icon,
      isSynced,
    };

    try {
      const socialToast = toast.promise<SocialJson>(
        axios
          .post<SocialJson>(
            `/api/businesses/${businessId}/locations/${locationId}/socials`,
            requestBody,
          )
          .then((response) => response.data),
        {
          loading: "Creating social...",
          success: "Social created.",
          error: (error) => {
            if (axios.isAxiosError<{ error?: string }>(error)) {
              return {
                message: "Failed to create the social.",
                description:
                  error.response?.data?.error ??
                  `Status code: ${error.response?.status ?? "No response"}`,
              };
            }

            return {
              message: "Unexpected error.",
              description: "Something went wrong while creating the social.",
            };
          },
        },
      );

      await socialToast.unwrap();

      form.reset();
      setCanSubmit(false);
      setIsSynced(false);
      router.push(
        `/businesses/${businessId}/locations/${locationId}/dashboard/socials`,
      );
    } catch (error) {
      console.error("Error in Create Social page: ", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setErrorMessage(
          error.response?.data?.error ?? "Failed to create the social.",
        );
      } else {
        setErrorMessage("Failed to create the social.");
      }
    } finally {
      setIsCreating(false);
    }
  }

  function handleFormInput(event: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);

    const platform = formData.get("platform");
    const profileName = formData.get("profileName");

    const hasPlatform =
      typeof platform === "string" && platform in SOCIAL_PLATFORMS;

    const hasProfileName =
      typeof profileName === "string" && profileName.trim() !== "";

    setCanSubmit(hasPlatform && hasProfileName);
  }

  const pageState = PageState({
    status,
    isLoading,
    isDeveloper,
    canView: canCreateSocial,
    pageTitle: "Socials",
    reason: "Your current access level does not allow social creation.",
  });

  if (pageState) {
    return pageState;
  }

  return (
    <section
      aria-labelledby="create-social-heading"
      className="max-w-[1000px] mx-auto p-5 pt-0"
    >
      {/* HEADER */}
      <PageHeading
        path={`/businesses/${businessId}/locations/${locationId}/dashboard/socials`}
        ariaLabel="Return to socials"
        setIsLoading={setIsLoading}
        headingId="create-social-heading"
        heading="Create Social"
      />

      <div className="mt-[0.5rem]">
        <CreateSocialForm
          handleSubmit={handleSubmit}
          handleFormInput={handleFormInput}
          isCreating={isCreating}
          canSubmit={canSubmit}
          errorMessage={errorMessage}
          isSynced={isSynced}
          setIsSynced={setIsSynced}
        />
      </div>
    </section>
  );
}
