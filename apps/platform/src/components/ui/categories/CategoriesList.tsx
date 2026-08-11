import Divider from "@/components/layout/Divider";
import { CategoryJson } from "@/types/types";
import Image from "next/image";
import Link from "next/link";
import EditIcon from "@/components/icons/edit.svg";

type CategoryListParams = {
  isLoading: boolean;
  categoryData: CategoryJson[];
  errorMessage: string | null;
};

export default function CategoryList({
  isLoading,
  categoryData,
  errorMessage,
}: CategoryListParams) {
  return (
    <div className="dashboard-card">
      {isLoading ? (
        <p>Loading categories...</p>
      ) : errorMessage ? (
        <p role="alert">{errorMessage}</p>
      ) : categoryData.length === 0 ? (
        <p>You have no categories</p>
      ) : (
        <>
          {/* MOBILE */}
          <ul className="md:hidden">
            {categoryData.map((category, idx) => (
              <li key={category.id} className="grid grid-cols-[1fr_auto]">
                <div className="min-w-0 px-3">
                  <p className="font-semibold truncate">{category.name}</p>

                  <p className="text-gray-500">Order: {category.order}</p>
                </div>

                <Link
                  href={`categories/${category.id}`}
                  aria-label={`Edit ${category.name}`}
                >
                  <Image
                    src={EditIcon}
                    alt=""
                    width={50}
                    height={50}
                    aria-hidden="true"
                  />
                </Link>

                {categoryData.length !== idx + 1 && (
                  <div className="col-span-2">
                    <Divider />
                  </div>
                )}
              </li>
            ))}
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

                  <th scope="col" className="w-12 px-3 py-2">
                    <span className="sr-only">Edit category</span>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {categoryData.map((category) => (
                  <tr key={category.id} className="border-gray-300">
                    <th scope="row" className="px-3 py-2 font-normal">
                      {category.name}
                    </th>

                    <td className="px-3 py-2">{category.order}</td>

                    <td>
                      <Link
                        href={`categories/${category.id}`}
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
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
