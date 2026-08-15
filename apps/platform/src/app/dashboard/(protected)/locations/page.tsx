"use client";

import ActionItem from "@/components/ui/ActionItem";
import CreateButtonIcon from "@/components/icons/create-button.svg";
import "../page.css";
import Divider from "@/components/layout/Divider";
import LocationsList from "@/components/ui/locations/LocationsList";
import { useEffect, useState } from "react";
import { LocationJson } from "@/types/types";
import { toast } from "sonner";
import axios from "axios";

export default function LocationsPage() {
  const [locationData, setLocationData] = useState<LocationJson[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function getLocationData() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const locationToast = toast.promise<LocationJson[]>(
          axios
            .get<{ locations: LocationJson[] }>("/api/business/locations")
            .then((response) => response.data.locations),
          {
            loading: "Loading locations...",
            success: "Locations loaded.",
            error: (error) => {
              if (axios.isAxiosError<{ error?: string }>(error)) {
                return {
                  message: "Failed to load locations.",
                  description: `Status code: ${error.response?.status ?? "No response"}`,
                };
              }

              return {
                message: "Unexpected error.",
                description:
                  "Something went wrong while loading the locations.",
              };
            },
          },
        );

        const data = await locationToast.unwrap();

        setLocationData(data);
      } catch (error) {
        console.error("Error in Locations page:", error);

        if (axios.isAxiosError<{ error?: string }>(error)) {
          setErrorMessage(
            error.response?.data?.error ?? "Failed to load location data.",
          );
        } else {
          setErrorMessage("Failed to load location data.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    void getLocationData();
  }, []);

  return (
    <section aria-labelledby="locations-heading">
      <h1 id="locations-heading">Locations</h1>

      <div className="mt-[1.5rem]">
        {/* Links */}
        <nav className="dashboard-card" aria-label="Location actions">
          {/* Create Location */}
          <ActionItem
            href="/dashboard/location/create"
            icon={CreateButtonIcon}
            label="Create Location"
          />
        </nav>

        <Divider />

        <LocationsList isLoading={isLoading} locationData={locationData} />
      </div>
    </section>
  );
}
