import { CategoryJson } from "@/types/types";
import Image from "next/image";
import Link from "next/link";
import EditIcon from "@/components/icons/edit.svg";

type CategoryInfoParams = {
  categoryId: string;
  categoryData: CategoryJson;
};

export default function CategoryInfo({
  categoryId,
  categoryData,
}: CategoryInfoParams) {
  return (
    <section
      className="dashboard-card p-4"
      aria-labelledby="category-info-heading"
    >
      <div className="flex justify-between items-center">
        <h2 id="category-info-heading">Category Information</h2>
        <Link href={`${categoryId}/edit`} className="shrink-0">
          <Image
            src={EditIcon}
            alt=""
            aria-hidden="true"
            className="md:min-w-[30px] min-w-[50px] h-fit"
          />
        </Link>
      </div>

      <div className="mt-3">
        <p className="font-semibold">Name</p>
        <p>{categoryData.name}</p>
      </div>

      <div className="mt-3">
        <p className="font-semibold">Description</p>
        <p>{categoryData.description || "No description"}</p>
      </div>

      <div className="mt-3">
        <p className="font-semibold">Order</p>
        <p>{categoryData.order}</p>
      </div>

      <div className="mt-3">
        <p className="font-semibold">Visible</p>
        <p>{categoryData.isVisible ? "Yes" : "No"}</p>
      </div>
    </section>
  );
}
