"use client";

import CreateButtonIcon from "@/components/icons/create-button.svg";
import Divider from "@/components/layout/Divider";
import ActionItem from "@/components/ui/ActionItem";
import SocialsList from "@/components/ui/socials/SocialsList";
import type { SocialJson } from "@/types/types";
import axios from "axios";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import "../page.css";
import PageState from "@/components/ui/PageState";

export default function SocialsPage() {
  const params = useParams<{
    businessId: string;
    locationId: string;
  }>();

  const businessId = params.businessId;
  const locationId = params.locationId;

  const { data: session, status } = useSession();

  const [socialsData, setSocialsData] = useState<SocialJson[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const accessLevel = session?.user?.accessLevel;
  const canManageSocials = accessLevel === "owner" || accessLevel === "admin";
  const canViewSocials = canManageSocials || accessLevel === "staff";
  const isDeveloper = accessLevel === "developer";

  useEffect(() => {
    async function getSocialsData() {
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
            loading: "Loading socials...",
            success: "Socials loaded.",

            error: (error) => {
              if (axios.isAxiosError<{ error?: string }>(error)) {
                return {
                  message: "Failed to load socials.",
                  description:
                    error.response?.data?.error ??
                    `Status code: ${error.response?.status ?? "No response"}`,
                };
              }

              return {
                message: "Unexpected error.",
                description: "Something went wrong while loading the socials.",
              };
            },
          },
        );

        const data = await socialsToast.unwrap();

        setSocialsData(data);
      } catch (error) {
        console.error("Error in Socials page:", error);

        if (axios.isAxiosError<{ error?: string }>(error)) {
          setErrorMessage(
            error.response?.data?.error ?? "Failed to load socials data.",
          );
        } else {
          setErrorMessage("Failed to load social data.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    if (status === "authenticated" && canViewSocials) {
      void getSocialsData();
    }
  }, [businessId, locationId, status, canViewSocials]);

  const pageState = PageState({
    status,
    isLoading,
    isDeveloper,
    canView: canViewSocials,
    pageTitle: "Socials",
    reason:
      "Your current access level does not include dashboard social access.",
  });

  if (pageState) {
    return pageState;
  }

  return (
    <section
      aria-labelledby="socials-heading"
      className="max-w-[1000px] mx-auto p-5"
    >
      <h1 id="socials-heading">Socials</h1>

      <div className="mt-[1.5rem]">
        {canManageSocials && (
          <>
            <nav className="dashboard-card" aria-label="Social actions">
              <ActionItem
                href="socials/create"
                icon={CreateButtonIcon}
                label="Create Social"
                setIsLoading={setIsLoading}
              />
            </nav>

            <Divider />
          </>
        )}

        <SocialsList
          socialsData={socialsData}
          isLoading={isLoading}
          errorMessage={errorMessage}
          canManage={canManageSocials}
          setIsLoading={setIsLoading}
        />
      </div>
    </section>
  );
}
