"use client";

import CreateButtonIcon from "@/components/icons/create-button.svg";
import Divider from "@/components/layout/Divider";
import ActionItem from "@/components/ui/ActionItem";
import { useEffect, useState } from "react";
import { SocialJson } from "@/types/types";
import axios from "axios";
import { toast } from "sonner";
import "../page.css";
import SocialsList from "@/components/ui/socials/SocialsList";
import { useParams } from "next/navigation";

export default function SocialsPage() {
  const params = useParams<{
    businessId: string;
    locationId: string;
  }>();

  const businessId = params.businessId;
  const locationId = params.locationId;

  const [socialsData, setSocialsData] = useState<SocialJson[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
                  description: `Status code: ${error.response?.status ?? "No response"}`,
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

    void getSocialsData();
  }, [businessId, locationId]);

  return (
    <section aria-labelledby="socials-heading">
      <h1 id="socials-heading">Socials</h1>

      <div className="mt-[1.5rem]">
        {/* Links */}
        <nav className="dashboard-card" aria-label="Social actions">
          {/* Create Socials */}
          <ActionItem
            href="socials/create"
            icon={CreateButtonIcon}
            label="Create Social"
          />
        </nav>

        <Divider />

        <SocialsList socialsData={socialsData} isLoading={isLoading} />
      </div>
    </section>
  );
}
