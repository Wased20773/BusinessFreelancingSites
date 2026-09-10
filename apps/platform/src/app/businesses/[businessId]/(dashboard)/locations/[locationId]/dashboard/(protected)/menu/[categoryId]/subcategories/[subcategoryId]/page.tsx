"use client";

import CreateButtonIcon from "@/components/icons/create-button.svg";
import ActionItem from "@/components/ui/ActionItem";
import Divider from "@/components/layout/Divider";
import axios from "axios";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import "../../../../page.css";
import { ACCESS_LEVEL, type CategoryJson } from "@/types/types";
import ItemsList from "@/components/ui/items/ItemsList";
import CategoryInfo from "@/components/ui/categories/CategoryInfo";
import { useSession } from "next-auth/react";
import PageState from "@/components/ui/PageState";
import PageHeading from "@/components/ui/PageHeader";

export default function CategoryPage() {
  const params = useParams<{
    businessId: string;
    locationId: string;
    categoryId: string;
    subcategoryId: string;
  }>();

  const businessId = params.businessId;
  const locationId = params.locationId;
  const categoryId = params.categoryId;
  const subcategoryId = params.subcategoryId;

  const [subcategoryData, setSubcategoryData] = useState<CategoryJson | null>(
    null,
  );

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: session, status } = useSession();

  const currentAccessLevel = session?.user?.accessLevel;
  const canManageMenu =
    currentAccessLevel === ACCESS_LEVEL.owner ||
    currentAccessLevel === ACCESS_LEVEL.admin;
  const canViewMenu =
    canManageMenu || currentAccessLevel === ACCESS_LEVEL.staff;
  const isDeveloper = currentAccessLevel === ACCESS_LEVEL.developer;

  useEffect(() => {
    async function getCategoryData() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const categoryToast = toast.promise<CategoryJson[]>(
          axios
            .get<{ categories: CategoryJson[] }>("/api/business/menu", {
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
              if (axios.isAxiosError(error)) {
                return {
                  message: "Failed to load subcategory.",
                  description: `Status code: ${
                    error.response?.status ?? "No response"
                  }`,
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

        const categories = await categoryToast.unwrap();

        // Find the parent category first.
        const selectedCategory = categories.find(
          (category) => category.id === categoryId,
        );

        if (!selectedCategory) {
          setErrorMessage("This subcategory could not be found.");
          return;
        }

        // Then find the selected subcategory inside it.
        const selectedSubcategory = selectedCategory.subcategories?.find(
          (subcategory) => subcategory.id === subcategoryId,
        );

        if (!selectedSubcategory) {
          setErrorMessage("This subcategory could not be found.");
          return;
        }

        setSubcategoryData(selectedSubcategory);
      } catch (error) {
        console.error("Error in Category page:", error);

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

    if (status === "authenticated" && canViewMenu) {
      void getCategoryData();
    }
  }, [businessId, locationId, categoryId, subcategoryId, status, canViewMenu]);

  const pageState = PageState({
    status,
    isLoading,
    isDeveloper,
    canView: canViewMenu,
    pageTitle: "Menu",
    reason: "Your current access level does not include dashboard menu access.",
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

  return (
    <section
      aria-labelledby="subcategory-heading"
      className="max-w-[1000px] mx-auto p-5 pt-0"
    >
      {/* HEADER */}
      <PageHeading
        businessId={businessId}
        locationId={locationId}
        path={`menu/${categoryId}`}
        ariaLabel="Return to parent category"
        setIsLoading={setIsLoading}
        headingId="subcategory-heading"
        heading={subcategoryData.name}
      />

      <div className="mt-[0.5rem]">
        {/* ACTIONS */}
        {canManageMenu && (
          <>
            <nav className="dashboard-card">
              <ActionItem
                href={`/businesses/${businessId}/locations/${locationId}/dashboard/menu/${categoryId}/subcategories/${subcategoryId}/items/create`}
                icon={CreateButtonIcon}
                label="Create Item"
                setIsLoading={setIsLoading}
              />
            </nav>

            <Divider />
          </>
        )}

        {/* CATEGORY INFORMATION */}
        <CategoryInfo
          categoryId={subcategoryId}
          categoryData={subcategoryData}
          canManage={canManageMenu}
        />

        <Divider />

        {/* ITEMS */}
        <ItemsList
          categoryId={subcategoryId}
          categoryData={subcategoryData}
          setErrorMessage={setErrorMessage}
          setCategoryData={setSubcategoryData}
          setIsLoading={setIsLoading}
          canManage={canManageMenu}
        />
      </div>
    </section>
  );
}
