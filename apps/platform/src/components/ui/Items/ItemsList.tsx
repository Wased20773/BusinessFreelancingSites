import { CategoryJson } from "@/types/types";
import Image from "next/image";
import Link from "next/link";
import EditIcon from "@/components/icons/edit.svg";
import Divider from "@/components/layout/Divider";
import ChevronIcon from "@/components/icons/chevron";
import { SubmitEvent } from "react";
import { ReorderDirection } from "@/lib/api/reorder";

type ItemsListParams = {
  categoryId: string;
  categoryData: CategoryJson;
  handleMoveItem(itemId: string, direction: ReorderDirection): Promise<void>
  processingItemId: string | null;
  isLast: boolean;
};

export default function ItemsList({
  categoryData,
  categoryId,
  handleMoveItem,
  processingItemId,
  isLast
}: ItemsListParams) {

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
                      <div className="flex flex-col gap-1">
                        <button
                          className="bg-gray-400 px-3 py-1 rounded-t-xl cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                          type="button" disabled={isProcessingItem  || isFirst }
                          onClick={() => handleMoveItem(item.id, "up")}
                        >
                          <ChevronIcon direction="up" size={20} />
                        </button>
                        <button
                          className="bg-gray-300 px-3 py-1 rounded-b-xl cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                          type="button" disabled={isProcessingItem  || isLast }
                          onClick={() => handleMoveItem(item.id, "down")}
                        >
                          <ChevronIcon direction="down" size={20} />
                        </button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">
                          ${Number(item.price).toFixed(2)}
                        </p>
                        <p className="font-semibold truncate">{item.name}</p>
                        <p className="text-gray-500 truncate">
                          Order: {item.order}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`${categoryId}/items/${item.id}`}
                      aria-label={`Open ${item.name}`}
                      className="flex justify-center items-center"
                    >
                      <Image
                        src={EditIcon}
                        alt=""
                        width={50}
                        height={50}
                        aria-hidden="true"
                      />
                    </Link>

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
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">
                Items inside {categoryData.name}
              </caption>

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
                  const isProcessingItem =
                    processingItemId === item.id;

                  const isFirst = idx === 0;

                  const isLast =
                    idx === (categoryData.items?.length ?? 0) - 1;

                  return (
                    <tr
                      key={item.id}
                      className="border-gray-300"
                    >
                      <th
                        scope="row"
                        className="px-3 py-2 font-normal"
                      >
                        {item.name}
                      </th>

                      <td className="px-3 py-2">
                        ${Number(item.price).toFixed(2)}
                      </td>

                      <td className="px-3 py-2">
                        {item.order}
                      </td>

                      <td className="px-3 py-2">
                        <div className="flex flex-col w-fit">
                          <button
                            className="bg-gray-400 px-3 py-1 rounded-t-xl cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                            type="button"
                            disabled={
                              isProcessingItem || isFirst
                            }
                            onClick={() =>
                              handleMoveItem(item.id, "up")
                            }
                          >
                            <ChevronIcon
                              direction="up"
                              size={20}
                            />
                          </button>

                          <button
                            className="bg-gray-300 px-3 py-1 rounded-b-xl cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                            type="button"
                            disabled={
                              isProcessingItem || isLast
                            }
                            onClick={() =>
                              handleMoveItem(item.id, "down")
                            }
                          >
                            <ChevronIcon
                              direction="down"
                              size={20}
                            />
                          </button>
                        </div>
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
