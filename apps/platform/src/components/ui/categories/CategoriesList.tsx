import ChevronIcon from "@/components/icons/chevron";
import { getCategories } from "@/lib/api/categories";
import { moveOrder, type ReorderDirection } from "@/lib/api/reorder";
import type { CategoryJson } from "@/types/types";
import axios from "axios";
import Link from "next/link";
import { useParams } from "next/navigation";
import { type Dispatch, type SetStateAction, useState } from "react";
import { toast } from "sonner";
import ReorderControls from "../controls/ReorderControls";

type CategoryListParams = {
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  categoryData: CategoryJson[];
  setCategoryData: (categories: CategoryJson[]) => void;
  errorMessage: string | null;
  type?: "category" | "subcategory";
  parentCategoryId?: string;
  canManage: boolean;
};

export default function CategoryList({
  isLoading,
  setIsLoading,
  categoryData,
  errorMessage,
  setCategoryData,
  type = "category",
  parentCategoryId,
  canManage,
}: CategoryListParams) {
  const params = useParams<{
    businessId: string;
    locationId: string;
  }>();

  const businessId = params.businessId;
  const locationId = params.locationId;

  const [processingCategoryId, setProcessingCategoryId] = useState<
    string | null
  >(null);

  const isSubcategory = type === "subcategory";

  async function refreshCategoryData() {
    const refreshedCategories = await getCategories(businessId, locationId);

    if (!isSubcategory) {
      setCategoryData(refreshedCategories);
      return;
    }

    const selectedCategory = refreshedCategories.find(
      (category) => category.id === parentCategoryId,
    );

    if (!selectedCategory) return;

    setCategoryData(selectedCategory.subcategories ?? []);
  }

  async function handleMoveCategory(
    categoryId: string,
    direction: ReorderDirection,
  ) {
    setProcessingCategoryId(categoryId);

    try {
      const moveToast = toast.promise(
        moveOrder({
          context: "category",
          direction,
          businessId,
          locationId,
          categoryId,
        }),
        {
          loading:
            direction === "up"
              ? `Moving ${isSubcategory ? "subcategory" : "category"} up`
              : `Moving ${isSubcategory ? "subcategory" : "category"} down`,
          success: isSubcategory
            ? "Subcategory order updated"
            : "Category order updated",
          error: (error) => {
            if (axios.isAxiosError(error)) {
              return {
                message: `Failed to move ${
                  isSubcategory ? "subcategory" : "category"
                }.`,
                description: `Status code: ${
                  error.response?.status ?? "No response"
                }`,
              };
            }

            return {
              message: "Unexpected error.",
              description: `Something went wrong while moving the ${
                isSubcategory ? "subcategory" : "category"
              }`,
            };
          },
        },
      );

      await moveToast.unwrap();
      await refreshCategoryData();
    } catch (error) {
      console.error(
        `Error moving ${isSubcategory ? "subcategory" : "category"}: `,
        error,
      );
    } finally {
      setProcessingCategoryId(null);
    }
  }

  function getCategoryHref(categoryId: string) {
    if (isSubcategory && parentCategoryId) {
      return `${parentCategoryId}/subcategories/${categoryId}`;
    }

    return `menu/${categoryId}`;
  }

  return (
    <section
      aria-labelledby={`${isSubcategory ? "subcategory" : "category"}-heading`}
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
    >
      <div className="border-b border-gray-300 px-5 py-4 sm:px-6">
        <h2
          id={`${isSubcategory ? "subcategory" : "category"}-heading`}
          className="text-lg font-semibold text-gray-900"
        >
          {isSubcategory ? "Subcategories" : "Categories"}
        </h2>
      </div>

      {isLoading ? (
        <p className="px-5 py-8 text-sm text-gray-600 sm:px-6">
          Loading {isSubcategory ? "subcategories" : "categories"}...
        </p>
      ) : errorMessage ? (
        <p role="alert" className="px-5 py-8 text-sm text-red-700 sm:px-6">
          {errorMessage}
        </p>
      ) : categoryData.length === 0 ? (
        <div className="p-5 sm:px-6">
          <p className="font-semibold text-gray-900">
            You have no {isSubcategory ? "subcategories" : "categories"}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {isSubcategory
              ? "Create a subcategory to start organizing the items shown on your website."
              : "Create a category to start organizing the items shown on your website."}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile */}
          <ul className="divide-y divide-gray-200 md:hidden">
            {categoryData.map((category, idx) => {
              const isProcessingCategory = processingCategoryId === category.id;
              const isFirst = idx === 0;
              const isLast = idx === categoryData.length - 1;

              return (
                <li key={category.id}>
                  <div className="flex min-w-0 items-center gap-3 px-3 py-2">
                    {canManage && (
                      <ReorderControls
                        id={category.id}
                        isProcessing={isProcessingCategory}
                        isFirst={isFirst}
                        isLast={isLast}
                        handleMove={handleMoveCategory}
                      />
                    )}

                    <Link
                      href={getCategoryHref(category.id)}
                      className="flex min-w-0 flex-1 items-center gap-2"
                      aria-label={
                        canManage
                          ? `Edit ${category.name}`
                          : `Enter ${category.name}`
                      }
                      onClick={() => setIsLoading(true)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {category.name}
                        </p>
                        <p className="truncate text-xs text-gray-600">
                          Order: {category.order}
                        </p>
                      </div>

                      <span className="shrink-0 text-gray-500">
                        <ChevronIcon direction="right" size={22} />
                      </span>
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Desktop */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-300 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Name
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Order
                  </th>
                  {canManage && (
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Reorder
                    </th>
                  )}
                  <th scope="col" className="w-12 px-3 py-2" />
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {categoryData.map((category, idx) => {
                  const isProcessingCategory =
                    processingCategoryId === category.id;
                  const isFirst = idx === 0;
                  const isLast = idx === categoryData.length - 1;

                  return (
                    <tr key={category.id}>
                      <th
                        scope="row"
                        className="px-3 py-2 font-medium text-gray-900"
                      >
                        {category.name}
                      </th>

                      <td className="px-3 py-2 text-gray-600">
                        {category.order}
                      </td>

                      {canManage && (
                        <td className="px-3 py-2">
                          <ReorderControls
                            id={category.id}
                            isProcessing={isProcessingCategory}
                            isFirst={isFirst}
                            isLast={isLast}
                            handleMove={handleMoveCategory}
                          />
                        </td>
                      )}

                      <td className="px-3 py-2">
                        <Link
                          href={getCategoryHref(category.id)}
                          aria-label={
                            canManage
                              ? `Edit ${category.name}`
                              : `Enter ${category.name}`
                          }
                          className="flex size-8 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-blue-50"
                        >
                          <ChevronIcon direction="right" size={22} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
