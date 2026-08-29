"use client";

import axios from "axios";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import ExitIcon from "@/components/icons/exit-black.svg";
import Image from "next/image";

type BusinessUserJson = {
  id: string;

  role: {
    accessLevel: "developer" | "owner" | "admin" | "staff";
  };

  business: {
    id: string;
    name: string;
    slug: string;
    domain: string | null;
  };
};

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
  const [businesses, setBusinesses] = useState<BusinessUserJson[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreatingBusiness, setIsCreatingBusiness] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(
    null,
  );

  async function getBusinesses() {
    try {
      const response = await axios.get<BusinessUserJson[]>("/api/businesses");

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
      .get<BusinessUserJson[]>("/api/businesses")
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
  async function handleCreateBusiness(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    const name = formData.get("name");
    const address = formData.get("address");

    if (typeof name !== "string" || !name.trim()) {
      setCreateErrorMessage("A business name is required.");
      return;
    }

    if (typeof address !== "string" || !address.trim()) {
      setCreateErrorMessage("A location address is required.");
      return;
    }

    setIsSubmitting(true);
    setCreateErrorMessage(null);

    try {
      const createBusinessToast = toast.promise<CreateBusinessResponse>(
        axios
          .post<CreateBusinessResponse>("/api/onboarding/business", {
            name: name.trim(),
            address: address.trim(),
          })
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

      <div className="flex justify-between items-center gap-5 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Your Businesses</h1>

          <p className="text-gray-500 mt-1">
            Select a business to view its locations.
          </p>
        </div>

        <button
          className="shrink-0 bg-emerald-300 border-[0.1rem] border-green-500 rounded-lg text-green-900 px-3 py-2"
          type="button"
          onClick={() => {
            setCreateErrorMessage(null);
            setIsCreatingBusiness(true);
          }}
        >
          Create Business
        </button>
      </div>

      {/* ######################## */}
      {/* ##### Empty State ##### */}
      {/* ######################## */}

      {businesses.length === 0 ? (
        <section className="border-[0.1rem] border-gray-300 rounded-lg px-5 py-8 text-center">
          <h2 className="text-lg font-semibold">No businesses yet</h2>

          <p className="text-gray-500 mt-2">
            You are not currently connected to any businesses.
          </p>

          <p className="text-gray-500 mt-1">
            Create your own business or wait to be added to an existing
            business.
          </p>

          <button
            className="bg-emerald-300 border-[0.1rem] border-green-500 rounded-lg text-green-900 px-3 py-2 mt-5"
            type="button"
            onClick={() => {
              setCreateErrorMessage(null);
              setIsCreatingBusiness(true);
            }}
          >
            Create Business
          </button>
        </section>
      ) : (
        /* ########################### */
        /* ##### Business List ####### */
        /* ########################### */

        <section>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {businesses.map((businessUser) => (
              <li key={businessUser.id}>
                <Link
                  className="block h-full border-[0.1rem] border-gray-300 rounded-lg px-4 py-4 hover:border-blue-400 hover:bg-gray-50 transition-colors"
                  href={`/businesses/${businessUser.business.id}/locations`}
                >
                  <div className="flex flex-col h-full">
                    <h2 className="font-semibold text-lg">
                      {businessUser.business.name}
                    </h2>

                    <p className="text-sm text-gray-500 capitalize mt-1">
                      {businessUser.role.accessLevel}
                    </p>

                    {businessUser.business.domain && (
                      <p className="text-sm text-gray-500 break-all mt-3">
                        {businessUser.business.domain}
                      </p>
                    )}

                    <p className="text-blue-500 mt-auto pt-5">
                      View locations →
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ############################# */}
      {/* ##### Create Business Modal # */}
      {/* ############################# */}

      {isCreatingBusiness && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5"
          onMouseDown={() => {
            if (!isSubmitting) {
              setIsCreatingBusiness(false);
            }
          }}
        >
          <div
            className="w-full max-w-[600px] bg-white border-[0.1rem] border-gray-300 rounded-lg px-5 py-5"
            onMouseDown={(event) => event.stopPropagation()}
          >
            {/* Modal Heading */}
            <div className="flex justify-between items-start gap-5">
              <div>
                <h2 className="text-xl font-semibold">Create Business</h2>

                <p className="text-gray-500 mt-1">
                  Create a business and its first location.
                </p>
              </div>

              <button
                className="text-2xl leading-none disabled:opacity-50"
                type="button"
                aria-label="Close create business form"
                disabled={isSubmitting}
                onClick={() => setIsCreatingBusiness(false)}
              >
                <Image src={ExitIcon} alt="" width={20} height={20} />
              </button>
            </div>

            {/* Form */}
            <form
              className="flex flex-col gap-4 mt-5"
              onSubmit={handleCreateBusiness}
            >
              {/* Business Name */}
              <div>
                <label className="font-semibold" htmlFor="create-business-name">
                  Business Name
                </label>

                <input
                  className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2 mt-1 disabled:opacity-50"
                  id="create-business-name"
                  name="name"
                  type="text"
                  placeholder="Enter your business name"
                  disabled={isSubmitting}
                  required
                />
              </div>

              {/* First Location */}
              <div>
                <label
                  className="font-semibold"
                  htmlFor="create-business-address"
                >
                  First Location
                </label>

                <p className="text-sm text-gray-500 mt-1 mb-1">
                  Enter the address for your first business location.
                </p>

                <input
                  className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2 disabled:opacity-50"
                  id="create-business-address"
                  name="address"
                  type="text"
                  placeholder="123 Main St"
                  disabled={isSubmitting}
                  required
                />
              </div>

              {/* Error */}
              {createErrorMessage && (
                <p className="text-red-500 bg-red-100 border-[0.1rem] border-red-500 rounded-lg px-2 py-1">
                  {createErrorMessage}
                </p>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-3">
                <button
                  className="border-[0.1rem] border-gray-400 rounded-lg px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsCreatingBusiness(false)}
                >
                  Cancel
                </button>

                <button
                  className="bg-emerald-300 border-[0.1rem] border-green-500 rounded-lg text-green-900 px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating..." : "Create Business"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
