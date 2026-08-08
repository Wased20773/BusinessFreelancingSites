"use client";

import ArrowIcon from "@/components/icons/arrow";
import { SocialJson } from "@/types/types";
import axios from "axios";
import Link from "next/link";
import { SubmitEvent, useState } from "react";
import { toast } from "sonner";
import "../../page.css";

const SOCIAL_PLATFORMS = {
  instagram: {
    domain: "instagram.com",
    icon: "social-icons/instagram/normal.svg",
  },
  facebook: {
    domain: "facebook.com",
    icon: "social-icons/facebook/normal.svg",
  },
  youtube: {
    domain: "youtube.com",
    icon: "social-icons/youtube/normal.svg",
  },
  tiktok: {
    domain: "tiktok.com",
    icon: "social-icons/tiktok/normal.svg",
  },
  twitter: {
    domain: "twitter.com",
    icon: "social-icons/twitter/normal.svg",
  },
} as const;

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
        <form
          className="dashboard-card flex flex-col gap-5 p-4"
          onSubmit={handleSubmit}
          onInput={handleFormInput}
        >
          <fieldset>
            <legend>Social info</legend>

            <div>
              <label htmlFor="social-platform">Platform</label>
              <select
                className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
                id="social-platform"
                name="platform"
                defaultValue=""
                disabled={isLoading}
              >
                <option value="" disabled>
                  Select a platform
                </option>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="youtube">YouTube</option>
                <option value="tiktok">TikTok</option>
                <option value="twitter">Twitter</option>
              </select>
            </div>

            <div>
              <label htmlFor="social-profile-name">Profile name</label>
              <input
                className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
                id="social-profile-name"
                name="profileName"
                type="text"
                disabled={isLoading}
              />
            </div>
          </fieldset>

          {errorMessage && (
            <p className="text-red-600" role="alert">
              {errorMessage}
            </p>
          )}

          <button
            className="
              border-[0.1rem] border-emerald-500 rounded-md
              bg-emerald-300 text-emerald-900
              transition-opacity disabled:cursor-not-allowed disabled:opacity-50
              px-2 py-1"
            type="submit"
            disabled={isLoading || !canSubmit}
          >
            {isLoading ? "Creating..." : "Create"}
          </button>
        </form>
      </div>
    </section>
  );
}
