"use client";

import CreateItemView from "@/components/ui/items/CreateItemView";
import { useParams } from "next/navigation";
import "../../../../page.css";

// Create an item in a category (the subcategory page shares the same view).
export default function CreateItemPage() {
  const { businessId, locationId, categoryId } = useParams<{
    businessId: string;
    locationId: string;
    categoryId: string;
  }>();

  return (
    <CreateItemView
      businessId={businessId}
      locationId={locationId}
      categoryId={categoryId}
      backPath={`/businesses/${businessId}/locations/${locationId}/dashboard/menu/${categoryId}`}
      backLabel="Return to category"
    />
  );
}
