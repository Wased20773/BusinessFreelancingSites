"use client";

import type { CategoryJson } from "@/types/types";
import axios from "axios";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import "../page.css";
import ActionItem from "@/components/ui/ActionItem";
import CreateButtonIcon from "@/components/icons/create-button.svg";
import CategoryList from "@/components/ui/categories/CategoriesList";
import { useSession } from "next-auth/react";
import PageState from "@/components/ui/PageState";

export default function CategoriesPage() {
  const params = useParams<{
    businessId: string;
    locationId: string;
  }>();

  const businessId = params.businessId;
  const locationId = params.locationId;

  const { data: session, status } = useSession();

  const [categoryData, setCategoryData] = useState<CategoryJson[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const accessLevel = session?.user?.accessLevel;
  const canManageMenu = accessLevel === "owner" || accessLevel === "admin";
  const canViewMenu = canManageMenu || accessLevel === "staff";
  const isDeveloper = accessLevel === "developer";

  useEffect(() => {
    async function getCategoriesData() {
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
            loading: "Loading categories...",
            success: "Categories loaded.",
            error: (error) => {
              if (axios.isAxiosError<{ error?: string }>(error)) {
                return {
                  message: "Failed to load categories.",
                  description:
                    error.response?.data?.error ??
                    `Status code: ${error.response?.status ?? "No response"}`,
                };
              }

              return {
                message: "Unexpected error.",
                description:
                  "Something went wrong while loading the categories.",
              };
            },
          },
        );

        const categories = await categoriesToast.unwrap();

        setCategoryData(categories);
      } catch (error) {
        console.error("Error in Categories page:", error);

        if (axios.isAxiosError<{ error?: string }>(error)) {
          setErrorMessage(
            error.response?.data?.error ?? "Failed to load categories.",
          );
        } else {
          setErrorMessage("Failed to load categories.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    /*
     * Developer accounts should not retrieve
     * dashboard menu data at all.
     */
    if (status === "authenticated" && canViewMenu) {
      void getCategoriesData();
    }
  }, [businessId, locationId, status, canViewMenu]);

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

  return (
    <section
      aria-labelledby="menu-heading"
      className="mx-auto max-w-[1000px] p-5"
    >
      <h1 id="menu-heading">Menu</h1>

      <div className="mt-6 space-y-5">
        {canManageMenu && (
          <nav
            aria-label="Category actions"
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-3 shadow-sm"
          >
            <ActionItem
              href="menu/create"
              icon={CreateButtonIcon}
              label="Create Category"
              setIsLoading={setIsLoading}
            />
          </nav>
        )}

        <CategoryList
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          categoryData={categoryData}
          setCategoryData={setCategoryData}
          errorMessage={errorMessage}
          canManage={canManageMenu}
        />
      </div>
    </section>
  );
}
