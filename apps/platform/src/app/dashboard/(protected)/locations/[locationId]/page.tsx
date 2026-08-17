"use client";

import ArrowIcon from "@/components/icons/arrow";
import Divider from "@/components/layout/Divider";
import LocationInfo from "@/components/ui/locations/LocationInfo";
import type { LocationJson } from "@/types/types";
import axios from "axios";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import "../../page.css";
import CreateDaysForm from "@/components/ui/days/CreateDaysForm";

export default function LocationPage() {
  const params = useParams<{ locationId: string }>();

  const locationId = params.locationId;

  const [locationData, setLocationData] = useState<LocationJson | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const router = useRouter();

  useEffect(() => {
    void getLocationData();
  }, [locationId]);

  async function getLocationData() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const locationToast = toast.promise<LocationJson[]>(
        axios
          .get<{ locations: LocationJson[] }>("/api/business/locations")
          .then((response) => response.data.locations),
        {
          loading: "Loading location...",
          success: "Location loaded.",
          error: (error) => {
            if (axios.isAxiosError<{ error?: string }>(error)) {
              return {
                message: "Failed to load location.",
                description:
                  error.response?.data?.error ??
                  `Status code: ${error.response?.status ?? "No response"}`,
              };
            }

            return {
              message: "Unexpected error.",
              description: "Something went wrong while loading the location.",
            };
          },
        },
      );

      const locations = await locationToast.unwrap();

      const selectedLocation = locations.find(
        (location) => location.id === locationId,
      );

      if (!selectedLocation) {
        setErrorMessage("This location could not be found.");
        return;
      }

      setLocationData(selectedLocation);
    } catch (error) {
      console.error("Error in Location page:", error);

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

  async function handleRemoveBusinessDays() {
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const deleteToast = toast.promise<{
        message: string;
        count: number;
      }>(
        axios
          .delete(`/api/admin/locations/${locationId}/days`)
          .then((response) => response.data),
        {
          loading: "Removing business days...",
          success: "Business days removed.",
          error: (error) => {
            if (axios.isAxiosError<{ error?: string }>(error)) {
              return {
                message: "Failed to remove business days.",
                description:
                  error.response?.data?.error ??
                  `Status code: ${error.response?.status ?? "No response"}`,
              };
            }

            return {
              message: "Unexpected error.",
              description:
                "Something went wrong while removing the business days.",
            };
          },
        },
      );

      await deleteToast.unwrap();

      router.push(`/dashboard/locations/${locationId}`);
    } catch (error) {
      console.error("Error removing business days:", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setErrorMessage(
          error.response?.data?.error ?? "Failed to remove business days.",
        );
      } else {
        setErrorMessage("Failed to remove business days.");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return <p>Loading location...</p>;
  }

  if (errorMessage && !locationData) {
    return <p role="alert">{errorMessage}</p>;
  }

  if (!locationData) {
    return <p>This location could not be found.</p>;
  }

  return (
    <section aria-labelledby="location-heading">
      {/* HEADER */}
      <header className="flex items-center gap-3">
        <Link href="/dashboard/locations" aria-label="Return to locations">
          <ArrowIcon direction="left" size={50} />
        </Link>

        <h1 className="truncate" id="location-heading">
          {locationData.address}
        </h1>
      </header>

      <div className="mt-[1.5rem]">
        {/* LOCATION INFORMATION */}
        <LocationInfo locationId={locationId} locationData={locationData} />

        <Divider />

        {/* BUSINESS DAYS */}
        <CreateDaysForm
          locationId={locationId}
          locationData={locationData}
          getLocationData={getLocationData}
          setErrorMessage={setErrorMessage}
          handleRemoveBusinessDays={handleRemoveBusinessDays}
        />
      </div>
    </section>
  );
}
