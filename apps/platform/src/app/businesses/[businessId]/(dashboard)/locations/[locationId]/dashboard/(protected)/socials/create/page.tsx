"use client";

import { ACCESS_LEVEL, type SocialJson } from "@/types/types";
import { useSession } from "next-auth/react";
import PageState from "@/components/ui/PageState";
import FormPageSkeleton from "@/components/ui/FormPageSkeleton";
import { motion } from "motion/react";
import { fadeInMotion } from "@/components/motion/listMotion";
import axios from "axios";
import { type SubmitEvent, useState } from "react";
import { toast } from "sonner";
import "../../page.css";
import { normalizeProfileName, type SocialPlatform } from "@/data/socials";
import SocialForm from "@/components/ui/socials/SocialForm";
import { useParams, useRouter } from "next/navigation";
import PageHeading from "@/components/ui/PageHeader";

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
  const [platform, setPlatform] = useState<SocialPlatform | "">("");
  const [profileName, setProfileName] = useState<string>("");
  const [isSynced, setIsSynced] = useState<boolean>(false);

  const router = useRouter();

  const { data: session, status } = useSession();
  const currentAccessLevel = session?.user?.accessLevel;
  const canCreateSocial =
    currentAccessLevel === ACCESS_LEVEL.owner ||
    currentAccessLevel === ACCESS_LEVEL.admin;
  const isDeveloper = currentAccessLevel === ACCESS_LEVEL.developer;

  const result = platform ? normalizeProfileName(platform, profileName) : null;
  const validName = result && "profileName" in result ? result.profileName : null;

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!platform || !validName) {
      setErrorMessage("Choose a platform and enter a valid profile name.");
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);

    try {
      const socialToast = toast.promise<SocialJson>(
        axios
          .post<SocialJson>(
            `/api/businesses/${businessId}/locations/${locationId}/socials`,
            { platform, profileName: validName, isSynced },
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

  // The session is still being checked.
  if (status === "loading") {
    return (
      <FormPageSkeleton
        label="Loading new social form"
        fields={["input", "input", "checkbox"]}
        showDelete={false}
      />
    );
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
    <motion.section
      {...fadeInMotion}
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
        <SocialForm
          onSubmit={handleSubmit}
          platform={platform}
          setPlatform={setPlatform}
          profileName={profileName}
          setProfileName={setProfileName}
          isSynced={isSynced}
          setIsSynced={setIsSynced}
          showSync={true}
          syncDescription="Add this social to all locations"
          canSubmit={validName !== null}
          isProcessing={isCreating}
          isSubmitting={isCreating}
          submitLabel="Create"
          submittingLabel="Creating..."
          errorMessage={errorMessage}
        />
      </div>
    </motion.section>
  );
}
