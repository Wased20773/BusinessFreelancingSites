import { CategoryJson } from "@/types/types";
import axios from "axios";

// GET
export async function getCategories(
  businessId: string,
  locationId: string,
): Promise<CategoryJson[]> {
  return axios
    .get<{ categories: CategoryJson[] }>(`/api/business/menu/`, {
      headers: {
        "x-business-id": businessId,
        "x-location-id": locationId,
      },
    })
    .then((response) => response.data.categories);
}
