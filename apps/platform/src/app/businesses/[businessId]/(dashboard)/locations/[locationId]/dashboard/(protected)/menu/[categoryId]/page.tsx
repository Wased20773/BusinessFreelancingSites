"use client";

import ArrowIcon from "@/components/icons/arrow";
import CreateButtonIcon from "@/components/icons/create-button.svg";
import ActionItem from "@/components/ui/ActionItem";
import Divider from "@/components/layout/Divider";
import axios from "axios";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import "../../page.css";
import type { CategoryJson } from "@/types/types";
import CategoryInfo from "@/components/ui/categories/CategoryInfo";
import ItemsList from "@/components/ui/items/ItemsList";
import CategoryList from "@/components/ui/categories/CategoriesList";
import { useSession } from "next-auth/react";
import LoadingBar from "@/components/ui/LoadingBar";
import PageState from "@/components/ui/PageState";

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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: session, status } = useSession();

  const currentAccessLevel = session?.user?.accessLevel;
  const canManageMenu =
    currentAccessLevel === "owner" || currentAccessLevel === "admin";
  const canViewMenu = canManageMenu || currentAccessLevel === "staff";
  const isDeveloper = currentAccessLevel === "developer";

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
        setIsLoading(false);
      }
    }

    if (status === "authenticated" && canViewMenu) {
      void getCategoryData();
    }
  }, [businessId, locationId, categoryId]);

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
    <section
      aria-labelledby="category-heading"
      className="max-w-[1000px] mx-auto p-5"
    >
      {/* HEADER */}
      <header className="flex items-center gap-3">
        <Link
          href={`/businesses/${businessId}/locations/${locationId}/dashboard/menu`}
          aria-label="Return to menu"
          onClick={() => setIsLoading(true)}
        >
          <ArrowIcon direction="left" size={50} />
        </Link>

        <h1 className="truncate" id="category-heading">
          {categoryData.name}
        </h1>
      </header>

      <div className="mt-[1.5rem]">
        {/* ACTIONS */}
        <nav className="dashboard-card">
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

        <Divider />

        {/* CATEGORY INFORMATION */}
        <CategoryInfo categoryId={categoryId} categoryData={categoryData} />

        <Divider />

        {/* ITEMS */}
        <ItemsList
          categoryId={categoryId}
          categoryData={categoryData}
          setErrorMessage={setErrorMessage}
          setCategoryData={setCategoryData}
          setIsLoading={setIsLoading}
          canManage={canManageMenu}
        />

        <Divider />

        {/* SUBCATEGORIES */}
        <CategoryList
          type="subcategory"
          parentCategoryId={categoryData.id}
          isLoading={isLoading}
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
    </section>
  );
}
