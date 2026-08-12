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
import SubcategoriesList from "@/components/ui/subcategories/SubcategoriesList";

export default function CategoryPage() {
  const params = useParams<{ categoryId: string }>();

  const categoryId = params.categoryId;

  const [categoryData, setCategoryData] = useState<CategoryJson | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function getCategoryData() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const categoryToast = toast.promise<CategoryJson[]>(
          axios
            .get<{ categories: CategoryJson[] }>("/api/business/menu")
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

    void getCategoryData();
  }, [categoryId]);

  if (isLoading) {
    return <p>Loading category...</p>;
  }

  if (errorMessage && !categoryData) {
    return <p role="alert">{errorMessage}</p>;
  }

  if (!categoryData) {
    return <p>This category could not be found.</p>;
  }

  return (
    <section aria-labelledby="category-heading">
      {/* HEADER */}
      <header className="flex items-center gap-3">
        <Link href="/dashboard/categories" aria-label="Return to categories">
          <ArrowIcon direction="left" size={50} />
        </Link>

        <h1 id="category-heading">{categoryData.name}</h1>
      </header>

      <div className="mt-[1.5rem]">
        {/* ACTIONS */}
        <nav className="dashboard-card">
          <ActionItem
            href={`${categoryId}/items/create`}
            icon={CreateButtonIcon}
            label="Create Item"
          />

          <Divider />

          <ActionItem
            href={`${categoryId}/subcategories/create`}
            icon={CreateButtonIcon}
            label="Create Subcategory"
          />
        </nav>

        <Divider />

        {/* CATEGORY INFORMATION */}
        <CategoryInfo categoryId={categoryId} categoryData={categoryData} />

        <Divider />

        {/* ITEMS */}
        <ItemsList categoryId={categoryId} categoryData={categoryData} />

        <Divider />

        {/* SUBCATEGORIES */}
        <SubcategoriesList
          categoryId={categoryId}
          categoryData={categoryData}
        />
      </div>
    </section>
  );
}
