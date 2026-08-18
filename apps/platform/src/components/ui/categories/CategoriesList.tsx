import Divider from "@/components/layout/Divider";
import { CategoryJson } from "@/types/types";
import Image from "next/image";
import Link from "next/link";
import EditIcon from "@/components/icons/edit.svg";
import { Dispatch, SetStateAction, useState } from "react";
import ReorderControls from "../controls/ReorderControls";
import { getCategories } from "@/lib/api/categories";
import { toast } from "sonner";
import { moveOrder, ReorderDirection } from "@/lib/api/reorder";
import axios from "axios";
import ChevronIcon from "@/components/icons/chevron";

type CategoryListParams = {
  isLoading: boolean;
  categoryData: CategoryJson[];
  errorMessage: string | null;
  setCategoryData: Dispatch<SetStateAction<CategoryJson[]>>;
};

export default function CategoryList({
  isLoading,
  categoryData,
  errorMessage,
  setCategoryData,
}: CategoryListParams) {
  const [processingCategoryId, setProcessingCategoryId] = useState<
    string | null
  >(null);

  async function refreshCategoryData() {
    const refreshedCategories = await getCategories();

    setCategoryData(refreshedCategories);
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
      setProcessingCategoryId(null);
    }
  }

  return (
    <div className="dashboard-card">
      {isLoading ? (
        <p>Loading categories...</p>
      ) : errorMessage ? (
        <p role="alert">{errorMessage}</p>
      ) : categoryData.length === 0 ? (
        <div>
          <p className="font-semibold">You have no categories</p>
          <p className="text-gray-500">
            Create a category to start organizing the items shown on your
            website.
          </p>
        </div>
      ) : (
        <>
          {/* MOBILE */}
          <ul className="md:hidden">
            {categoryData.map((category, idx) => {
              const isProcessingCategory = processingCategoryId === category.id;

              const isFirst = idx === 0;
              const isLast = idx === (categoryData.length ?? 0) - 1;

              return (
                <li key={category.id} className="grid grid-cols-[1fr_auto]">
                  <div className="min-w-0 px-3 flex items-center gap-5">
                    <ReorderControls
                      id={category.id}
                      isProcessing={isProcessingCategory}
                      isFirst={isFirst}
                      isLast={isLast}
                      handleMove={handleMoveCategory}
                    />
                    <Link
                      href={`menu/${category.id}`}
                      className="flex-1 min-w-0 flex items-center"
                      aria-label={`Edit ${category.name}`}
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
              <caption className="sr-only">
                Business categories and their display order
              </caption>

              <thead>
                <tr className="border-b border-gray-600">
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Category
                  </th>

                  <th scope="col" className="px-3 py-2 font-semibold">
                    Order
                  </th>

                  <th scope="col" className="px-3 py-2 font-semibold">
                    Reorder
                  </th>

                  <th scope="col" className="w-12 px-3 py-2">
                    <span className="sr-only">Edit category</span>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {categoryData.map((category, idx) => {
                  const isProcessingCategory =
                    processingCategoryId === category.id;

                  const isFirst = idx === 0;
                  const isLast = idx === (categoryData.length ?? 0) - 1;

                  return (
                    <tr key={category.id} className="border-gray-300">
                      <th scope="row" className="px-3 py-2 font-normal">
                        {category.name}
                      </th>

                      <td className="px-3 py-2">{category.order}</td>
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
                          href={`menu/${category.id}`}
                          aria-label={`Edit ${category.name}`}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
