import axios from "axios";
import type {
  AddOnLinkPayload,
  OptionPayload,
} from "@/lib/items/optionDrafts";
import type { ItemJson } from "@/types/types";

// What the create and edit item forms send. The options go with the item
// and are saved in the same transaction.
export type ItemFormBody = {
  name: string;
  description: string | null;
  containsList: string[];
  calories: number | null;
  price: number;
  isAvailable: boolean;
  isSynced: boolean;
  options: OptionPayload[];
  // Which add-on list is used: the item's own, or each option's.
  addOnsVaryByOption: boolean;
  addOns: AddOnLinkPayload[];
};

// ################
// ##### ITEM #####
// ################

// POST: the item and all its options at once. Returns the new item's id
// (for a synced create, the copy at this location).
export async function createItem(
  businessId: string,
  locationId: string,
  categoryId: string,
  data: ItemFormBody,
): Promise<{ id: string }> {
  return axios
    .post<{ id: string }>(
      `/api/businesses/${businessId}/locations/${locationId}/categories/${categoryId}/items`,
      data,
    )
    .then((response) => response.data);
}

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

// UPDATE: the item and its full option list, saved together.
export async function updateItem(
  businessId: string,
  locationId: string,
  itemId: string,
  data: ItemFormBody,
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
  originalImage?: File | null,
) {
  const formData = new FormData();

  formData.append("image", image);
  formData.append("isSynced", String(isSynced));

  if (originalImage) {
    formData.append("originalImage", originalImage);
  }

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
  originalImage?: File | null,
) {
  const formData = new FormData();

  formData.append("image", image);
  formData.append("isSynced", String(isSynced));

  if (originalImage) {
    formData.append("originalImage", originalImage);
  }

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
          deleteAllSynced: deleteAllSynced,
        },
      },
    )
    .then((response) => response.data);
}
