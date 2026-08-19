"use client";

import { SubmitEvent, useState } from "react";
import Image from "next/image";
import axios from "axios";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import PeopleGroupIcon from "@/components/icons/people-group.svg";
import ShopIcon from "@/components/icons/shop.svg";
import CodeIcon from "@/components/icons/code.svg";

type OnboardingType = "staff" | "business" | "developer" | null;

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

export default function OnBoardingOptions() {
  const [selectedType, setSelectedType] = useState<OnboardingType>(null);

  const [isCreatingBusiness, setIsCreatingBusiness] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { update } = useSession();
  const router = useRouter();

  async function handleBusinessSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    const name = formData.get("name");
    const address = formData.get("address");

    if (typeof name !== "string" || !name.trim()) {
      setErrorMessage("A business name is required");
      return;
    }

    if (typeof address !== "string" || !address.trim()) {
      setErrorMessage("A location address is required");
      return;
    }

    setIsCreatingBusiness(true);
    setErrorMessage(null);

    try {
      const createBusinessToast = toast.promise<CreateBusinessResponse>(
        axios
          .post<CreateBusinessResponse>("/api/onboarding/business", {
            name: name.trim(),
            address: address.trim(),
          })
          .then((response) => response.data),
        {
          loading: "Creating your business...",
          success: (data) => ({
            message: "Business created",
            description: `${data.business.name} is ready to use.`,
          }),
          error: (error) => {
            if (axios.isAxiosError<{ error?: string }>(error)) {
              return {
                message: "Failed to create your business.",
                description:
                  error.response?.data?.error ??
                  `Status code: ${error.response?.status ?? "No response"}`,
              };
            }

            return {
              message: "Unexpected error.",
              description: "Something went wrong while creating your business.",
            };
          },
        },
      );

      await createBusinessToast.unwrap();

      /*
       * Refresh the JWT/session now that the user has
       * been linked to the newly created business.
       */
      await update();

      /*
       * The dashboard layout will now see the new
       * business information in the refreshed session.
       */
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("Failed to complete business onboarding:", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setErrorMessage(
          error.response?.data?.error ?? "Failed to create your business.",
        );
      } else {
        setErrorMessage("Failed to create your business.");
      }
    } finally {
      setIsCreatingBusiness(false);
    }
  }

  return (
    <div className="mx-3">
      <div className="max-w-[1000px] border-[0.1rem] border-gray-400 rounded-lg mx-auto mt-10 overflow-hidden">
        <div
          className={`
            flex w-[200%]
            transition-transform duration-700 ease-in-out
            ${selectedType ? "-translate-x-1/2" : "translate-x-0"}
          `}
        >
          {/* ################################ */}
          {/* ##### Role Selection Step ##### */}
          {/* ################################ */}
          <section className="w-1/2 shrink-0 px-5 py-5">
            <div className="flex flex-col items-center">
              <h1 className="text-xl font-semibold">
                What best describes you?
              </h1>

              <p className="text-gray-500 text-center mt-1 mb-5">
                Choose how you plan to use the platform.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full">
                {/* Staff */}
                <button
                  type="button"
                  className="flex flex-col border-[0.1rem] border-gray-300 rounded-lg px-4 py-4 text-left hover:border-gray-500 transition-colors"
                  onClick={() => setSelectedType("staff")}
                >
                  <div className="flex justify-center">
                    <Image
                      className="bg-gray-200 rounded-full p-2"
                      src={PeopleGroupIcon}
                      alt=""
                      aria-hidden="true"
                      width={60}
                      height={60}
                    />
                  </div>

                  <p className="font-semibold text-center mt-1">Staff</p>

                  <p className="flex-1 text-gray-600 mt-2">
                    Join an existing business and view the information you have
                    access to.
                  </p>
                </button>

                {/* Business Owner */}
                <button
                  type="button"
                  className="flex flex-col border-[0.1rem] border-gray-300 rounded-lg px-4 py-4 text-left hover:border-emerald-500 transition-colors"
                  onClick={() => setSelectedType("business")}
                >
                  <div className="flex justify-center">
                    <Image
                      className="bg-emerald-200 rounded-full p-2"
                      src={ShopIcon}
                      alt=""
                      aria-hidden="true"
                      width={60}
                      height={60}
                    />
                  </div>

                  <p className="font-semibold text-center mt-1">
                    Business Owner
                  </p>

                  <p className="flex-1 text-gray-600 mt-2">
                    Create your business and locations, manage their
                    information, and invite your team.
                  </p>
                </button>

                {/* Developer */}
                <button
                  type="button"
                  className="flex flex-col border-[0.1rem] border-gray-300 rounded-lg px-4 py-4 text-left hover:border-blue-500 transition-colors"
                  onClick={() => setSelectedType("developer")}
                >
                  <div className="flex justify-center">
                    <Image
                      className="bg-blue-200 rounded-full p-2"
                      src={CodeIcon}
                      alt=""
                      aria-hidden="true"
                      width={60}
                      height={60}
                    />
                  </div>

                  <p className="font-semibold text-center mt-1">Developer</p>

                  <p className="flex-1 text-gray-600 mt-2">
                    Join an existing business and build or maintain its website.
                  </p>
                </button>
              </div>
            </div>
          </section>

          {/* ############################## */}
          {/* ##### Selected Role Step ##### */}
          {/* ############################## */}

          <section className="w-1/2 shrink-0 px-5 py-5">
            <button
              type="button"
              className="text-blue-500 mb-5 disabled:opacity-50"
              onClick={() => setSelectedType(null)}
              disabled={isCreatingBusiness}
            >
              ← Back
            </button>

            {/* ################ */}
            {/* ##### Staff #### */}
            {/* ################ */}

            {selectedType === "staff" && (
              <div className="max-w-[600px] mx-auto">
                <div className="flex justify-center">
                  <Image
                    className="bg-gray-200 rounded-full p-2"
                    src={PeopleGroupIcon}
                    alt=""
                    aria-hidden="true"
                    width={70}
                    height={70}
                  />
                </div>

                <h2 className="text-xl font-semibold text-center mt-2">
                  Staff Access
                </h2>

                <p className="text-gray-600 text-center mt-3">
                  Staff members join businesses through an invitation from an
                  existing business.
                </p>

                <p className="text-gray-600 text-center mt-2">
                  Ask the business owner or an authorized administrator to
                  invite your account.
                </p>
              </div>
            )}

            {/* ######################### */}
            {/* ##### Business Owner #### */}
            {/* ######################### */}

            {selectedType === "business" && (
              <div className="max-w-[600px] mx-auto">
                <div className="flex justify-center">
                  <Image
                    className="bg-emerald-200 rounded-full p-2"
                    src={ShopIcon}
                    alt=""
                    aria-hidden="true"
                    width={70}
                    height={70}
                  />
                </div>

                <h2 className="text-xl font-semibold text-center mt-2">
                  Create Your Business
                </h2>

                <p className="text-gray-600 text-center mt-2 mb-5">
                  Start by creating your business and its first location.
                </p>

                <form
                  className="flex flex-col gap-4"
                  onSubmit={handleBusinessSubmit}
                >
                  {/* Business Name */}
                  <div>
                    <label className="font-semibold" htmlFor="business-name">
                      Business Name
                    </label>

                    <input
                      className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2 mt-1 disabled:opacity-50"
                      id="business-name"
                      name="name"
                      type="text"
                      placeholder="Enter your business name"
                      disabled={isCreatingBusiness}
                      required
                    />
                  </div>

                  {/* First Location */}
                  <div>
                    <label className="font-semibold" htmlFor="business-address">
                      First Location
                    </label>

                    <p className="text-sm text-gray-500 mb-1">
                      Enter the address for your first business location.
                    </p>

                    <input
                      className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2 disabled:opacity-50"
                      id="business-address"
                      name="address"
                      type="text"
                      placeholder="123 Main St"
                      disabled={isCreatingBusiness}
                      required
                    />
                  </div>

                  {errorMessage && (
                    <p className="text-red-500 bg-red-100 border-[0.1rem] border-red-500 rounded-lg px-2 py-1">
                      {errorMessage}
                    </p>
                  )}

                  <button
                    className="mt-3 ml-auto bg-emerald-300 border-[0.1rem] border-green-500 rounded-lg text-green-900 px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    type="submit"
                    disabled={isCreatingBusiness}
                  >
                    {isCreatingBusiness ? "Creating..." : "Create Business"}
                  </button>
                </form>
              </div>
            )}

            {/* #################### */}
            {/* ##### Developer #### */}
            {/* #################### */}

            {selectedType === "developer" && (
              <div className="max-w-[600px] mx-auto">
                <div className="flex justify-center">
                  <Image
                    className="bg-blue-200 rounded-full p-2"
                    src={CodeIcon}
                    alt=""
                    aria-hidden="true"
                    width={70}
                    height={70}
                  />
                </div>

                <h2 className="text-xl font-semibold text-center mt-2">
                  Developer Access
                </h2>

                <p className="text-gray-600 text-center mt-3">
                  Developers join an existing business through an invitation.
                </p>

                <p className="text-gray-600 text-center mt-2">
                  Once invited, the business will appear in your account and you
                  can access the tools available to your developer role.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
