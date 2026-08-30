import axios from "axios";
import type { ItemJson } from "@/types/types";

// ################
// ##### ITEM #####
// ################

// GET
export async function getItem(
  businessId: string,
  locationId: string,
  itemId: string,
): Promise<ItemJson> {
  return axios
    .get<ItemJson>(`/api/business/menu/items/${itemId}`, {
      headers: {
        "x-business-id": businessId,
        "x-location-id": locationId,
      },
    })
    .then((response) => response.data);
}

// UPDATE
export async function updateItem(
  businessId: string,
  locationId: string,
  itemId: string,
  data: {
    name: string;
    description: string | null;
    containsList: string[];
    calories: number | null;
    price: number;
    isAvailable: boolean;
    isSynced: boolean;
  },
): Promise<ItemJson> {
  return axios
    .patch<ItemJson>(
      `/api/businesses/${businessId}/locations/${locationId}/items/${itemId}`,
      data,
    )
    .then((response) => response.data);
}

// DELETE
export async function deleteItem(
  businessId: string,
  locationId: string,
  itemId: string,
  deleteAllSynced: boolean,
) {
  return axios
    .delete(
      `/api/businesses/${businessId}/locations/${locationId}/items/${itemId}`,
      {
        data: {
          deleteAllSynced,
        },
      },
    )
    .then((response) => response.data);
}

// ######################
// ##### ITEM IMAGE #####
// ######################

// POST
export async function createItemImage(
  businessId: string,
  locationId: string,
  itemId: string,
  image: File,
  isSynced: boolean,
) {
  const formData = new FormData();

  formData.append("image", image);
  formData.append("isSynced", String(isSynced));

  return axios
    .post(
      `/api/businesses/${businessId}/locations/${locationId}/items/${itemId}/image`,
      formData,
    )
    .then((response) => response.data);
}

// PATCH
export async function updateItemImage(
  businessId: string,
  locationId: string,
  itemId: string,
  image: File,
  isSynced: boolean,
) {
  const formData = new FormData();

  formData.append("image", image);
  formData.append("isSynced", String(isSynced));

  return axios
    .patch(
      `/api/businesses/${businessId}/locations/${locationId}/items/${itemId}/image`,
      formData,
    )
    .then((response) => response.data);
}

// DELETE
export async function deleteItemImage(
  businessId: string,
  locationId: string,
  itemId: string,
  deleteAllSynced: boolean,
) {
  return axios
    .delete(
      `/api/businesses/${businessId}/locations/${locationId}/items/${itemId}/image`,
      {
        data: {
          deleleteAllSynced: deleteAllSynced,
        },
      },
    )
    .then((response) => response.data);
}
