import { BusinessUserJson, UserJson } from "@/types/types";
import { AccessLevel } from "@business-freelancer/database";
import axios from "axios";

// GET
export async function getBusinessUsers(businessId: string) {
  return axios
    .get<BusinessUserJson[]>(`/api/businesses/${businessId}/users`)
    .then((response) => response.data);
}

// GET
export async function searchForUser(
  businessId: string,
  params: { email: string },
) {
  return axios
    .get<UserJson>(`/api/businesses/${businessId}/users/search`, {
      params,
    })
    .then((response) => response.data);
}

// PATCH
export async function updateUsersAccessLevel(
  businessId: string,
  userId: string,
  accessLevel: AccessLevel,
) {
  return axios
    .patch<BusinessUserJson>(`/api/businesses/${businessId}/users/${userId}/`, {
      accessLevel,
    })
    .then((response) => response.data);
}

// POST
export async function addUserToBusiness(businessId: string, email: string) {
  return axios
    .post<BusinessUserJson>(`/api/businesses/${businessId}/users`, {
      email,
      accessLevel: "staff",
    })
    .then((response) => response.data);
}

// DELETE
export async function deleteUserFromBusiness(
  businessId: string,
  businessUserId: string,
) {
  return axios
    .delete<{
      message: string;
    }>(`/api/businesses/${businessId}/users/${businessUserId}`)
    .then((response) => response.data);
}
