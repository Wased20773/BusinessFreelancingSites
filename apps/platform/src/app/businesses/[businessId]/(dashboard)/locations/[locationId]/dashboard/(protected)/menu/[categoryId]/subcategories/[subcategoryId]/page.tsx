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
import CategoryPageSkeleton from "@/components/ui/categories/CategoryPageSkeleton";
import { motion } from "motion/react";
import { fadeInMotion } from "@/components/motion/listMotion";
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

  // isFetching: the subcategory is loading (shows the page skeleton).
  // isLoading: a link was clicked and the next page is opening.
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: session, status } = useSession();

  const currentAccessLevel = session?.user?.accessLevel;
  const canManageMenu =
    currentAccessLevel === ACCESS_LEVEL.owner ||
    currentAccessLevel === ACCESS_LEVEL.admin;
  const canViewMenu =
    canManageMenu ||
    currentAccessLevel === ACCESS_LEVEL.staff ||
    currentAccessLevel === ACCESS_LEVEL.developer;

  useEffect(() => {
    async function getCategoryData() {
      setIsFetching(true);
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
        setIsFetching(false);
      }
    }

    if (status === "authenticated" && canViewMenu) {
      void getCategoryData();
    }
  }, [businessId, locationId, categoryId, subcategoryId, status, canViewMenu]);

  const pageState = PageState({
    status,
    isLoading,
    canView: canViewMenu,
    pageTitle: "Menu",
    reason: "Your current access level does not include dashboard menu access.",
  });

  if (pageState) {
    return pageState;
  }

  if (isFetching) {
    return (
      <CategoryPageSkeleton canManage={canManageMenu} showSubcategories={false} />
    );
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
    <motion.section
      {...fadeInMotion}
      aria-labelledby="subcategory-heading"
      className="relative max-w-[1000px] mx-auto"
    >
      {/* HEADER */}
      <PageHeading
        path={`/businesses/${businessId}/locations/${locationId}/dashboard/menu/${categoryId}`}
        ariaLabel="Return to parent category"
        setIsLoading={setIsLoading}
        headingId="subcategory-heading"
        heading="Go Back"
      />

      <div className="mt-6 space-y-5 p-5 pt-0">
        {/* ACTIONS */}
        {canManageMenu && (
          <>
            <nav
              aria-label="Subcategory actions"
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-3 shadow-sm"
            >
              <ActionItem
                href={`/businesses/${businessId}/locations/${locationId}/dashboard/menu/${categoryId}/subcategories/${subcategoryId}/items/create`}
                icon={CreateButtonIcon}
                label="Create Item"
                setIsLoading={setIsLoading}
              />
            </nav>
          </>
        )}

        {/* CATEGORY INFORMATION */}
        <CategoryInfo
          categoryId={subcategoryId}
          categoryData={subcategoryData}
          canManage={canManageMenu}
        />

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
    </motion.section>
  );
}
