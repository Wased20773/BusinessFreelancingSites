"use client";

import ArrowIcon from "@/components/icons/arrow";
import EditCategoryForm from "@/components/ui/categories/EditCategoryForm";
import type { CategoryJson } from "@/types/types";
import axios from "axios";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

export default function EditCategoryPage() {
  const params = useParams<{ categoryId: string }>();
  const router = useRouter();

  const categoryId = params.categoryId;

  const [categoryData, setCategoryData] = useState<CategoryJson | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canSubmit, setCanSubmit] = useState<boolean>(false);

  useEffect(() => {
    async function getCategoryData() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const categoriesToast = toast.promise<CategoryJson[]>(
          axios
            .get<{ categories: CategoryJson[] }>("/api/business/categories")
            .then((response) => response.data.categories),
          {
            loading: "Loading category...",
            success: "Category loaded.",
            error: (error) => {
              if (axios.isAxiosError<{ error?: string }>(error)) {
                return {
                  message: "Failed to load category.",
                  description:
                    error.response?.data?.error ??
                    `Status code: ${error.response?.status ?? "No response"}`,
                };
              }

              return {
                message: "Unexpected error.",
                description: "Something went wrong while loading the category.",
              };
            },
          },
        );

        const categories = await categoriesToast.unwrap();

        const selectedCategory = categories.find(
          (category) => category.id === categoryId,
        );

        if (!selectedCategory) {
          setErrorMessage("This category could not be found.");
          return;
        }

        setCategoryData(selectedCategory);
        setCanSubmit(Boolean(selectedCategory.name.trim()));
      } catch (error) {
        console.error("Error in Edit Category page:", error);

        if (axios.isAxiosError<{ error?: string }>(error)) {
          setErrorMessage(
            error.response?.data?.error ?? "Failed to load category data.",
          );
        } else {
          setErrorMessage("Failed to load category data.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    void getCategoryData();
  }, [categoryId]);

  function handleFormInput(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);

    const name = formData.get("name");

    const hasName = typeof name === "string" && name.trim() !== "";

    setCanSubmit(hasName);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
      setErrorMessage("A category name is required.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const updateToast = toast.promise<CategoryJson>(
        axios
          .patch<CategoryJson>(
            `/api/admin/categories/${categoryId}`,
            requestBody,
          )
          .then((response) => response.data),
        {
          loading: "Updating category...",
          success: "Category updated.",
          error: (error) => {
            if (axios.isAxiosError<{ error?: string }>(error)) {
              return {
                message: "Failed to update category.",
                description:
                  error.response?.data?.error ??
                  `Status code: ${error.response?.status ?? "No response"}`,
              };
            }

            return {
              message: "Unexpected error.",
              description: "Something went wrong while updating the category.",
            };
          },
        },
      );

      const updatedCategory = await updateToast.unwrap();

      setCategoryData(updatedCategory);
    } catch (error) {
      console.error("Error updating category:", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setErrorMessage(
          error.response?.data?.error ?? "Failed to update the category.",
        );
      } else {
        setErrorMessage("Failed to update the category.");
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
          .delete(`/api/admin/categories/${categoryId}`)
          .then((response) => response.data),
        {
          loading: "Deleting category...",
          success: "Category deleted.",
          error: (error) => {
            if (axios.isAxiosError<{ error?: string }>(error)) {
              return {
                message: "Failed to delete category.",
                description:
                  error.response?.data?.error ??
                  `Status code: ${error.response?.status ?? "No response"}`,
              };
            }

            return {
              message: "Unexpected error.",
              description: "Something went wrong while deleting the category.",
            };
          },
        },
      );

      await deleteToast.unwrap();

      router.push("/dashboard/categories");
    } catch (error) {
      console.error("Error deleting category:", error);

      if (axios.isAxiosError<{ error?: string }>(error)) {
        setErrorMessage(
          error.response?.data?.error ?? "Failed to delete the category.",
        );
      } else {
        setErrorMessage("Failed to delete the category.");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return <p>Loading category</p>;
  }

  if (errorMessage && !categoryData) {
    return <p>{errorMessage}</p>;
  }

  if (!categoryData) {
    return <p>This category could not be found.</p>;
  }

  const isProcessing = isSaving || isDeleting;

  return (
    <section aria-labelledby="edit-category-heading">
      <header className="flex items-center gap-3">
        <Link
          href={`/dashboard/categories/${categoryData.id}`}
          aria-label="Return to categories"
        >
          <ArrowIcon direction="left" size={50} />
        </Link>

        <h1 id="edit-category-heading">Edit Category</h1>
      </header>

      <div className="mt-[1.5rem]">
        <EditCategoryForm
          handleSubmit={handleSubmit}
          handleFormInput={handleFormInput}
          handleDelete={handleDelete}
          isProcessing={isProcessing}
          categoryData={categoryData}
          errorMessage={errorMessage}
          canSubmit={canSubmit}
          isSaving={isSaving}
          isDeleting={isDeleting}
        />
      </div>
    </section>
  );
}
