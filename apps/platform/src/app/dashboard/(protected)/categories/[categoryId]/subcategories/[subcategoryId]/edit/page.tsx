"use client";

import ArrowIcon from "@/components/icons/arrow";
import type { CategoryJson } from "@/types/types";
import axios from "axios";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { InputEvent, SubmitEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import "../../../../../page.css";

export default function EditSubcategoryPage() {
  const params = useParams<{
    categoryId: string;
    subcategoryId: string;
  }>();

  const router = useRouter();

  const categoryId = params.categoryId;
  const subcategoryId = params.subcategoryId;

  const [subcategoryData, setSubcategoryData] = useState<CategoryJson | null>(
    null,
  );

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canSubmit, setCanSubmit] = useState<boolean>(false);

  useEffect(() => {
    async function getSubcategoryData() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const categoriesToast = toast.promise<CategoryJson[]>(
          axios
            .get<{ categories: CategoryJson[] }>("/api/business/categories")
            .then((response) => response.data.categories),
          {
            loading: "Loading subcategory...",
            success: "Subcategory loaded.",
            error: (error) => {
              if (axios.isAxiosError<{ error?: string }>(error)) {
                return {
                  message: "Failed to load subcategory.",
                  description:
                    error.response?.data?.error ??
                    `Status code: ${error.response?.status ?? "No response"}`,
                };
              }

              return {
                message: "Unexpected error.",
                description:
                  "Something went wrong while loading the subcategory.",
              };
            },
          },
        );

        const categories = await categoriesToast.unwrap();

        // Find the parent category.
        const selectedCategory = categories.find(
          (category) => category.id === categoryId,
        );

        if (!selectedCategory) {
          setErrorMessage("The parent category could not be found.");
          return;
        }

        // Find the selected subcategory inside the parent.
        const selectedSubcategory = selectedCategory.subcategories?.find(
          (subcategory) => subcategory.id === subcategoryId,
        );

        if (!selectedSubcategory) {
          setErrorMessage("This subcategory could not be found.");
          return;
        }

        setSubcategoryData(selectedSubcategory);
        setCanSubmit(Boolean(selectedSubcategory.name.trim()));
      } catch (error) {
        console.error("Error in Edit Subcategory page:", error);

        if (axios.isAxiosError<{ error?: string }>(error)) {
          setErrorMessage(
            error.response?.data?.error ?? "Failed to load subcategory data.",
          );
        } else {
          setErrorMessage("Failed to load subcategory data.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    void getSubcategoryData();
  }, [categoryId, subcategoryId]);

  function handleFormInput(event: InputEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);

    const name = formData.get("name");

    const hasName = typeof name === "string" && name.trim() !== "";

    setCanSubmit(hasName);
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    const name = formData.get("name");
    const description = formData.get("description");
    const isVisible = formData.get("isVisible");

    const requestBody = {
      name: typeof name === "string" ? name.trim() : "",

      description:
        typeof description === "string" && description.trim()
          ? description.trim()
          : null,

      isVisible: isVisible !== null,
    };

    if (!requestBody.name) {
      setErrorMessage("A subcategory name is required.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const updateToast = toast.promise<CategoryJson>(
        axios
          .patch<CategoryJson>(
            `/api/admin/categories/${subcategoryId}`,
            requestBody,
          )
          .then((response) => response.data),
        {
          loading: "Updating subcategory...",
          success: "Subcategory updated.",
          error: (error) => {
            if (axios.isAxiosError<{ error?: string }>(error)) {
              return {
                message: "Failed to update subcategory.",
                description:
                  error.response?.data?.error ??
                  `Status code: ${error.response?.status ?? "No response"}`,
              };
            }

            return {
              message: "Unexpected error.",
              description:
                "Something went wrong while updating the subcategory.",
            };
          },
        },
      );

      const updatedSubcategory = await updateToast.unwrap();

      setSubcategoryData(updatedSubcategory);
    } catch (error) {
      console.error("Error updating subcategory:", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setErrorMessage(
          error.response?.data?.error ?? "Failed to update the subcategory.",
        );
      } else {
        setErrorMessage("Failed to update the subcategory.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const deleteToast = toast.promise(
        axios
          .delete(`/api/admin/categories/${subcategoryId}`)
          .then((response) => response.data),
        {
          loading: "Deleting subcategory...",
          success: "Subcategory deleted.",
          error: (error) => {
            if (axios.isAxiosError<{ error?: string }>(error)) {
              return {
                message: "Failed to delete subcategory.",
                description:
                  error.response?.data?.error ??
                  `Status code: ${error.response?.status ?? "No response"}`,
              };
            }

            return {
              message: "Unexpected error.",
              description:
                "Something went wrong while deleting the subcategory.",
            };
          },
        },
      );

      await deleteToast.unwrap();

      // Return to the parent category after deleting the subcategory.
      router.push(`/dashboard/categories/${categoryId}`);
    } catch (error) {
      console.error("Error deleting subcategory:", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setErrorMessage(
          error.response?.data?.error ?? "Failed to delete the subcategory.",
        );
      } else {
        setErrorMessage("Failed to delete the subcategory.");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return <p>Loading subcategory...</p>;
  }

  if (errorMessage && !subcategoryData) {
    return <p role="alert">{errorMessage}</p>;
  }

  if (!subcategoryData) {
    return <p>This subcategory could not be found.</p>;
  }

  const isProcessing = isSaving || isDeleting;

  return (
    <section aria-labelledby="edit-subcategory-heading">
      <header className="flex items-center gap-3">
        <Link
          href={`/dashboard/categories/${categoryId}/subcategories/${subcategoryId}`}
          aria-label="Return to subcategory"
        >
          <ArrowIcon direction="left" size={50} />
        </Link>

        <h1 id="edit-subcategory-heading">Edit Subcategory</h1>
      </header>

      <div className="mt-[1.5rem]">
        <form
          className="dashboard-card flex flex-col gap-5 p-4"
          onSubmit={handleSubmit}
          onInput={handleFormInput}
        >
          <fieldset disabled={isProcessing}>
            <legend>Subcategory info</legend>

            <div>
              <label htmlFor="subcategory-name">Name</label>

              <input
                className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
                id="subcategory-name"
                name="name"
                type="text"
                defaultValue={subcategoryData.name}
              />
            </div>

            <div>
              <label htmlFor="subcategory-description">Description</label>

              <textarea
                className="block w-full border-[0.1rem] border-b-[0.2rem] rounded-lg border-blue-400 bg-gray-100 px-3 py-2"
                id="subcategory-description"
                name="description"
                rows={4}
                defaultValue={subcategoryData.description ?? ""}
              />
            </div>
          </fieldset>

          <fieldset disabled={isProcessing}>
            <legend>Display</legend>

            <label htmlFor="subcategory-visible" className="cursor-pointer">
              <input
                className="mr-2"
                id="subcategory-visible"
                name="isVisible"
                type="checkbox"
                defaultChecked={subcategoryData.isVisible}
              />
              Visible?
            </label>

            <div>
              <label htmlFor="subcategory-order">Order</label>

              <span
                className="block w-fit border-[0.1rem] border-b-[0.2rem] rounded-lg border-gray-300 bg-gray-100 px-3 py-2"
                id="subcategory-order"
              >
                {subcategoryData.order}
              </span>
            </div>
          </fieldset>

          {errorMessage && <p role="alert">{errorMessage}</p>}

          <button
            className="bg-emerald-300 border-[0.1rem] border-emerald-500 rounded-md text-emerald-900 px-2 py-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            type="submit"
            disabled={isProcessing || !canSubmit}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>

          <button
            className="bg-red-300 border-[0.1rem] border-red-500 rounded-md text-red-900 px-2 py-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            type="button"
            disabled={isProcessing}
            onClick={handleDelete}
          >
            {isDeleting ? "Deleting..." : "Delete Subcategory"}
          </button>
        </form>
      </div>
    </section>
  );
}
