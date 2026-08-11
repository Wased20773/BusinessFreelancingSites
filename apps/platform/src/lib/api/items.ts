import axios from "axios";
import type { ItemJson } from "@/types/types";

// ################
// ##### ITEM #####
// ################

// GET
export async function getItem(itemId: string): Promise<ItemJson> {
  return axios
    .get<ItemJson>(`/api/business/menu/items/${itemId}`)
    .then((response) => response.data);
}

// UPDATE
export async function updateItem(
  itemId: string,
  data: {
    name: string;
    description: string | null;
    containsList: string[];
    calories: number | null;
    price: number;
    isAvailable: boolean;
  },
): Promise<ItemJson> {
  return axios
    .patch<ItemJson>(`/api/admin/items/${itemId}`, data)
    .then((response) => response.data);
}

// DELETE
export async function deleteItem(itemId: string) {
  return axios
    .delete(`/api/admin/items/${itemId}`)
    .then((response) => response.data);
}

// ######################
// ##### ITEM IMAGE #####
// ######################

// POST
export async function createItemImage(itemId: string, image: File) {
  const formData = new FormData();

  formData.append("image", image);

  return axios
    .post(`/api/admin/items/${itemId}/image`, formData)
    .then((response) => response.data);
}

// PATCH
export async function updateItemImage(itemId: string, image: File) {
  const formData = new FormData();

  formData.append("image", image);

  return axios
    .patch(`/api/admin/items/${itemId}/image`, formData)
    .then((response) => response.data);
}

// DELETE
export async function deleteItemImage(itemId: string) {
  return axios
    .delete(`/api/admin/items/${itemId}/image`)
    .then((response) => response.data);
}
