"use client";

import CreateItemView from "@/components/ui/items/CreateItemView";
import { useParams } from "next/navigation";
import "../../../../../../page.css";

// Create an item in a subcategory (the category page shares the same view).
export default function CreateSubcategoryItemPage() {
  const { businessId, locationId, categoryId, subcategoryId } = useParams<{
    businessId: string;
    locationId: string;
    categoryId: string;
    subcategoryId: string;
  }>();

  return (
    <CreateItemView
      businessId={businessId}
      locationId={locationId}
      categoryId={subcategoryId}
      backPath={`/businesses/${businessId}/locations/${locationId}/dashboard/menu/${categoryId}/subcategories/${subcategoryId}`}
      backLabel="Return to subcategory"
    />
  );
}
