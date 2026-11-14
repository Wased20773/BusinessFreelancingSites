"use client";

import EditItemView from "@/components/ui/items/EditItemView";
import { useParams } from "next/navigation";
import "../../../../page.css";

// Edit an item in a category (the subcategory page shares the same view).
export default function EditItemPage() {
  const { businessId, locationId, categoryId, itemId } = useParams<{
    businessId: string;
    locationId: string;
    categoryId: string;
    itemId: string;
  }>();

  return (
    <EditItemView
      businessId={businessId}
      locationId={locationId}
      itemId={itemId}
      backPath={`/businesses/${businessId}/locations/${locationId}/dashboard/menu/${categoryId}`}
      backLabel="Return to category"
    />
  );
}
