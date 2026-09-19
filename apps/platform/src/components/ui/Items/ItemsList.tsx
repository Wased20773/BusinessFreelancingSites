import { CategoryJson } from "@/types/types";
import Image from "next/image";
import Link from "next/link";
import EditIcon from "@/components/icons/edit.svg";
import { moveOrder, ReorderDirection } from "@/lib/api/reorder";
import { Dispatch, SetStateAction, useState } from "react";
import { toast } from "sonner";
import axios from "axios";
import { getCategories } from "@/lib/api/categories";
import ReorderControls from "../controls/ReorderControls";
import { useParams } from "next/navigation";
import ChevronIcon from "@/components/icons/chevron";

type ItemsListParams = {
  categoryId: string;
  categoryData: CategoryJson;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
  setCategoryData: Dispatch<SetStateAction<CategoryJson | null>>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  canManage: boolean;
};

export default function ItemsList({
  categoryData,
  categoryId,
  setErrorMessage,
  setCategoryData,
  setIsLoading,
  canManage,
}: ItemsListParams) {
  const params = useParams<{
    businessId: string;
    locationId: string;
  }>();

  const businessId = params.businessId;
  const locationId = params.locationId;

  const [processingItemId, setProcessingItemId] = useState<string | null>(null);

  async function refreshCategoryData() {
    const refreshedCategory = await getCategories(businessId, locationId);

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
          businessId,
          locationId,
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
      aria-labelledby="category-items-heading"
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
    >
      <div className="border-b border-gray-300 px-5 py-4 sm:px-6">
        <h2
          id="category-items-heading"
          className="text-lg font-semibold text-gray-900"
        >
          Items
        </h2>
      </div>

      {categoryData.items?.length === 0 ? (
        <p className="p-5 text-sm text-gray-600 sm:px-6">
          This category has no items
        </p>
      ) : (
        <>
          {/* Mobile */}
          <ul className="divide-y divide-gray-200 md:hidden">
            {categoryData.items?.map((item, idx) => {
              const isProcessingItem = processingItemId === item.id;
              const isFirst = idx === 0;
              const isLast = idx === (categoryData.items?.length ?? 0) - 1;

              return (
                <li key={item.id}>
                  <div className="flex min-w-0 items-center gap-3 px-3 py-2">
                    {canManage && (
                      <ReorderControls
                        id={item.id}
                        isProcessing={isProcessingItem}
                        isFirst={isFirst}
                        isLast={isLast}
                        handleMove={handleMoveItem}
                      />
                    )}

                    <Link
                      href={`${categoryId}/items/${item.id}`}
                      className="flex min-w-0 flex-1 items-center gap-2"
                      aria-label={
                        canManage ? `Edit ${item.name}` : `View ${item.name}`
                      }
                      onClick={() => setIsLoading(true)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {item.name}
                        </p>
                        <p className="truncate text-sm text-gray-700">
                          {(() => {
                            const itemPrice = Number(item.price);

                            // Item has a base price; options are add-ons/toppings.
                            if (itemPrice > 0) {
                              return `$${itemPrice.toFixed(2)}`;
                            }

                            // Without a base price, available options determine the price.
                            const optionPrices = item.options
                              .filter((option) => option.isAvailable)
                              .map((option) => Number(option.price))
                              .filter((price) => Number.isFinite(price))
                              .sort((a, b) => a - b);

                            if (optionPrices.length === 0) {
                              return null;
                            }

                            const lowestPrice = optionPrices[0];
                            const highestPrice =
                              optionPrices[optionPrices.length - 1];

                            if (lowestPrice === highestPrice) {
                              return `$${lowestPrice.toFixed(2)}`;
                            }

                            return `$${lowestPrice.toFixed(2)} – $${highestPrice.toFixed(2)}`;
                          })()}
                        </p>
                        <p className="truncate text-xs text-gray-600">
                          Order: {item.order}
                        </p>
                      </div>

                      <span className="shrink-0 text-gray-600">
                        {canManage ? (
                          <Image
                            src={EditIcon}
                            alt=""
                            width={30}
                            height={30}
                            aria-hidden="true"
                          />
                        ) : (
                          <ChevronIcon direction="right" size={22} />
                        )}
                      </span>
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Desktop */}
          <div className="hidden overflow-x-auto md:block">
            <table
              className="w-full border-collapse text-left text-sm"
              aria-labelledby="category-items-heading"
            >
              <thead>
                <tr className="border-b border-gray-300 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Item
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Price
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
                {categoryData.items?.map((item, idx) => {
                  const isProcessingItem = processingItemId === item.id;
                  const isFirst = idx === 0;
                  const isLast = idx === (categoryData.items?.length ?? 0) - 1;

                  return (
                    <tr key={item.id}>
                      <th
                        scope="row"
                        className="px-3 py-2 font-medium text-gray-900"
                      >
                        {item.name}
                      </th>

                      <td className="px-3 py-2 text-gray-700">
                        {(() => {
                          const itemPrice = Number(item.price);

                          // Item has a base price; options are add-ons/toppings.
                          if (itemPrice > 0) {
                            return `$${itemPrice.toFixed(2)}`;
                          }

                          // Without a base price, available options determine the price.
                          const optionPrices = item.options
                            .filter((option) => option.isAvailable)
                            .map((option) => Number(option.price))
                            .filter((price) => Number.isFinite(price))
                            .sort((a, b) => a - b);

                          if (optionPrices.length === 0) {
                            return null;
                          }

                          const lowestPrice = optionPrices[0];
                          const highestPrice =
                            optionPrices[optionPrices.length - 1];

                          if (lowestPrice === highestPrice) {
                            return `$${lowestPrice.toFixed(2)}`;
                          }

                          return `$${lowestPrice.toFixed(2)} – $${highestPrice.toFixed(2)}`;
                        })()}
                      </td>

                      <td className="px-3 py-2 text-gray-600">{item.order}</td>

                      {canManage && (
                        <td className="px-3 py-2">
                          <ReorderControls
                            id={item.id}
                            isProcessing={isProcessingItem}
                            isFirst={isFirst}
                            isLast={isLast}
                            handleMove={handleMoveItem}
                          />
                        </td>
                      )}

                      <td className="px-3 py-2">
                        <Link
                          href={`${categoryId}/items/${item.id}`}
                          aria-label={
                            canManage
                              ? `Edit ${item.name}`
                              : `View ${item.name}`
                          }
                          className="flex size-10 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-blue-50"
                          onClick={() => setIsLoading(true)}
                        >
                          {canManage ? (
                            <Image
                              src={EditIcon}
                              alt=""
                              width={30}
                              height={30}
                              aria-hidden="true"
                            />
                          ) : (
                            <ChevronIcon direction="right" size={30} />
                          )}
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
