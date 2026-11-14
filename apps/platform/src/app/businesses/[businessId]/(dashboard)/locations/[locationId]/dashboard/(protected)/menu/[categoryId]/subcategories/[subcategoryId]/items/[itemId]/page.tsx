"use client";

import EditItemView from "@/components/ui/items/EditItemView";
import { useParams } from "next/navigation";
import "../../../../../../page.css";

// Edit an item in a subcategory (the category page shares the same view).
export default function EditSubcategoryItemPage() {
  const { businessId, locationId, categoryId, subcategoryId, itemId } =
    useParams<{
      businessId: string;
      locationId: string;
      categoryId: string;
      subcategoryId: string;
      itemId: string;
    }>();

  return (
    <EditItemView
      businessId={businessId}
      locationId={locationId}
      itemId={itemId}
      backPath={`/businesses/${businessId}/locations/${locationId}/dashboard/menu/${categoryId}/subcategories/${subcategoryId}`}
      backLabel="Return to subcategory"
    />
  );
}
