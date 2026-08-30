import { CategoryJson } from "@/types/types";
import Image from "next/image";
import Link from "next/link";
import EditIcon from "@/components/icons/edit.svg";
import Divider from "@/components/layout/Divider";
import { moveOrder, ReorderDirection } from "@/lib/api/reorder";
import { Dispatch, SetStateAction, useState } from "react";
import { toast } from "sonner";
import axios from "axios";
import { getCategories } from "@/lib/api/categories";
import ReorderControls from "../controls/ReorderControls";

type ItemsListParams = {
  categoryId: string;
  categoryData: CategoryJson;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
  setCategoryData: Dispatch<SetStateAction<CategoryJson | null>>;
};

// TODO: Make items disabled when something is processing

export default function ItemsList({
  categoryData,
  categoryId,
  setErrorMessage,
  setCategoryData,
}: ItemsListParams) {
  const [processingItemId, setProcessingItemId] = useState<string | null>(null);

  async function refreshCategoryData() {
    const refreshedCategory = await getCategories();

    const selectedCategory =
      refreshedCategory.find((category) => category.id === categoryId) ??
      refreshedCategory
        .flatMap((category) => category.subcategories ?? [])
        .find((subcategory) => subcategory.id === categoryId);

    if (!selectedCategory) {
      setErrorMessage("This category could not be found.");
      return;
    }

    setCategoryData(selectedCategory);
  }

  // ----------------------------
  // MOVE ITEM
  // ----------------------------
  async function handleMoveItem(itemId: string, direction: ReorderDirection) {
    setProcessingItemId(itemId);

    try {
      const moveToast = toast.promise(
        moveOrder({
          context: "item",
          direction,
          categoryId,
          itemId,
        }),
        {
          loading: direction === "up" ? "Moving item up" : "Moving item down",
          success: "Item order updated",
          error: (error) => {
            if (axios.isAxiosError(error)) {
              return {
                message: "Failed to move item.",
                description: `Status code: ${
                  error.response?.status ?? "No response"
                }`,
              };
            }

            return {
              message: "Unexpected error.",
              description: "Something went wrong while moving the item",
            };
          },
        },
      );

      await moveToast.unwrap();
      await refreshCategoryData();
    } catch (error) {
      console.error("Error moving item: ", error);
    } finally {
      setProcessingItemId(null);
    }
  }

  return (
    <section
      className="dashboard-card"
      aria-labelledby="category-items-heading"
    >
      <h2 id="category-items-heading" className="px-3 py-2">
        Items
      </h2>

      {categoryData.items?.length === 0 ? (
        <p className="px-3 pb-3">This category has no items</p>
      ) : (
        <>
          {/* MOBILE */}
          <ul className="md:hidden">
            {categoryData.items?.map((item, idx) => {
              const isProcessingItem = processingItemId === item.id;

              const isFirst = idx === 0;
              const isLast = idx === (categoryData.items?.length ?? 0) - 1;

              return (
                <li key={item.id} className="grid grid-cols-[1fr_auto]">
                  <div className="min-w-0 px-3 flex items-center gap-5">
                    <ReorderControls
                      id={item.id}
                      isProcessing={isProcessingItem}
                      isFirst={isFirst}
                      isLast={isLast}
                      handleMove={handleMoveItem}
                    />
                    <Link
                      href={`${categoryId}/items/${item.id}`}
                      className="flex-1 min-w-0 flex items-center"
                      aria-label={`Edit ${item.name}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">
                          ${Number(item.price).toFixed(2)}
                        </p>
                        <p className="font-semibold truncate">{item.name}</p>
                        <p className="text-gray-500 truncate">
                          Order: {item.order}
                        </p>
                      </div>
                      <Image
                        className="h-fit"
                        src={EditIcon}
                        alt=""
                        width={50}
                        height={50}
                        aria-hidden="true"
                      />
                    </Link>
                  </div>

                  {categoryData.items?.length !== idx + 1 && (
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
              aria-labelledby="category-items-heading"
            >
              <thead>
                <tr className="border-b border-gray-600">
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Item
                  </th>

                  <th scope="col" className="px-3 py-2 font-semibold">
                    Price
                  </th>

                  <th scope="col" className="px-3 py-2 font-semibold">
                    Order
                  </th>

                  <th scope="col" className="px-3 py-2 font-semibold">
                    Reorder
                  </th>

                  <th scope="col" className="w-12 px-3 py-2">
                    <span className="sr-only">Open item</span>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {categoryData.items?.map((item, idx) => {
                  const isProcessingItem = processingItemId === item.id;

                  const isFirst = idx === 0;
                  const isLast = idx === (categoryData.items?.length ?? 0) - 1;

                  return (
                    <tr key={item.id} className="border-gray-300">
                      <th scope="row" className="px-3 py-2 font-normal">
                        {item.name}
                      </th>

                      <td className="px-3 py-2">
                        ${Number(item.price).toFixed(2)}
                      </td>

                      <td className="px-3 py-2">{item.order}</td>

                      <td className="px-3 py-2">
                        <ReorderControls
                          id={item.id}
                          isProcessing={isProcessingItem}
                          isFirst={isFirst}
                          isLast={isLast}
                          handleMove={handleMoveItem}
                        />
                      </td>

                      <td>
                        <Link
                          href={`${categoryId}/items/${item.id}`}
                          aria-label={`Open ${item.name}`}
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
    </section>
  );
}
