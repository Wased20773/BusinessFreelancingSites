import axios from "axios";
import type { ItemOptionsJson } from "@/types/types";

// POST
export async function createItemOption(
  businessId: string,
  locationId: string,
  itemId: string,
  data: {
    name: string;
    price: number;
    isSynced: boolean;
  },
): Promise<ItemOptionsJson> {
  return axios
    .post<ItemOptionsJson>(
      `/api/businesses/${businessId}/locations/${locationId}/items/${itemId}/options`,
      data,
    )
    .then((response) => response.data);
}

// PATCH
export async function updateItemOption(
  businessId: string,
  locationId: string,
  itemId: string,
  optionId: string,
  data: {
    name: string;
    price: number;
    isAvailable: boolean;
    isSynced: boolean;
  },
): Promise<ItemOptionsJson> {
  return axios
    .patch<ItemOptionsJson>(
      `/api/businesses/${businessId}/locations/${locationId}/items/${itemId}/options/${optionId}`,
      data,
    )
    .then((response) => response.data);
}

// DELETE
export async function deleteItemOption(
  businessId: string,
  locationId: string,
  itemId: string,
  optionId: string,
  deleteAllSynced: boolean,
) {
  return axios
    .delete(
      `/api/businesses/${businessId}/locations/${locationId}/items/${itemId}/options/${optionId}`,
      {
        data: { deleteAllSynced },
      },
    )
    .then((response) => response.data);
}
