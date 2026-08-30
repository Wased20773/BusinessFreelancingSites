import { CategoryJson } from "@/types/types";
import Image from "next/image";
import Link from "next/link";
import EditIcon from "@/components/icons/edit.svg";
import Divider from "@/components/layout/Divider";
import ReorderControls from "../controls/ReorderControls";
import { Dispatch, SetStateAction, useState } from "react";
import { getCategories } from "@/lib/api/categories";
import { moveOrder, ReorderDirection } from "@/lib/api/reorder";
import { toast } from "sonner";
import axios from "axios";

type SubcategoriesListParams = {
  categoryId: string;
  categoryData: CategoryJson;
  setCategoryData: Dispatch<SetStateAction<CategoryJson | null>>;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
};

export default function SubcategoriesList({
  categoryId,
  categoryData,
  setCategoryData,
  setErrorMessage,
}: SubcategoriesListParams) {
  const [processingSubcategoryId, setProcessingSubcategoryId] = useState<
    string | null
  >(null);

  async function refreshCategoryData() {
    const refreshedCategories = await getCategories();

    const selectedCategory = refreshedCategories.find(
      (category) => category.id === categoryId,
    );

    if (!selectedCategory) {
      setErrorMessage("This category could not be found.");
      return;
    }

    setCategoryData(selectedCategory);
  }

  // ----------------------------
  // MOVE CATEGORY
  // ----------------------------
  async function handleMoveSubcategory(
    categoryId: string,
    direction: ReorderDirection,
  ) {
    setProcessingSubcategoryId(categoryId);

    try {
      const moveToast = toast.promise(
        moveOrder({
          context: "category",
          direction,
          categoryId,
        }),
        {
          loading:
            direction === "up" ? "Moving category up" : "Moving category down",
          success: "Item order updated",
          error: (error) => {
            if (axios.isAxiosError(error)) {
              return {
                message: "Failed to move category.",
                description: `Status code: ${
                  error.response?.status ?? "No response"
                }`,
              };
            }

            return {
              message: "Unexpected error.",
              description: "Something went wrong while moving the category",
            };
          },
        },
      );

      await moveToast.unwrap();
      await refreshCategoryData();
    } catch (error) {
      console.error("Error moving category: ", error);
    } finally {
      setProcessingSubcategoryId(null);
    }
  }

  return (
    <section className="dashboard-card" aria-labelledby="subcategory-heading">
      <h2 id="subcategory-heading" className="px-3 py-2">
        Subcategories
      </h2>

      {categoryData.subcategories?.length === 0 ? (
        <p className="px-3 pb-3">This category has no subcategories</p>
      ) : (
        <>
          {/* MOBILE */}
          <ul className="md:hidden">
            {categoryData.subcategories?.map((subcategory, idx) => {
              const isProcessingSubcategory =
                processingSubcategoryId === subcategory.id;

              const isFirst = idx === 0;
              const isLast =
                idx === (categoryData.subcategories?.length ?? 0) - 1;

              return (
                <li key={subcategory.id} className="grid grid-cols-[1fr_auto]">
                  <div className="min-w-0 px-3 flex items-center gap-5">
                    <ReorderControls
                      id={subcategory.id}
                      isProcessing={isProcessingSubcategory}
                      isFirst={isFirst}
                      isLast={isLast}
                      handleMove={handleMoveSubcategory}
                    />
                    <Link
                      href={`${categoryId}/subcategories/${subcategory.id}`}
                      className="flex-1 min-w-0 flex items-center"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">
                          {subcategory.name}
                        </p>
                        <p className="text-gray-500 truncate">
                          Order: {subcategory.order}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <Image
                          src={EditIcon}
                          alt=""
                          width={50}
                          height={50}
                          aria-hidden="true"
                        />
                      </div>
                    </Link>
                  </div>

                  {categoryData.subcategories?.length !== idx + 1 && (
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
            <table
              className="w-full border-collapse text-left"
              aria-labelledby="subcategory-heading"
            >
              <thead>
                <tr className="border-b border-gray-600">
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Subcategory
                  </th>

                  <th scope="col" className="px-3 py-2 font-semibold">
                    Order
                  </th>

                  <th scope="col" className="px-3 py-2 font-semibold">
                    Visible
                  </th>

                  <th scope="col" className="w-12 px-3 py-2"></th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {categoryData?.subcategories?.map((subcategory) => (
                  <tr key={subcategory.id} className="border-gray-300">
                    <th scope="row" className="px-3 py-2 font-normal">
                      {subcategory.name}
                    </th>

                    <td className="px-3 py-2">{subcategory.order}</td>

                    <td className="px-3 py-2">
                      {subcategory.isVisible ? "Yes" : "No"}
                    </td>

                    <td>
                      <Link
                        href={`${categoryId}/subcategories/${subcategory.id}`}
                        aria-label={`Open ${subcategory.name}`}
                        className="flex justify-center w-fit"
                      >
                        <Image
                          src={EditIcon}
                          alt=""
                          width={30}
                          height={30}
                          aria-hidden="true"
                        />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
