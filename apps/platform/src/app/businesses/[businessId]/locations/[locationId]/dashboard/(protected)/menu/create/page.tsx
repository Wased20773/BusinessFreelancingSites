"use client";

import ArrowIcon from "@/components/icons/arrow";
import type { CategoryJson } from "@/types/types";
import axios from "axios";
import Link from "next/link";
import { SubmitEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import "../../page.css";
import CreateCategoryForm from "@/components/ui/categories/CreateCategoryForm";
import { useParams, useRouter } from "next/navigation";

export default function CreateCategoryPage() {
  const params = useParams<{
    businessId: string;
    locationId: string;
  }>();

  const businessId = params.businessId;
  const locationId = params.locationId;

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canSubmit, setCanSubmit] = useState<boolean>(false);
  const [latestOrder, setLatestOrder] = useState<number>(0);
  const [isSynced, setIsSynced] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    async function getLatestOrder() {
      try {
        const response = await axios.get<{
          categories: CategoryJson[];
        }>("/api/business/categories", {
          headers: {
            "x-business-id": businessId,
            "x-location-id": locationId,
          },
        });

        const categories = response.data.categories;

        if (categories.length === 0) {
          setLatestOrder(1);
          return;
        }

        const highestOrder = Math.max(
          ...categories.map((category) => category.order),
        );

        setLatestOrder(highestOrder + 1);
      } catch (error) {
        console.error("Failed to get latest category order:", error);
      }
    }

    void getLatestOrder();
  }, [businessId, locationId]);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsLoading(true);
    setErrorMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const name = formData.get("name");
    const description = formData.get("description");

    const requestBody = {
      name: typeof name === "string" ? name.trim() : "",
      description:
        typeof description === "string" && description.trim()
          ? description.trim()
          : null,
      isSynced,
    };

    if (!requestBody.name) {
      setErrorMessage("A category name is required.");
      setIsLoading(false);
      return;
    }

    try {
      setIsCreating(true);
      const categoryToast = toast.promise<CategoryJson>(
        axios
          .post<CategoryJson>(
            `/api/businesses/${businessId}/locations/${locationId}/categories`,
            requestBody,
          )
          .then((response) => response.data),
        {
          loading: "Creating category...",
          success: "Category created.",
          error: (error) => {
            if (axios.isAxiosError<{ error?: string }>(error)) {
              return {
                message: "Failed to create category.",
                description:
                  error.response?.data?.error ??
                  `Status code: ${error.response?.status ?? "No response"}`,
              };
            }

            return {
              message: "Unexpected error.",
              description: "Something went wrong while creating the category.",
            };
          },
        },
      );

      await categoryToast.unwrap();

      form.reset();
      setCanSubmit(false);
      setIsSynced(false);

      router.push("/dashboard/menu");
    } catch (error) {
      console.error("Error in Create Category page:", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setErrorMessage(
          error.response?.data?.error ?? "Failed to create the category.",
        );
      } else {
        setErrorMessage("Failed to create the category.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  function handleFormInput(event: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const name = formData.get("name");

    const hasName = typeof name === "string" && name.trim() !== "";

    setCanSubmit(hasName);
  }

  return (
    <section aria-labelledby="create-category-heading">
      <header className="flex items-center gap-3">
        <Link
          href={`/businesses/${businessId}/locations/${locationId}/dashboard/menu`}
          aria-label="Return to menu"
        >
          <ArrowIcon direction="left" size={50} />
        </Link>

        <h1 id="create-category-heading">Create Category</h1>
      </header>

      <div className="mt-[1.5rem]">
        <CreateCategoryForm
          legend="Category info"
          handleSubmit={handleSubmit}
          handleFormInput={handleFormInput}
          isLoading={isLoading}
          errorMessage={errorMessage}
          canSubmit={canSubmit}
          latestOrder={latestOrder || 1}
          isCreating={isCreating}
          isSynced={isSynced}
          setIsSynced={setIsSynced}
        />
      </div>
    </section>
  );
}
