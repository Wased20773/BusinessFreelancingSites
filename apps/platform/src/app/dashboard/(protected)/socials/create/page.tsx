"use client";

import ArrowIcon from "@/components/icons/arrow";
import { SocialJson } from "@/types/types";
import axios from "axios";
import Link from "next/link";
import { SubmitEvent, useState } from "react";
import { toast } from "sonner";
import "../../page.css";
import { SOCIAL_PLATFORMS } from "@/data/socials";
import CreateSocialForm from "@/components/ui/socials/CreateSocialForm";

type SocialPlatform = keyof typeof SOCIAL_PLATFORMS;

export default function CreateSocialPage() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canSubmit, setCanSubmit] = useState<boolean>(false);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsLoading(true);
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
      setIsLoading(false);
      return;
    }

    const selectedPlatform = SOCIAL_PLATFORMS[platform as SocialPlatform];

    const requestBody = {
      domain: selectedPlatform.domain,
      profileName: profileName.trim(),
      icon: selectedPlatform.icon,
    };

    try {
      const socialToast = toast.promise<SocialJson>(
        axios
          .post<SocialJson>("/api/admin/socials", requestBody)
          .then((response) => response.data),
        {
          loading: "Creating social...",
          success: "Social created.",
          error: (error) => {
            if (axios.isAxiosError<{ error?: string }>(error)) {
              return {
                message: "Failed to create social.",
                description: `Status code: ${error.response?.status ?? "No response"}`,
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

      // On successful creation, clear the form for re-use.
      form.reset();
      setCanSubmit(false);
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
      setIsLoading(false);
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

  return (
    <section aria-labelledby="create-social-heading">
      <header className="flex items-center gap-3">
        <Link href="/dashboard/socials">
          <ArrowIcon direction="left" size={50} />
        </Link>

        <h1 id="create-social-heading">Create Social</h1>
      </header>

      <div className="mt-[1.5rem]">
        <CreateSocialForm
          handleSubmit={handleSubmit}
          handleFormInput={handleFormInput}
          isLoading={isLoading}
          canSubmit={canSubmit}
          errorMessage={errorMessage}
        />
      </div>
    </section>
  );
}
