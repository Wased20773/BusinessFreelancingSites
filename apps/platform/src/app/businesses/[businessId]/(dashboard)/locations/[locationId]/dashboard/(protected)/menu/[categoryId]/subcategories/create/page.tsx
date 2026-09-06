"use client";

import ArrowIcon from "@/components/icons/arrow";
import type { CategoryJson } from "@/types/types";
import axios from "axios";
import Link from "next/link";
import { InputEvent, SubmitEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import "../../../../page.css";
import { useParams, useRouter } from "next/navigation";
import CreateCategoryForm from "@/components/ui/categories/CreateCategoryForm";
import { ACCESS_LEVEL } from "@/types/types";
import { useSession } from "next-auth/react";
import PageState from "@/components/ui/PageState";

export default function CreateCategoryPage() {
  const params = useParams<{
    businessId: string;
    locationId: string;
    categoryId: string;
  }>();

  const businessId = params.businessId;
  const locationId = params.locationId;
  const categoryId = params.categoryId;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canSubmit, setCanSubmit] = useState<boolean>(false);
  const [latestOrder, setLatestOrder] = useState<number>(0);
  const [isSynced, setIsSynced] = useState<boolean>(false);
  const [hasSyncGroup, setHasSyncGroup] = useState<boolean>(false);

  const { data: session, status } = useSession();

  const currentAccessLevel = session?.user?.accessLevel;
  const canCreateSubcategory =
    currentAccessLevel === ACCESS_LEVEL.owner ||
    currentAccessLevel === ACCESS_LEVEL.admin;
  const isDeveloper = currentAccessLevel === ACCESS_LEVEL.developer;

  const router = useRouter();

  useEffect(() => {
    async function getLatestOrder() {
      setIsLoading(true);

      try {
        const response = await axios.get<{
          categories: CategoryJson[];
        }>("/api/business/categories", {
          headers: {
            "x-business-id": businessId,
            "x-location-id": locationId,
          },
        });

        const category = response.data.categories.find(
          (category) => category.id === categoryId,
        );

        if (!category) {
          setErrorMessage("The selected category could not be found.");
          return;
        }

        setHasSyncGroup(Boolean(category.syncGroupId));

        if (!category.subcategories?.length) {
          setLatestOrder(1);
          return;
        }

        const highestOrder = Math.max(
          ...category.subcategories.map((subcategory) => subcategory.order),
        );

        setLatestOrder(highestOrder + 1);
      } catch (error) {
        console.error("Failed to get latest subcategory order:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (status === "authenticated" && canCreateSubcategory) {
      void getLatestOrder();
    }
  }, [businessId, locationId, categoryId, status, canCreateSubcategory]);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsCreating(true);
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
      setIsCreating(false);
      return;
    }

    try {
      const categoryToast = toast.promise<CategoryJson>(
        axios
          .post<CategoryJson>(
            `/api/businesses/${businessId}/locations/${locationId}/categories/${categoryId}/subcategory`,
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
      router.push(
        `/businesses/${businessId}/locations/${locationId}/dashboard/menu/${categoryId}`,
      );
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
      setIsCreating(false);
    }
  }

  function handleFormInput(event: InputEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const name = formData.get("name");

    const hasName = typeof name === "string" && name.trim() !== "";

    setCanSubmit(hasName);
  }

  const pageState = PageState({
    status,
    isLoading,
    isDeveloper,
    canView: canCreateSubcategory,
    pageTitle: "Menu",
    reason: "Your current access level does not allow subcategory creation.",
  });

  if (pageState) {
    return pageState;
  }

  return (
    <section
      aria-labelledby="create-category-heading"
      className="max-w-[1000px] mx-auto p-5"
    >
      <header className="flex items-center gap-3">
        <Link
          href={`/businesses/${businessId}/locations/${locationId}/dashboard/menu/${categoryId}`}
          aria-label="Return to menu"
          onClick={() => setIsLoading(true)}
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
          isCreating={isCreating}
          latestOrder={latestOrder || 1}
          isSynced={isSynced}
          setIsSynced={setIsSynced}
          hasSyncGroup={hasSyncGroup}
        />
      </div>
    </section>
  );
}
