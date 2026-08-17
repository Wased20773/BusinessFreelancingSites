"use client";

import ArrowIcon from "@/components/icons/arrow";
import type { CategoryJson } from "@/types/types";
import axios from "axios";
import Link from "next/link";
import { InputEvent, SubmitEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import "../../../../page.css";
import { useParams } from "next/navigation";
import CreateCategoryForm from "@/components/ui/categories/CreateCategoryForm";

export default function CreateCategoryPage() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canSubmit, setCanSubmit] = useState<boolean>(false);
  const [latestOrder, setLatestOrder] = useState<number>(0);

  const params = useParams<{
    categoryId: string;
  }>();

  const categoryId = params.categoryId;

  useEffect(() => {
    async function getLatestOrder() {
      try {
        const response = await axios.get<{
          categories: CategoryJson[];
        }>("/api/business/categories");

        const category = response.data.categories.find(
          (category) => category.id === categoryId,
        );

        if (!category || !category.subcategories?.length) {
          setLatestOrder(1);
          return;
        }

        const highestOrder = Math.max(
          ...category.subcategories.map((subcategory) => subcategory.order),
        );

        setLatestOrder(highestOrder + 1);
      } catch (error) {
        console.error("Failed to get latest subcategory order:", error);
      }
    }

    void getLatestOrder();
  }, [categoryId]);

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
    };

    if (!requestBody.name) {
      setErrorMessage("A category name is required.");
      setIsLoading(false);
      return;
    }

    try {
      const categoryToast = toast.promise<CategoryJson>(
        axios
          .post<CategoryJson>(
            `/api/admin/categories/${categoryId}/subcategory`,
            requestBody,
          )
          .then((response) => response.data),
        {
          loading: "Creating subcategory...",
          success: "Subcategory created.",
          error: (error) => {
            if (axios.isAxiosError<{ error?: string }>(error)) {
              return {
                message: "Failed to create subcategory.",
                description: `Status code: ${error.response?.status ?? "No response"}`,
              };
            }

            return {
              message: "Unexpected error.",
              description:
                "Something went wrong while creating the subcategory.",
            };
          },
        },
      );

      await categoryToast.unwrap();

      // On successful creation, clear the form for re-use.
      form.reset();
      setCanSubmit(false);
    } catch (error) {
      console.error("Error in Create Subcategory page:", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setErrorMessage(
          error.response?.data?.error ?? "Failed to create the subcategory.",
        );
      } else {
        setErrorMessage("Failed to create the subcategory.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  function handleFormInput(event: InputEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const name = formData.get("name");

    const hasName = typeof name === "string" && name.trim() !== "";

    setCanSubmit(hasName);
  }

  return (
    <section aria-labelledby="create-category-heading">
      <header className="flex items-center gap-3">
        <Link
          href={`/dashboard/categories/${categoryId}`}
          aria-label="Return to categories"
        >
          <ArrowIcon direction="left" size={50} />
        </Link>

        <h1 id="create-category-heading">Create Subcategory</h1>
      </header>

      <div className="mt-[1.5rem]">
        <CreateCategoryForm
          legend="Subcategory info"
          handleSubmit={handleSubmit}
          handleFormInput={handleFormInput}
          isLoading={isLoading}
          errorMessage={errorMessage}
          canSubmit={canSubmit}
          latestOrder={latestOrder || 1}
        />
      </div>
    </section>
  );
}
