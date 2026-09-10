"use client";

import EditCategoryForm from "@/components/ui/categories/EditCategoryForm";
import { ACCESS_LEVEL, type CategoryJson } from "@/types/types";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { InputEvent, SubmitEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import "../../../../../page.css";
import { useSession } from "next-auth/react";
import PageState from "@/components/ui/PageState";
import PageHeading from "@/components/ui/PageHeader";

export default function EditSubcategoryPage() {
  const params = useParams<{
    businessId: string;
    locationId: string;
    categoryId: string;
    subcategoryId: string;
  }>();

  const router = useRouter();

  const businessId = params.businessId;
  const locationId = params.locationId;
  const categoryId = params.categoryId;
  const subcategoryId = params.subcategoryId;

  const [subcategoryData, setSubcategoryData] = useState<CategoryJson | null>(
    null,
  );

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isSynced, setIsSynced] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canSubmit, setCanSubmit] = useState<boolean>(false);

  const { data: session, status } = useSession();

  const currentAccessLevel = session?.user?.accessLevel;

  const canManageSubcategory =
    currentAccessLevel === ACCESS_LEVEL.owner ||
    currentAccessLevel === ACCESS_LEVEL.admin;

  const isDeveloper = currentAccessLevel === ACCESS_LEVEL.developer;

  useEffect(() => {
    async function getSubcategoryData() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const categoriesToast = toast.promise<CategoryJson[]>(
          axios
            .get<{ categories: CategoryJson[] }>("/api/business/categories", {
              headers: {
                "x-business-id": businessId,
                "x-location-id": locationId,
              },
            })
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
        setIsSynced(selectedSubcategory.isSynced);
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

    if (status === "authenticated" && canManageSubcategory) {
      void getSubcategoryData();
    }
  }, [
    businessId,
    locationId,
    categoryId,
    subcategoryId,
    status,
    canManageSubcategory,
  ]);

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
      isSynced,
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
            `/api/businesses/${businessId}/locations/${locationId}/categories/${subcategoryId}`,
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
      setIsSynced(updatedSubcategory.isSynced);
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
          .delete(
            `/api/businesses/${businessId}/locations/${locationId}/categories/${subcategoryId}`,
            {
              data: {
                deleteAllSynced: isSynced,
              },
            },
          )
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
      router.push(
        `/businesses/${businessId}/locations/${locationId}/dashboard/menu/${categoryId}`,
      );
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

  const pageState = PageState({
    status,
    isLoading,
    isDeveloper,
    canView: canManageSubcategory,
    pageTitle: "Menu",
    reason: "Your current access level does not allow subcategory management.",
  });

  if (pageState) {
    return pageState;
  }

  if (errorMessage && !subcategoryData) {
    return (
      <p role="alert" className="p-5">
        {errorMessage}
      </p>
    );
  }

  if (!subcategoryData) {
    return <p className="p-5">This subcategory could not be found.</p>;
  }

  const isProcessing = isSaving || isDeleting;

  return (
    <section
      aria-labelledby="edit-subcategory-heading"
      className="max-w-[1000px] mx-auto p-5 pt-0"
    >
      {/* HEADER */}
      <PageHeading
        path={`/businesses/${businessId}/locations/${locationId}/dashboard/menu/${categoryId}/subcategories/${subcategoryId}`}
        ariaLabel="Return to subcategory"
        setIsLoading={setIsLoading}
        headingId="edit-subcategory-heading"
        heading="Edit Subcategory"
      />

      <div className="mt-[0.5rem]">
        <EditCategoryForm
          handleSubmit={handleSubmit}
          handleFormInput={handleFormInput}
          handleDelete={handleDelete}
          isProcessing={isProcessing}
          categoryData={subcategoryData}
          errorMessage={errorMessage}
          canSubmit={canSubmit}
          isSaving={isSaving}
          isDeleting={isDeleting}
          isSynced={isSynced}
          setIsSynced={setIsSynced}
        />
      </div>
    </section>
  );
}
