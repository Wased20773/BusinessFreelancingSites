import Divider from "@/components/layout/Divider";
import { CategoryJson } from "@/types/types";
import Link from "next/link";
import ReorderControls from "../controls/ReorderControls";
import { getCategories } from "@/lib/api/categories";
import { toast } from "sonner";
import { moveOrder, ReorderDirection } from "@/lib/api/reorder";
import axios from "axios";
import ChevronIcon from "@/components/icons/chevron";
import { useParams } from "next/navigation";
import { Dispatch, SetStateAction, useState } from "react";
import ArrowIcon from "@/components/icons/arrow";

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

    if (!selectedCategory) {
      return;
    }

    setCategoryData(selectedCategory.subcategories ?? []);
  }

  // ----------------------------
  // MOVE CATEGORY
  // ----------------------------
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

  const label = isSubcategory ? "Subcategory" : "Category";

  return (
    <section
      className="dashboard-card"
      aria-labelledby={`${isSubcategory ? "subcategory" : "category"}-heading`}
    >
      <h2
        id={`${isSubcategory ? "subcategory" : "category"}-heading`}
        className="px-3 py-2"
      >
        {isSubcategory ? "Subcategories" : "Categories"}
      </h2>
      {isLoading ? (
        <p>Loading {isSubcategory ? "subcategories" : "categories"}...</p>
      ) : errorMessage ? (
        <p role="alert">{errorMessage}</p>
      ) : categoryData.length === 0 ? (
        <div>
          <p className="font-semibold">
            You have no {isSubcategory ? "subcategories" : "categories"}
          </p>

          <p className="text-gray-500">
            {isSubcategory
              ? "Create a subcategory to start organizing the items shown on your website."
              : "Create a category to start organizing the items shown on your website."}
          </p>
        </div>
      ) : (
        <>
          {/* MOBILE */}
          <ul className="md:hidden">
            {categoryData.map((category, idx) => {
              const isProcessingCategory = processingCategoryId === category.id;

              const isFirst = idx === 0;
              const isLast = idx === categoryData.length - 1;

              return (
                <li key={category.id} className="grid grid-cols-[1fr_auto]">
                  <div className="min-w-0 px-3 py-2 flex items-center gap-5">
                    {canManage && (
                      <ReorderControls
                        id={category.id}
                        isProcessing={isProcessingCategory}
                        isFirst={isFirst}
                        isLast={isLast}
                        handleMove={handleMoveCategory}
                      />
                    )}

                    {canManage ? (
                      <Link
                        href={getCategoryHref(category.id)}
                        className="flex-1 min-w-0 flex items-center"
                        aria-label={`Edit ${category.name}`}
                        onClick={() => setIsLoading(true)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">
                            {category.name}
                          </p>

                          <p className="text-gray-500 truncate">
                            Order: {category.order}
                          </p>
                        </div>

                        <div className="shrink-0">
                          <ChevronIcon direction="right" size={35} />
                        </div>
                      </Link>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">
                          {category.name}
                        </p>

                        <p className="text-gray-500 truncate">
                          Order: {category.order}
                        </p>
                      </div>
                    )}
                  </div>

                  {categoryData.length !== idx + 1 && (
                    <div className="col-span-2">
                      <Divider />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {/* DESKTOP */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-600">
                  <th scope="col" className="px-3 py-2 font-semibold">
                    {label}
                  </th>

                  <th scope="col" className="px-3 py-2 font-semibold">
                    Order
                  </th>

                  {canManage && (
                    <>
                      <th scope="col" className="px-3 py-2 font-semibold">
                        Reorder
                      </th>

                      <th scope="col" className="w-12 px-3 py-2"></th>
                    </>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y">
                {categoryData.map((category, idx) => {
                  const isProcessingCategory =
                    processingCategoryId === category.id;

                  const isFirst = idx === 0;
                  const isLast = idx === categoryData.length - 1;

                  return (
                    <tr key={category.id} className="border-gray-300">
                      <th scope="row" className="px-3 py-2 font-normal">
                        {category.name}
                      </th>

                      <td className="px-3 py-2">{category.order}</td>

                      {canManage && (
                        <>
                          <td className="px-3 py-2">
                            <ReorderControls
                              id={category.id}
                              isProcessing={isProcessingCategory}
                              isFirst={isFirst}
                              isLast={isLast}
                              handleMove={handleMoveCategory}
                            />
                          </td>

                          <td>
                            <Link
                              href={getCategoryHref(category.id)}
                              aria-label={`Edit ${category.name}`}
                              className="flex justify-center w-fit"
                            >
                              <ArrowIcon size={30} />
                            </Link>
                          </td>
                        </>
                      )}
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
