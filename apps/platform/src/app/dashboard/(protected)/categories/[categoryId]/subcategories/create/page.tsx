"use client";

import ArrowIcon from "@/components/icons/arrow";
import type { CategoryJson } from "@/types/types";
import axios from "axios";
import Link from "next/link";
import { SubmitEvent, useState } from "react";
import { toast } from "sonner";
import "../../../../page.css";
import { useParams } from "next/navigation";

export default function CreateCategoryPage() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canSubmit, setCanSubmit] = useState<boolean>(false);

  const params = useParams<{
    categoryId: string;
  }>();

  const categoryId = params.categoryId;

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
          href={`/dashboard/categories/${categoryId}`}
          aria-label="Return to categories"
        >
          <ArrowIcon direction="left" size={50} />
        </Link>

        <h1 id="create-category-heading">Create Subcategory</h1>
      </header>

      <div className="mt-[1.5rem]">
        <form
          className="dashboard-card flex flex-col gap-5 p-4"
          onSubmit={handleSubmit}
          onInput={handleFormInput}
        >
          <fieldset disabled={isLoading}>
            <legend>Subcategory info</legend>

            <div>
              <label htmlFor="category-name">Name</label>

              <input
                className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
                id="category-name"
                name="name"
                type="text"
              />
            </div>

            <div>
              <label htmlFor="category-description">Description</label>

              <textarea
                className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
                id="category-description"
                name="description"
                rows={4}
              />
            </div>
          </fieldset>

          <button
            className="bg-emerald-300 border-[0.1rem] border-emerald-500 rounded-md text-emerald-900 px-2 py-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            type="submit"
            disabled={isLoading || !canSubmit}
          >
            {isLoading ? "Creating..." : "Create"}
          </button>
        </form>
      </div>
    </section>
  );
}
