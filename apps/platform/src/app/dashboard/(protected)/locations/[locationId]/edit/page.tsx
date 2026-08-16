"use client";

import ArrowIcon from "@/components/icons/arrow";
import EditLocationForm from "@/components/ui/locations/EditLocationForm";
import { LocationJson } from "@/types/types";
import axios from "axios";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { InputEvent, SubmitEvent, useEffect, useState } from "react";
import { toast } from "sonner";

export default function EditLocationPage() {
  const params = useParams<{ locationId: string }>();
  const router = useRouter();

  const locationId = params.locationId;

  const [locationData, setLocationData] = useState<LocationJson | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canSubmit, setCanSubmit] = useState<boolean>(false);

  useEffect(() => {
    async function getLocationData() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const locationsToast = toast.promise<LocationJson[]>(
          axios
            .get<{ locations: LocationJson[] }>("/api/business/locations")
            .then((response) => response.data.locations),
          {
            loading: "Loading location...",
            success: "Location loaded",
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

        const locations = await locationsToast.unwrap();

        const selectedLocation = locations.find(
          (location) => location.id === locationId,
        );

        if (!selectedLocation) {
          setErrorMessage("This location could not be found.");
          return;
        }

        setLocationData(selectedLocation);
        // setCanSubmit()
      } catch (error) {
        console.error("Error in editing location page:", error);

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
  }, [locationId]);

  function handleFormInput(event: InputEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);

    const address = formData.get("address");

    const hasAddress = typeof address === "string" && address.trim() !== "";

    setCanSubmit(hasAddress);
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const address = formData.get("address");
    const zip = formData.get("zip");
    const country = formData.get("country");
    const state = formData.get("state");
    const city = formData.get("city");
    const parking = formData.get("parking");
    const isActive = formData.get("isActive");
    const enableHours = formData.get("enableHours");

    const requestBody = {
      address: typeof address === "string" ? address.trim() : "",
      zip: typeof zip === "string" ? zip.trim() : "",
      country: typeof country === "string" ? country.trim() : "",
      state: typeof state === "string" ? state.trim() : "",
      city: typeof city === "string" ? city.trim() : "",
      parking: parking !== null,
      isActive: isActive !== null,
      enableHours: enableHours !== null,
    };

    if (!requestBody.address || requestBody.address.length === 0) {
      setErrorMessage("A location address is required");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const updateToast = toast.promise<LocationJson>(
        axios
          .patch<LocationJson>(
            `/api/admin/locations/${locationId}`,
            requestBody,
          )
          .then((response) => response.data),
        {
          loading: "Updating location...",
          success: "Location updated.",
          error: (error) => {
            if (axios.isAxiosError<{ error?: string }>(error)) {
              return {
                message: "Failed to update location.",
                description:
                  error.response?.data?.error ??
                  `Status code: ${error.response?.status ?? "No response"}`,
              };
            }

            return {
              message: "Unexpected error.",
              description: "Something went wrong while updating the location.",
            };
          },
        },
      );

      const updatedLocation = await updateToast.unwrap();

      setLocationData(updatedLocation);
    } catch (error) {
      console.error("Error updating location:", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setErrorMessage(
          error.response?.data?.error ?? "Failed to update the location.",
        );
      } else {
        setErrorMessage("Failed to update the location.");
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
          .delete(`/api/admin/locations/${locationId}`)
          .then((response) => response.data),
        {
          loading: "Deleting location...",
          success: "Location deleted.",
          error: (error) => {
            if (axios.isAxiosError<{ error?: string }>(error)) {
              return {
                message: "Failed to delete location.",
                description:
                  error.response?.data?.error ??
                  `Status code: ${error.response?.status ?? "No response"}`,
              };
            }

            return {
              message: "Unexpected error.",
              description: "Something went wrong while deleting the location.",
            };
          },
        },
      );

      await deleteToast.unwrap();

      router.push("/dashboard/locations");
    } catch (error) {
      console.error("Error deleting category:", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setErrorMessage(
          error.response?.data?.error ?? "Failed to delete the category.",
        );
      } else {
        setErrorMessage("Failed to delete the category.");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return <p>Loading location</p>;
  }

  if (errorMessage && !locationData) {
    return <p>{errorMessage}</p>;
  }

  if (!locationData) {
    return <p>This location could not be found.</p>;
  }

  const isProcessing = isSaving || isDeleting;

  return (
    <section aria-labelledby="edit-location-heading">
      <header className="flex items-center gap-3">
        <Link
          href={`/dashboard/locations/${locationData.id}`}
          aria-label="Return to locations"
        >
          <ArrowIcon direction="left" size={50} />
        </Link>

        <h1 id="edit-location-heading">Edit Location</h1>
      </header>

      <div className="mt-[1.5rem]">
        <EditLocationForm
          handleSubmit={handleSubmit}
          handleFormInput={handleFormInput}
          handleDelete={handleDelete}
          isProcessing={isProcessing}
          locationData={locationData}
          errorMessage={errorMessage}
          canSubmit={canSubmit}
          isSaving={isSaving}
          isDeleting={isDeleting}
        />
      </div>
    </section>
  );
}
