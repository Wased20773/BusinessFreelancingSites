import axios from "axios";
import type { AddOnGroupJson } from "@/types/types";

/*
 *   Dashboard requests for the Add-ons page and the item form's picker.
 *   See docs/add-ons-plan.md.
 **/

const base = (businessId: string, locationId: string) =>
  `/api/businesses/${businessId}/locations/${locationId}`;

export type AddOnFormBody = {
  name: string;
  description: string | null;
  calories: number | null;
  price: number;
  isAvailable: boolean;
  isSynced: boolean;
};

// ##################
// ##### GROUPS #####
// ##################

// Every group with all its add-ons, and how many items use each.
export async function getAddOnGroups(
  businessId: string,
  locationId: string,
): Promise<AddOnGroupJson[]> {
  return axios
    .get<{ groups: AddOnGroupJson[] }>(
      `${base(businessId, locationId)}/add-on-groups`,
    )
    .then((response) => response.data.groups);
}

export async function createAddOnGroup(
  businessId: string,
  locationId: string,
  data: { name: string; isSynced: boolean },
) {
  return axios
    .post(`${base(businessId, locationId)}/add-on-groups`, data)
    .then((response) => response.data);
}

export async function updateAddOnGroup(
  businessId: string,
  locationId: string,
  groupId: string,
  data: { name: string; isSynced: boolean },
) {
  return axios
    .patch(`${base(businessId, locationId)}/add-on-groups/${groupId}`, data)
    .then((response) => response.data);
}

export async function deleteAddOnGroup(
  businessId: string,
  locationId: string,
  groupId: string,
  deleteAllSynced: boolean,
) {
  return axios
    .delete(`${base(businessId, locationId)}/add-on-groups/${groupId}`, {
      data: { deleteAllSynced },
    })
    .then((response) => response.data);
}

export async function moveAddOnGroup(
  businessId: string,
  locationId: string,
  groupId: string,
  direction: "up" | "down",
) {
  return axios
    .patch(
      `${base(businessId, locationId)}/add-on-groups/${groupId}/move-${direction}`,
    )
    .then((response) => response.data);
}

// ##################
// ##### ADD-ONS ####
// ##################

export async function createAddOn(
  businessId: string,
  locationId: string,
  groupId: string,
  data: AddOnFormBody,
) {
  return axios
    .post(
      `${base(businessId, locationId)}/add-on-groups/${groupId}/add-ons`,
      data,
    )
    .then((response) => response.data);
}

export async function updateAddOn(
  businessId: string,
  locationId: string,
  addOnId: string,
  data: AddOnFormBody,
) {
  return axios
    .patch(`${base(businessId, locationId)}/add-ons/${addOnId}`, data)
    .then((response) => response.data);
}

export async function deleteAddOn(
  businessId: string,
  locationId: string,
  addOnId: string,
  deleteAllSynced: boolean,
) {
  return axios
    .delete(`${base(businessId, locationId)}/add-ons/${addOnId}`, {
      data: { deleteAllSynced },
    })
    .then((response) => response.data);
}

export async function moveAddOn(
  businessId: string,
  locationId: string,
  addOnId: string,
  direction: "up" | "down",
) {
  return axios
    .patch(
      `${base(businessId, locationId)}/add-ons/${addOnId}/move-${direction}`,
    )
    .then((response) => response.data);
}
