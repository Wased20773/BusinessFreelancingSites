"use client";

import Image from "next/image";
import "../page.css";
import ExternalLinkIcon from "@/components/icons/external-link.svg";
import Link from "next/link";
import { InputEvent, SubmitEvent, useEffect, useState } from "react";
import axios from "axios";
import type { BusinessJson } from "@/types/types";
import Editicon from "@/components/icons/edit.svg";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// This regex allows:
// 1. literal dot -> .
// 2. letters only -> [a-z]
// 3. at least 2 letters
// 4. MUST be at the end of the string
const DOMAIN_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9-]+)*\.[a-z]{2,}$/;

export default function BusinessPage() {
  const [businessData, setBusinessData] = useState<BusinessJson | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSavingName, setIsSavingName] = useState<boolean>(false);
  const [isSavingDomain, setIsSavingDomain] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorMessageName, setErrorMessageName] = useState<string | null>(null);
  const [errorMessageDomain, setErrorMessageDomain] = useState<string | null>(
    null,
  );
  const [name, setName] = useState<string>("");
  const [domain, setDomain] = useState<string | null>("");

  const [isEdit, setIsEdit] = useState<boolean>(false);

  const { update } = useSession();
  const router = useRouter();

  async function handleNameSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const businessName = formData.get("name");

    if (typeof businessName !== "string" || !businessName.trim()) {
      setErrorMessageName("A business name must be entered");
      return;
    }

    setIsSavingName(true);
    setErrorMessageName(null);

    try {
      const updateToast = toast.promise<BusinessJson>(
        axios
          .patch<BusinessJson>("/api/admin/business", {
            name: businessName,
          })
          .then((response) => response.data),
        {
          loading: "Updating business...",
          success: "Business updated",
          error: (error) => {
            if (axios.isAxiosError<{ error?: string }>(error)) {
              return {
                message: "Failed to update the business.",
                description: `Status code: ${error.response?.status ?? "No response"}`,
              };
            }

            return {
              message: "Unexpected error.",
              description: "Something went wrong while updating the business.",
            };
          },
        },
      );

      const updatedBusiness = await updateToast.unwrap();
      setBusinessData(updatedBusiness);
      await update({
        business: {
          name: updatedBusiness.name,
        },
      });
      router.refresh();
    } catch (error) {
      console.error("Error updating business:", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setErrorMessageName(
          error.response?.data?.error ?? "Failed to update the business.",
        );
      } else {
        setErrorMessageName("Failed to update the business.");
      }
    } finally {
      setIsSavingName(false);
    }
  }

  async function handleDomainSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const businessDomain = formData.get("domain");

    if (typeof businessDomain !== "string" || !businessDomain.trim()) {
      setErrorMessageDomain("A business domain must be entered");
      return;
    }

    if (!DOMAIN_REGEX.test(businessDomain)) {
      setErrorMessageDomain(
        "The domain must end with a valid TLD, such as .com, .net, or .org",
      );
      toast.error(
        "The domain must end with a valid TLD, such as .com, .net, or .org",
      );
      return;
    }

    setIsSavingDomain(true);
    setErrorMessageDomain(null);

    try {
      const updateToast = toast.promise<BusinessJson>(
        axios
          .patch<BusinessJson>("/api/admin/business", {
            domain: businessDomain,
          })
          .then((response) => response.data),
        {
          loading: "Updating business...",
          success: "Business updated",
          error: (error) => {
            if (axios.isAxiosError<{ error?: string }>(error)) {
              return {
                message: "Failed to update the business domain.",
                description:
                  error.response?.data?.error ??
                  `Status code: ${error.response?.status ?? "No response"}`,
              };
            }

            return {
              message: "Unexpected error.",
              description: "Something went wrong while updating the business.",
            };
          },
        },
      );

      const updatedBusiness = await updateToast.unwrap();
      setBusinessData(updatedBusiness);
      router.refresh();
    } catch (error) {
      console.error("Error updating business:", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setErrorMessageDomain(
          error.response?.data?.error ?? "Failed to update the business.",
        );
      } else {
        setErrorMessageDomain("Failed to update the business.");
      }
    } finally {
      setIsSavingDomain(false);
    }
  }

  function handleDomainInput(event: InputEvent<HTMLFormElement>) {
    const target = event.target;

    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    if (target.name !== "domain") {
      return;
    }

    const formattedDomain = target.value
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/[^a-z0-9.-]/g, "");

    setDomain(formattedDomain);
  }

  useEffect(() => {
    async function getBusinessData() {
      setIsLoading(true);

      try {
        const businessResponse = toast.promise<BusinessJson>(
          axios
            .get<BusinessJson>("/api/business")
            .then((response) => response.data),
          {
            loading: "Loading business",
            success: "Business loaded",
            error: (error) => {
              if (axios.isAxiosError<{ error?: string }>(error)) {
                return {
                  message: "Failed to load business data",
                  description:
                    error.response?.data?.error ??
                    `Status code: ${error.response?.status ?? "No response"}`,
                };
              }

              return {
                message: "Unexpected error.",
                description:
                  "Something went wrong while loading the business data.",
              };
            },
          },
        );

        const data: BusinessJson = await businessResponse.unwrap();

        setBusinessData(data);
        setName(data.name);
        setDomain(data.domain);
      } catch (e) {
        console.error("Error in Business page: ", e);

        if (axios.isAxiosError(e)) {
          setErrorMessage(
            e.response?.data?.error ?? "Failed to load business data.",
          );
        } else {
          setErrorMessage("Failed to load business data.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    void getBusinessData();
  }, []);

  if (isLoading) {
    return <p>Loading business...</p>;
  }

  if (errorMessage) {
    return <p>{errorMessage}</p>;
  }

  if (!businessData) {
    return <p>No business data was found</p>;
  }
  return (
    <div aria-labelledby="business-heading">
      <div className="flex justify-between items-center mb-[1.5rem]">
        <h1 id="business-heading">Business</h1>
        <button type="button" onClick={() => setIsEdit((prev) => !prev)}>
          <Image
            src={Editicon}
            alt="Edit Business Info"
            width={40}
            height={40}
          />
        </button>
      </div>

      <div>
        <section>
          <p></p>
          <div className="dashboard-card">
            {/* Name */}
            <h2>Business Name</h2>
            <p className="mb-3">
              Your business name is what customers will see on your website.
              Changing this has no effect on your web address or any form of
              access to your website.
            </p>
            {isEdit ? (
              <form className="flex flex-col gap-3" onSubmit={handleNameSubmit}>
                <div>
                  <label htmlFor="business-name">Business Name</label>
                  <input
                    className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 disabled:opacity-50 px-3 py-2"
                    id="business-name"
                    name="name"
                    type="text"
                    placeholder="Enter your business name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    disabled={isSavingName || isSavingDomain}
                  />
                </div>

                {errorMessageName && (
                  <p className="text-red-500 bg-red-100 border-[0.1rem] border-red-500 rounded-lg px-2 py-1">
                    {errorMessageName}
                  </p>
                )}

                <button
                  className="mt-3 ml-auto bg-emerald-300 border-[0.1rem] border-green-500 rounded-lg text-green-900 px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  type="submit"
                  disabled={isSavingName || isSavingDomain}
                >
                  {isSavingName ? "Saving..." : "Save Changes"}
                </button>
              </form>
            ) : (
              <span className="block w-full border-[0.1rem] rounded-lg border-gray-300 bg-gray-100 px-3 py-2 text-gray-500">
                {businessData.name}
              </span>
            )}

            {/* Domain */}
            <h2 className="mt-5">Domain</h2>
            <p className="mb-3">
              Your domain is the web address customers use to access your
              website. A domain was automatically generated for you when you
              completed onboarding. Your domain does not have to match your
              business name, and changing your business name will not change
              your domain. You can edit your domain separately if needed.
            </p>
            <p className="mt-1 font-semibold">Your domain is:</p>
            {isEdit ? (
              <form
                className="flex flex-col gap-3"
                onSubmit={handleDomainSubmit}
                onInput={handleDomainInput}
              >
                <div className="flex">
                  <Image
                    src={ExternalLinkIcon}
                    alt=""
                    aria-hidden="true"
                    width={15}
                    height={15}
                  />
                  <span className="text-blue-500 ml-1">
                    https://
                    <input
                      className="border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 disabled:opacity-50"
                      type="text"
                      name="domain"
                      value={domain || ""}
                      disabled={isSavingName || isSavingDomain}
                      style={{
                        width: `${Math.max((domain?.length ?? 0) + 1, 2)}ch`,
                      }}
                    />
                  </span>
                </div>

                {errorMessageDomain && (
                  <p className="text-red-500 bg-red-100 border-[0.1rem] border-red-500 rounded-lg px-2 py-1">
                    {errorMessageDomain}
                  </p>
                )}

                <button
                  className="mt-3 ml-auto bg-emerald-300 border-[0.1rem] border-green-500 rounded-lg text-green-900 px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  type="submit"
                  disabled={isSavingName || isSavingDomain}
                >
                  {isSavingDomain ? "Saving..." : "Save Changes"}
                </button>
              </form>
            ) : (
              <div className="flex items-center">
                <Image
                  src={ExternalLinkIcon}
                  alt=""
                  aria-hidden="true"
                  width={15}
                  height={15}
                />
                <Link className="text-blue-500 ml-1" href={`https://${domain}`}>
                  https://{businessData.domain}
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
