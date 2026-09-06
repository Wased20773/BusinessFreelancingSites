"use client";

import ArrowIcon from "@/components/icons/arrow";
import EditLocationForm from "@/components/ui/locations/EditLocationForm";
import DeleteModal from "@/components/ui/modal/DeleteModal";
import { ACCESS_LEVEL, type LocationJson } from "@/types/types";

import axios from "axios";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type InputEvent, type SubmitEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import PageState from "@/components/ui/PageState";

export default function EditLocationPage() {
  const params = useParams<{
    businessId: string;
    locationId: string;
  }>();

  const router = useRouter();

  const businessId = params.businessId;
  const locationId = params.locationId;

  const [locationData, setLocationData] = useState<LocationJson | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canSubmit, setCanSubmit] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

  const { data: session, status } = useSession();

  const currentAccessLevel = session?.user?.accessLevel;

  const canManageLocation =
    currentAccessLevel === ACCESS_LEVEL.owner ||
    currentAccessLevel === ACCESS_LEVEL.admin;

  const isDeveloper = currentAccessLevel === ACCESS_LEVEL.developer;

  useEffect(() => {
    async function getLocationData() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        /*
         * This is a shared read route.
         *
         * Dashboard authentication uses x-business-id
         * instead of the public Business API key.
         */
        const locationsToast = toast.promise<LocationJson[]>(
          axios
            .get<LocationJson[]>("/api/business/locations", {
              headers: {
                "x-business-id": businessId,
              },
            })
            .then((response) => response.data),
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

        const locations = await locationsToast.unwrap();

        const selectedLocation = locations.find(
          (location) => location.id === locationId,
        );

        if (!selectedLocation) {
          setErrorMessage("This location could not be found.");
          return;
        }

        setLocationData(selectedLocation);

        /*
         * Nothing has changed when the form
         * is initially loaded.
         */
        setCanSubmit(false);
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

    if (status === "authenticated" && canManageLocation) {
      void getLocationData();
    }
  }, [businessId, locationId, status, canManageLocation]);

  function handleFormInput(event: InputEvent<HTMLFormElement>) {
    if (!locationData) {
      setCanSubmit(false);
      return;
    }

    const formData = new FormData(event.currentTarget);

    const address = formData.get("address");
    const zip = formData.get("zip");
    const country = formData.get("country");
    const state = formData.get("state");
    const city = formData.get("city");
    const parking = formData.get("parking");
    const isActive = formData.get("isActive");
    const enableHours = formData.get("enableHours");

    const currentAddress = typeof address === "string" ? address.trim() : "";
    const currentZip = typeof zip === "string" ? zip.trim() : "";
    const currentCountry = typeof country === "string" ? country.trim() : "";
    const currentState = typeof state === "string" ? state.trim() : "";
    const currentCity = typeof city === "string" ? city.trim() : "";
    const currentParking = parking !== null;
    const currentIsActive = isActive !== null;
    const currentEnableHours = enableHours !== null;

    /*
     * Address is the only required location field.
     */
    const isValid = currentAddress !== "";

    /*
     * Save should only be enabled if at least
     * one field differs from the original data.
     */
    const hasChanges =
      currentAddress !== locationData.address ||
      currentZip !== (locationData.zip ?? "") ||
      currentCountry !== (locationData.country ?? "") ||
      currentState !== (locationData.state ?? "") ||
      currentCity !== (locationData.city ?? "") ||
      currentParking !== locationData.parking ||
      currentIsActive !== locationData.isActive ||
      currentEnableHours !== locationData.enableHours;

    setCanSubmit(isValid && hasChanges);
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!locationData || !canSubmit) {
      return;
    }

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

    if (!requestBody.address) {
      setErrorMessage("A location address is required.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const updateToast = toast.promise<LocationJson>(
        axios
          .patch<LocationJson>(
            `/api/businesses/${businessId}/locations/${locationId}`,
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

      /*
       * The returned location becomes our new
       * original state after a successful save.
       */
      setLocationData(updatedLocation);
      setCanSubmit(false);
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
          .delete(`/api/businesses/${businessId}/locations/${locationId}`)
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

      /*
       * The location no longer exists, so return
       * to this business's locations list.
       */
      router.push(`/businesses/${businessId}`);
    } catch (error) {
      console.error("Error deleting location:", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setErrorMessage(
          error.response?.data?.error ?? "Failed to delete the location.",
        );
      } else {
        setErrorMessage("Failed to delete the location.");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  const pageState = PageState({
    status,
    isLoading,
    isDeveloper,
    canView: canManageLocation,
    pageTitle: "Location",
    reason: "Your current access level does not allow location management.",
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

  const isProcessing = isSaving || isDeleting;

  return (
    <section
      aria-labelledby="edit-location-heading"
      className="max-w-[1000px] mx-auto p-5"
    >
      {/* HEADER */}
      <header className="flex items-center gap-3">
        <Link
          href={`/businesses/${businessId}/locations/${locationId}/dashboard/location`}
          aria-label="Return to location"
          onClick={() => setIsLoading(true)}
        >
          <ArrowIcon direction="left" size={50} />
        </Link>

        <h1 id="edit-location-heading">Edit Location</h1>
      </header>

      <div className="mt-[1.5rem]">
        <EditLocationForm
          handleSubmit={handleSubmit}
          handleFormInput={handleFormInput}
          handleDelete={() => setShowDeleteModal(true)}
          isProcessing={isProcessing}
          locationData={locationData}
          errorMessage={errorMessage}
          canSubmit={canSubmit}
          isSaving={isSaving}
          isDeleting={isDeleting}
        />
      </div>

      <DeleteModal
        isOpen={showDeleteModal}
        title="Delete Location?"
        description={
          <p>
            Are you sure you want to delete{" "}
            <span className="font-semibold text-gray-900">
              {locationData.address}
            </span>
            ? All data associated with this location will also be removed.
          </p>
        }
        confirmLabel="Delete Location"
        isDeleting={isDeleting}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
      />
    </section>
  );
}
