import { CategoryJson } from "@/types/types";
import Image from "next/image";
import Link from "next/link";
import EditIcon from "@/components/icons/edit.svg";
import Divider from "@/components/layout/Divider";

type SubcategoriesListParams = {
  categoryId: string;
  categoryData: CategoryJson;
};

export default function SubcategoriesList({
  categoryId,
  categoryData,
}: SubcategoriesListParams) {
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
            {categoryData.subcategories?.map((subcategory, idx) => (
              <li key={subcategory.id} className="grid grid-cols-[1fr_auto]">
                <div className="min-w-0 px-3">
                  <p className="font-semibold truncate">{subcategory.name}</p>

                  <p className="text-gray-500">Order: {subcategory.order}</p>
                </div>

                <Link
                  href={`${categoryId}/subcategories/${subcategory.id}`}
                  aria-label={`Open ${subcategory.name}`}
                >
                  <Image
                    src={EditIcon}
                    alt=""
                    width={50}
                    height={50}
                    aria-hidden="true"
                  />
                </Link>

                {categoryData.subcategories?.length !== idx + 1 && (
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
                Subcategories inside {categoryData.name}
              </caption>

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

                  <th scope="col" className="w-12 px-3 py-2">
                    <span className="sr-only">Open subcategory</span>
                  </th>
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
