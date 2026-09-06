"use client";

import "../page.css";

import Divider from "@/components/layout/Divider";
import CreateDaysForm from "@/components/ui/days/CreateDaysForm";
import LocationInfo from "@/components/ui/locations/LocationInfo";
import type { LocationJson } from "@/types/types";

import axios from "axios";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import PageState from "@/components/ui/PageState";

const MONDAY_SUNDAY = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

type CreateDaysResponse = {
  message: string;
  count: number;
};

export default function LocationPage() {
  const params = useParams<{
    businessId: string;
    locationId: string;
  }>();

  const businessId = params.businessId;
  const locationId = params.locationId;

  const [locationData, setLocationData] = useState<LocationJson | null>(null);
  const [locationCount, setLocationCount] = useState<number>(0);
  const [isActivatingDays, setIsActivatingDays] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const { data: session, status } = useSession();

  const accessLevel = session?.user?.accessLevel;
  const canManageLocation = accessLevel === "owner" || accessLevel === "admin";
  const canViewLocation = canManageLocation || accessLevel === "staff";
  const isDeveloper = accessLevel === "developer";

  useEffect(() => {
    if (status === "authenticated" && canViewLocation) {
      void getLocationData();
    }
  }, [businessId, locationId, status, canViewLocation]);

  async function getLocationData() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const locationToast = toast.promise<{
        locations: LocationJson[];
        schedule: LocationJson;
      }>(
        Promise.all([
          // Get all locations attached to the selected business.
          // This lets us know whether the sync option should be shown.
          axios.get<LocationJson[]>("/api/business/locations", {
            headers: {
              "x-business-id": businessId,
            },
          }),

          // Get schedule data for the selected location.
          axios.get<LocationJson>(
            `/api/business/locations/${locationId}/schedule`,
            {
              headers: {
                "x-business-id": businessId,
                "x-location-id": locationId,
              },
            },
          ),
        ]).then(([locationsResponse, scheduleResponse]) => ({
          locations: locationsResponse.data,
          schedule: scheduleResponse.data,
        })),
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

      const { locations, schedule } = await locationToast.unwrap();

      setLocationCount(locations.length);

      const selectedLocation = locations.find(
        (location) => location.id === locationId,
      );

      if (!selectedLocation) {
        setErrorMessage("This location could not be found.");
        return;
      }

      // The locations route gives the lightweight location information,
      // while the schedule route gives us its days and hours.
      setLocationData({
        ...selectedLocation,
        days: schedule.days,
      });
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

  async function activateBusinessDays(isSynced: boolean) {
    setIsActivatingDays(true);
    setErrorMessage(null);

    const requestBody = {
      days: MONDAY_SUNDAY.map((day) => ({
        dayOfWeek: day,
        isClosed: day === "Saturday" || day === "Sunday",
      })),
      isSynced,
    };

    try {
      const daysToast = toast.promise<CreateDaysResponse>(
        axios
          .post<CreateDaysResponse>(
            `/api/businesses/${businessId}/locations/${locationId}/days`,
            requestBody,
          )
          .then((response) => response.data),
        {
          loading:
            isSynced && locationCount > 1
              ? "Activating synchronized business days..."
              : "Activating business days...",
          success:
            isSynced && locationCount > 1
              ? "Business days activated for all locations."
              : "Business days activated.",
          error: (error) => {
            if (axios.isAxiosError<{ error?: string }>(error)) {
              return {
                message: "Failed to activate business days.",
                description:
                  error.response?.data?.error ??
                  `Status code: ${error.response?.status ?? "No response"}`,
              };
            }

            return {
              message: "Unexpected error.",
              description:
                "Something went wrong while activating business days.",
            };
          },
        },
      );

      await daysToast.unwrap();
      await getLocationData();
    } catch (error) {
      console.error("Error activating Business Days:", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setErrorMessage(
          error.response?.data?.error ?? "Failed to activate business days.",
        );
      } else {
        setErrorMessage("Failed to activate business days.");
      }
    } finally {
      setIsActivatingDays(false);
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
          .delete(`/api/businesses/${businessId}/locations/${locationId}/days`)
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
      await getLocationData();
    } catch (error) {
      console.error("Error removing Business Days:", error);

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

  const pageState = PageState({
    status,
    isLoading,
    isDeveloper,
    canView: canViewLocation,
    pageTitle: "Location",
    reason:
      "Your current access level does not include location dashboard access.",
  });

  if (pageState) {
    return pageState;
  }

  if (errorMessage && !locationData) {
    return (
      <p role="alert" className="p-5">
        {errorMessage}
      </p>
    );
  }

  if (!locationData) {
    return <p className="p-5">This location could not be found.</p>;
  }

  return (
    <section
      aria-labelledby="location-heading"
      className="max-w-[1000px] mx-auto p-5"
    >
      {/* HEADER */}
      <header className="flex items-center gap-3">
        <h1 className="truncate" id="location-heading">
          {locationData.address}
        </h1>
      </header>

      <div className="mt-[1.5rem]">
        {/* LOCATION INFORMATION */}
        <LocationInfo
          locationData={locationData}
          canManage={canManageLocation}
          setIsLoading={setIsLoading}
        />

        <Divider />

        {/* BUSINESS DAYS */}
        <CreateDaysForm
          locationData={locationData}
          hasMultipleLocations={locationCount > 1}
          isActivatingDays={isActivatingDays}
          isDeleting={isDeleting}
          activateBusinessDays={activateBusinessDays}
          handleRemoveBusinessDays={handleRemoveBusinessDays}
          canManage={canManageLocation}
          setIsLoading={setIsLoading}
        />

        {errorMessage && (
          <p role="alert" className="p-5">
            {errorMessage}
          </p>
        )}
      </div>
    </section>
  );
}
