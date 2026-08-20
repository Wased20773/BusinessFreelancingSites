"use client";

import axios from "axios";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import ExitIcon from "@/components/icons/exit-black.svg";
import Image from "next/image";

type LocationJson = {
  id: string;
  address: string;
  zip: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  parking: boolean;
  isActive: boolean;
};

type LocationsResponse = {
  business: {
    id: string;
    name: string;
  };

  locations: LocationJson[];
};

type CreateLocationResponse = {
  message: string;
  location: LocationJson;
};

export default function BusinessLocationsPage() {
  const params = useParams<{ businessId: string }>();

  const businessId = params.businessId;

  const [businessName, setBusinessName] = useState<string>("");
  const [locations, setLocations] = useState<LocationJson[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreatingLocation, setIsCreatingLocation] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(
    null,
  );

  async function getLocations() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await axios.get<LocationsResponse>(
        `/api/businesses/${businessId}/locations`,
      );

      setBusinessName(response.data.business.name);
      setLocations(response.data.locations);
    } catch (error) {
      console.error("Failed to load locations:", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setErrorMessage(
          error.response?.data?.error ?? "Failed to load business locations.",
        );
      } else {
        setErrorMessage("Failed to load business locations.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    axios
      .get<LocationsResponse>(`/api/businesses/${businessId}/locations`)
      .then((response) => {
        setBusinessName(response.data.business.name);
        setLocations(response.data.locations);
      })
      .catch((error) => {
        console.error("Failed to load locations:", error);

        if (axios.isAxiosError<{ error?: string }>(error)) {
          setErrorMessage(
            error.response?.data?.error ?? "Failed to load business locations.",
          );
        } else {
          setErrorMessage("Failed to load business locations.");
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [businessId]);

  async function handleCreateLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    const address = formData.get("address");
    const city = formData.get("city");
    const state = formData.get("state");
    const zip = formData.get("zip");
    const country = formData.get("country");

    if (typeof address !== "string" || !address.trim()) {
      setCreateErrorMessage("A location address is required.");
      return;
    }

    setIsSubmitting(true);
    setCreateErrorMessage(null);

    try {
      const createLocationToast = toast.promise<CreateLocationResponse>(
        axios
          .post<CreateLocationResponse>(
            `/api/businesses/${businessId}/locations`,
            {
              address: address.trim(),

              city:
                typeof city === "string" && city.trim() ? city.trim() : null,

              state:
                typeof state === "string" && state.trim() ? state.trim() : null,

              zip: typeof zip === "string" && zip.trim() ? zip.trim() : null,

              country:
                typeof country === "string" && country.trim()
                  ? country.trim()
                  : null,
            },
          )
          .then((response) => response.data),
        {
          loading: "Creating location...",

          success: {
            message: "Location created",
            description: "The new business location was added successfully.",
          },

          error: (error) => {
            if (
              axios.isAxiosError<{
                error?: string;
              }>(error)
            ) {
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

      await createLocationToast.unwrap();

      form.reset();

      setIsCreatingLocation(false);

      await getLocations();
    } catch (error) {
      console.error("Failed to create location:", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setCreateErrorMessage(
          error.response?.data?.error ?? "Failed to create the location.",
        );
      } else {
        setCreateErrorMessage("Failed to create the location.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="max-w-[1000px] mx-auto px-5 py-10">
        <p>Loading locations...</p>
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

      <div className="mb-6">
        <Link className="text-blue-500" href="/businesses">
          ← Businesses
        </Link>

        <div className="flex justify-between items-center gap-5 mt-3">
          <div>
            <h1 className="text-2xl font-semibold">{businessName}</h1>

            <p className="text-gray-500 mt-1">
              Select a location to open its dashboard.
            </p>
          </div>

          <button
            className="shrink-0 bg-emerald-300 border-[0.1rem] border-green-500 rounded-lg text-green-900 px-3 py-2"
            type="button"
            onClick={() => {
              setCreateErrorMessage(null);
              setIsCreatingLocation(true);
            }}
          >
            Create Location
          </button>
        </div>
      </div>

      {/* ######################## */}
      {/* ##### Empty State ##### */}
      {/* ######################## */}

      {locations.length === 0 ? (
        <section className="border-[0.1rem] border-gray-300 rounded-lg px-5 py-8 text-center">
          <h2 className="text-lg font-semibold">No locations yet</h2>

          <p className="text-gray-500 mt-2">
            This business does not currently have any locations.
          </p>

          <button
            className="bg-emerald-300 border-[0.1rem] border-green-500 rounded-lg text-green-900 px-3 py-2 mt-5"
            type="button"
            onClick={() => {
              setCreateErrorMessage(null);
              setIsCreatingLocation(true);
            }}
          >
            Create Location
          </button>
        </section>
      ) : (
        /* ########################### */
        /* ##### Location List ####### */
        /* ########################### */

        <section>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {locations.map((location) => (
              <li key={location.id}>
                <Link
                  className="block h-full border-[0.1rem] border-gray-300 rounded-lg px-4 py-4 hover:border-blue-400 hover:bg-gray-50 transition-colors"
                  href={`/businesses/${businessId}/locations/${location.id}/dashboard`}
                >
                  <div className="flex flex-col h-full">
                    <h2 className="font-semibold text-lg">
                      {location.address}
                    </h2>

                    {(location.city || location.state || location.zip) && (
                      <p className="text-sm text-gray-500 mt-1">
                        {[location.city, location.state, location.zip]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}

                    {location.country && (
                      <p className="text-sm text-gray-500">
                        {location.country}
                      </p>
                    )}

                    <p className="text-sm mt-3">
                      {location.isActive ? (
                        <span className="text-green-600">Active</span>
                      ) : (
                        <span className="text-gray-500">Inactive</span>
                      )}
                    </p>

                    <p className="text-blue-500 mt-auto pt-5">
                      Open dashboard →
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ############################# */}
      {/* ##### Create Location Modal # */}
      {/* ############################# */}

      {isCreatingLocation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5"
          onMouseDown={() => {
            if (!isSubmitting) {
              setIsCreatingLocation(false);
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
                <h2 className="text-xl font-semibold">Create Location</h2>

                <p className="text-gray-500 mt-1">
                  Add another location to {businessName}.
                </p>
              </div>

              <button
                className="text-2xl leading-none disabled:opacity-50"
                type="button"
                aria-label="Close create location form"
                disabled={isSubmitting}
                onClick={() => setIsCreatingLocation(false)}
              >
                <Image src={ExitIcon} alt="" width={20} height={20} />
              </button>
            </div>

            {/* Form */}
            <form
              className="flex flex-col gap-4 mt-5"
              onSubmit={handleCreateLocation}
            >
              {/* Address */}
              <div>
                <label className="font-semibold" htmlFor="location-address">
                  Address
                </label>

                <input
                  className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2 mt-1 disabled:opacity-50"
                  id="location-address"
                  name="address"
                  type="text"
                  placeholder="123 Main St"
                  disabled={isSubmitting}
                  required
                />
              </div>

              {/* City */}
              <div>
                <label className="font-semibold" htmlFor="location-city">
                  City
                </label>

                <input
                  className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2 mt-1 disabled:opacity-50"
                  id="location-city"
                  name="city"
                  type="text"
                  placeholder="Portland"
                  disabled={isSubmitting}
                />
              </div>

              {/* State + Zip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold" htmlFor="location-state">
                    State
                  </label>

                  <input
                    className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2 mt-1 disabled:opacity-50"
                    id="location-state"
                    name="state"
                    type="text"
                    placeholder="Oregon"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="font-semibold" htmlFor="location-zip">
                    ZIP
                  </label>

                  <input
                    className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2 mt-1 disabled:opacity-50"
                    id="location-zip"
                    name="zip"
                    type="text"
                    placeholder="97212"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Country */}
              <div>
                <label className="font-semibold" htmlFor="location-country">
                  Country
                </label>

                <input
                  className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2 mt-1 disabled:opacity-50"
                  id="location-country"
                  name="country"
                  type="text"
                  placeholder="United States"
                  disabled={isSubmitting}
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
                  onClick={() => setIsCreatingLocation(false)}
                >
                  Cancel
                </button>

                <button
                  className="bg-emerald-300 border-[0.1rem] border-green-500 rounded-lg text-green-900 px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating..." : "Create Location"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
