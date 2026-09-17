"use client";

import axios from "axios";
import { SubmitEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import ArrowIcon from "@/components/icons/arrow";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import CreateBusinessModal from "@/components/ui/modal/CreateBusinessModal";
import { BusinessOwnerShip } from "@/types/types";
import BusinessList from "@/components/ui/businesses/BusinessList";

type CreateBusinessResponse = {
  message: string;

  business: {
    id: string;
    name: string;
    slug: string;
    domain: string | null;
  };

  location: {
    id: string;
    address: string;
  };
};

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<BusinessOwnerShip[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreatingBusiness, setIsCreatingBusiness] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(
    null,
  );

  const { update } = useSession();
  const router = useRouter();

  async function handleBusinessSelect(businessId: string) {
    await update({
      businessId,
    });

    router.push(`/businesses/${businessId}`);
  }

  async function getBusinesses() {
    try {
      const response = await axios.get<BusinessOwnerShip[]>("/api/businesses");

      setBusinesses(response.data);
    } catch (error) {
      console.error("Failed to load businesses:", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setErrorMessage(
          error.response?.data?.error ?? "Failed to load your businesses.",
        );
      } else {
        setErrorMessage("Failed to load your businesses.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    axios
      .get<BusinessOwnerShip[]>("/api/businesses")
      .then((response) => {
        setBusinesses(response.data);
      })
      .catch((error) => {
        console.error("Failed to load businesses:", error);

        if (axios.isAxiosError<{ error?: string }>(error)) {
          setErrorMessage(
            error.response?.data?.error ?? "Failed to load your businesses.",
          );
        } else {
          setErrorMessage("Failed to load your businesses.");
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  async function handleCreateBusiness(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    const name = formData.get("name");
    const address = formData.get("address");
    const country = formData.get("country");
    const state = formData.get("state");
    const city = formData.get("city");
    const zip = formData.get("zip");
    const parking = formData.get("parking") === "on";

    if (typeof name !== "string" || !name.trim()) {
      setCreateErrorMessage("A business name is required.");
      return;
    }

    if (typeof address !== "string" || !address.trim()) {
      setCreateErrorMessage("A location address is required.");
      return;
    }

    const requestBody = {
      name: typeof name === "string" ? name.trim() : "",
      address: address.trim(),
      country: typeof country === "string" ? country.trim() : "",
      state: typeof state === "string" ? state.trim() : "",
      city: typeof city === "string" ? city.trim() : "",
      zip: typeof zip === "string" ? zip.trim() : "",
      parking: parking,
    };

    setIsSubmitting(true);
    setCreateErrorMessage(null);

    try {
      const createBusinessToast = toast.promise<CreateBusinessResponse>(
        axios
          .post<CreateBusinessResponse>("/api/onboarding/business", requestBody)
          .then((response) => response.data),
        {
          loading: "Creating business...",
          success: (data) => ({
            message: "Business created",
            description: `${data.business.name} was created successfully.`,
          }),
          error: (error) => {
            if (axios.isAxiosError<{ error?: string }>(error)) {
              return {
                message: "Failed to create business.",
                description:
                  error.response?.data?.error ??
                  `Status code: ${error.response?.status ?? "No response"}`,
              };
            }

            return {
              message: "Unexpected error.",
              description: "Something went wrong while creating the business.",
            };
          },
        },
      );

      await createBusinessToast.unwrap();

      form.reset();

      setIsCreatingBusiness(false);

      // Reload the user's businesses so the newly-created
      // business immediately appears in the list.
      await getBusinesses();
    } catch (error) {
      console.error("Failed to create business:", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setCreateErrorMessage(
          error.response?.data?.error ?? "Failed to create the business.",
        );
      } else {
        setCreateErrorMessage("Failed to create the business.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="max-w-[1000px] mx-auto px-5 py-10">
        <p>Loading businesses...</p>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="max-w-[1000px] mx-auto px-5 py-10">
        <p className="text-red-500 bg-red-100 border-[0.1rem] border-red-500 rounded-lg px-3 py-2">
          {errorMessage}
        </p>
      </main>
    );
  }

  return (
    <main className="max-w-[1000px] mx-auto px-5 py-10">
      {/* ######################### */}
      {/* ##### Page Heading ###### */}
      {/* ######################### */}
      <h1 className="text-2xl font-semibold">Your Businesses</h1>
      <p className="text-gray-500 mt-1">Select a business to get started.</p>
      <div className="border border-gray-100 shadow-lg rounded-lg mt-5">
        <div className="w-full">
          <div className="flex justify-end p-2">
            <button
              className="shrink-0 border-[0.1rem] text-blue-800 bg-blue-200 border-blue-400 rounded-lg shadow- px-3 py-2"
              type="button"
              onClick={() => {
                setCreateErrorMessage(null);
                setIsCreatingBusiness(true);
              }}
            >
              Create Business
            </button>
          </div>
        </div>
        <div className="px-3 py-2">
          <BusinessList
            businesses={businesses}
            setCreateErrorMessage={setCreateErrorMessage}
            setIsCreatingBusiness={setIsCreatingBusiness}
            handleBusinessSelect={handleBusinessSelect}
          />
        </div>
      </div>
      {isCreatingBusiness && (
        <CreateBusinessModal
          isSubmitting={isSubmitting}
          setIsCreatingBusiness={setIsCreatingBusiness}
          handleCreateBusiness={handleCreateBusiness}
          createErrorMessage={createErrorMessage}
        />
      )}
    </main>
  );
}
