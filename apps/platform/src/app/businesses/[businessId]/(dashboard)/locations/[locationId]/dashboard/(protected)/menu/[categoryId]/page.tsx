"use client";

import CreateButtonIcon from "@/components/icons/create-button.svg";
import ActionItem from "@/components/ui/ActionItem";
import Divider from "@/components/layout/Divider";
import axios from "axios";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import "../../page.css";
import type { CategoryJson } from "@/types/types";
import CategoryInfo from "@/components/ui/categories/CategoryInfo";
import ItemsList from "@/components/ui/items/ItemsList";
import CategoryList from "@/components/ui/categories/CategoriesList";
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
  }>();

  const businessId = params.businessId;
  const locationId = params.locationId;
  const categoryId = params.categoryId;

  const [categoryData, setCategoryData] = useState<CategoryJson | null>(null);
  // isFetching: the category is loading (shows the page skeleton).
  // isLoading: a link was clicked and the next page is opening.
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: session, status } = useSession();

  const currentAccessLevel = session?.user?.accessLevel;
  const canManageMenu =
    currentAccessLevel === "owner" || currentAccessLevel === "admin";
  const canViewMenu = canManageMenu || currentAccessLevel === "staff";
  const isDeveloper = currentAccessLevel === "developer";

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

        const categories = await categoryToast.unwrap();

        const selectedCategory = categories.find(
          (category) => category.id === categoryId,
        );

        if (!selectedCategory) {
          setErrorMessage("This category could not be found.");
          return;
        }

        setCategoryData(selectedCategory);
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
  }, [businessId, locationId, categoryId, status, canViewMenu]);

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

  if (isFetching) {
    return (
      <CategoryPageSkeleton
        canManage={canManageMenu}
        showSubcategories={true}
      />
    );
  }

  if (errorMessage && !categoryData) {
    return (
      <p role="alert" className="p-5">
        {errorMessage}
      </p>
    );
  }

  if (!categoryData) {
    return <p className="p-5">This category could not be found.</p>;
  }

  return (
    <motion.section
      {...fadeInMotion}
      aria-labelledby="category-heading"
      className="relative max-w-[1000px] mx-auto"
    >
      <PageHeading
        path={`/businesses/${businessId}/locations/${locationId}/dashboard/menu`}
        ariaLabel="Return to menu"
        setIsLoading={setIsLoading}
        headingId="category-heading"
        heading="Go Back"
      />

      <div className="mt-6 space-y-5 p-5 pt-0">
        {canManageMenu && (
          <nav
            aria-label="Category actions"
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-3 shadow-sm"
          >
            <ActionItem
              href={`/businesses/${businessId}/locations/${locationId}/dashboard/menu/${categoryId}/items/create`}
              icon={CreateButtonIcon}
              label="Create Item"
              setIsLoading={setIsLoading}
            />

            <Divider />

            <ActionItem
              href={`/businesses/${businessId}/locations/${locationId}/dashboard/menu/${categoryId}/subcategories/create`}
              icon={CreateButtonIcon}
              label="Create Subcategory"
              setIsLoading={setIsLoading}
            />
          </nav>
        )}

        <CategoryInfo
          categoryId={categoryId}
          categoryData={categoryData}
          canManage={canManageMenu}
        />

        <ItemsList
          categoryId={categoryId}
          categoryData={categoryData}
          setErrorMessage={setErrorMessage}
          setCategoryData={setCategoryData}
          setIsLoading={setIsLoading}
          canManage={canManageMenu}
        />

        <CategoryList
          type="subcategory"
          parentCategoryId={categoryData.id}
          isLoading={false}
          setIsLoading={setIsLoading}
          categoryData={categoryData.subcategories ?? []}
          setCategoryData={(subcategories) => {
            setCategoryData((currentCategory) => {
              if (!currentCategory) return currentCategory;

              return {
                ...currentCategory,
                subcategories,
              };
            });
          }}
          errorMessage={errorMessage}
          canManage={canManageMenu}
        />
      </div>
    </motion.section>
  );
}
