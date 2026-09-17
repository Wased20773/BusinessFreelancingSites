import EditIcon from "@/components/icons/edit.svg";
import type { CategoryJson } from "@/types/types";
import Image from "next/image";
import Link from "next/link";

type CategoryInfoParams = {
  categoryId: string;
  categoryData: CategoryJson;
  canManage: boolean;
};

export default function CategoryInfo({
  categoryId,
  categoryData,
  canManage,
}: CategoryInfoParams) {
  return (
    <section
      aria-labelledby="category-info-heading"
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
    >
      <div className="flex items-center justify-between gap-3 border-b border-gray-300 px-5 py-4 sm:px-6">
        <h2
          id="category-info-heading"
          className="text-lg font-semibold text-gray-900"
        >
          Category Information
        </h2>

        {canManage && (
          <Link
            href={`${categoryId}/edit`}
            aria-label="Edit category information"
            className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-gray-200 transition-colors hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-500"
          >
            <Image
              src={EditIcon}
              alt=""
              aria-hidden="true"
              width={30}
              height={30}
            />
          </Link>
        )}
      </div>

      <dl className="grid gap-x-6 gap-y-4 px-5 py-5 text-sm sm:grid-cols-2 sm:px-6">
        <div>
          <dt className="font-medium text-gray-600">Name</dt>
          <dd className="mt-1 break-words text-gray-900">
            {categoryData.name}
          </dd>
        </div>

        <div>
          <dt className="font-medium text-gray-600">Order</dt>
          <dd className="mt-1 text-gray-900">{categoryData.order}</dd>
        </div>

        <div className="sm:col-span-2">
          <dt className="font-medium text-gray-600">Description</dt>
          <dd className="mt-1 whitespace-pre-wrap text-gray-900">
            {categoryData.description || "No description"}
          </dd>
        </div>

        <div>
          <dt className="font-medium text-gray-600">Visible</dt>
          <dd className="mt-1 text-gray-900">
            {categoryData.isVisible ? "Yes" : "No"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
