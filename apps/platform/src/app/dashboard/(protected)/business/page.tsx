"use client";

import Image from "next/image";
import "../page.css";
import ExternalLinkIcon from "@/components/icons/external-link.svg";
import Link from "next/link";
import { SubmitEvent, useEffect, useState } from "react";
import axios from "axios";
import type { BusinessJson } from "@/types/types";
import Editicon from "@/components/icons/edit.svg";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function BusinessPage() {
  const [businessData, setBusinessData] = useState<BusinessJson | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [name, setName] = useState<string>("");

  const [isEdit, setIsEdit] = useState<boolean>(false);

  const { update } = useSession();
  const router = useRouter();

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const businessName = formData.get("name");

    if (typeof businessName !== "string" || !businessName.trim()) {
      setErrorMessage("A business name must be entered");
      return;
    }

    setIsSaving(true);
    try {
      const updateToast = toast.promise<BusinessJson>(
        axios
          .patch<BusinessJson>("/api/admin/business", {
            businessName: businessName,
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
        setErrorMessage(
          error.response?.data?.error ?? "Failed to update the business.",
        );
      } else {
        setErrorMessage("Failed to update the business.");
      }
    } finally {
      setIsSaving(false);
    }
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
          <div>
            <label htmlFor="business-name">Business Name</label>
            {/* Name */}
            {isEdit ? (
              <form onSubmit={handleSubmit}>
                <input
                  className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
                  id="business-name"
                  name="name"
                  type="text"
                  placeholder="Enter your business name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </form>
            ) : (
              <span className="block w-full border-[0.1rem] rounded-lg border-gray-300 bg-gray-100 px-3 py-2 text-gray-500">
                {businessData.name}
              </span>
            )}

            {/* Domain */}
            <p className="mt-1">Your domain is:</p>
            <div className="flex items-center">
              <Image
                src={ExternalLinkIcon}
                alt="External link"
                width={15}
                height={15}
              />
              <Link className="text-blue-500 ml-1" href="#">
                https://{businessData.domain}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
