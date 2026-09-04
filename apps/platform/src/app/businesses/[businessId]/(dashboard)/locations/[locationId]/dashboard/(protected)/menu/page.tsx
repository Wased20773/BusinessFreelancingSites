"use client";

import Divider from "@/components/layout/Divider";
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

  if (status === "loading") {
    return <p>Loading session...</p>;
  }

  if (status === "unauthenticated") {
    return <p>You must be signed in to view this page.</p>;
  }

  if (isDeveloper || !canViewMenu) {
    return (
      <section aria-labelledby="menu-heading">
        <h1 id="menu-heading">Menu</h1>

        <div className="mt-[1.5rem]">
          <div className="dashboard-card">
            <h2 className="text-xl font-semibold">Menu unavailable</h2>

            <p className="text-gray-500 mt-1">
              Your current access level does not include dashboard menu access.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="categories-heading">
      <h1 id="categories-heading">Menu</h1>

      <div className="mt-[1.5rem]">
        {/* Management Actions */}
        {canManageMenu && (
          <>
            <nav className="dashboard-card" aria-label="Category actions">
              <ActionItem
                href="menu/create"
                icon={CreateButtonIcon}
                label="Create Category"
              />
            </nav>

            <Divider />
          </>
        )}

        <CategoryList
          isLoading={isLoading}
          categoryData={categoryData}
          errorMessage={errorMessage}
          setCategoryData={setCategoryData}
          canManage={canManageMenu}
        />
      </div>
    </section>
  );
}
