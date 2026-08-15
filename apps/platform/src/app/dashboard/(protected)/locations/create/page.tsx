"use client";

import ArrowIcon from "@/components/icons/arrow";
import CreateLocationForm from "@/components/ui/locations/CreateLocationForm";
import axios from "axios";
import Link from "next/link";
import { InputEvent, SubmitEvent, useState } from "react";
import { toast } from "sonner";

export default function CreateLocationPage() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canSubmit, setCanSubmit] = useState<boolean>(false);

  function handleFormInput(event: InputEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);

    const address = formData.get("address");

    const hasAddress = typeof address === "string" && address.trim() !== "";

    setCanSubmit(hasAddress);
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsLoading(true);
    setErrorMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const address = formData.get("address");
    const city = formData.get("city");
    const state = formData.get("state");
    const zip = formData.get("zip");
    const country = formData.get("country");
    const parking = formData.get("parking");

    const requestBody = {
      address: typeof address === "string" ? address.trim() : "",

      city: typeof city === "string" && city.trim() ? city.trim() : null,

      state: typeof state === "string" && state.trim() ? state.trim() : null,

      zip: typeof zip === "string" && zip.trim() ? zip.trim() : null,

      country:
        typeof country === "string" && country.trim() ? country.trim() : null,

      parking: parking !== null,
    };

    if (!requestBody.address) {
      setErrorMessage("A location must include an address");
      setIsLoading(false);
      return;
    }

    try {
      const locationToast = toast.promise(
        axios
          .post("/api/admin/locations", requestBody)
          .then((response) => response.data),
        {
          loading: "Creating location...",
          success: "Location created.",
          error: (error) => {
            if (axios.isAxiosError<{ error?: string }>(error)) {
              return {
                message: "Failed to create location.",
                description:
                  error.response?.data?.error ??
                  `Status code: ${error.response?.status ?? "No response"}`,
              };
            }

            return {
              message: "Unexpected error.",
              description: "Something went wrong while creating the location.",
            };
          },
        },
      );

      await locationToast.unwrap();

      // on successful creation, clear the form for re-use
      form.reset();
    } catch (error) {
      console.error("Error in Create Location page: ", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setErrorMessage(
          error.response?.data?.error ?? "Failed to create the location.",
        );
      } else {
        setErrorMessage("Failed to create the location.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section aria-labelledby="create-location-heading">
      <header className="flex items-center gap-3">
        <Link href="/dashboard/locations">
          <ArrowIcon direction="left" size={50} />
        </Link>
        <h1 id="create-location-heading">Create Location</h1>
      </header>

      <div className="mt-[1.5rem]">
        <CreateLocationForm
          handleSubmit={handleSubmit}
          handleFormInput={handleFormInput}
          canSubmit={canSubmit}
          isLoading={isLoading}
        />
      </div>
    </section>
  );
}
