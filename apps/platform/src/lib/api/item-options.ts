import axios from "axios";
import type { ItemOptionsJson } from "@/types/types";

// POST
export async function createItemOption(
  itemId: string,
  data: {
    name: string;
    price: number;
  },
): Promise<ItemOptionsJson> {
  return axios
    .post<ItemOptionsJson>(`/api/admin/items/${itemId}/options`, data)
    .then((response) => response.data);
}

// PATCH
export async function updateItemOption(
  itemId: string,
  optionId: string,
  data: {
    name: string;
    price: number;
    isAvailable: boolean;
  },
): Promise<ItemOptionsJson> {
  return axios
    .patch<ItemOptionsJson>(
      `/api/admin/items/${itemId}/options/${optionId}`,
      data,
    )
    .then((response) => response.data);
}

// DELETE
export async function deleteItemOption(itemId: string, optionId: string) {
  return axios
    .delete(`/api/admin/items/${itemId}/options/${optionId}`)
    .then((response) => response.data);
}
