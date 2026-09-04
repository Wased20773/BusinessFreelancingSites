import {
  BusinessApiKeyJson,
  CreateBusinessApiKeyResponse,
  UpdateBusinessApiKeyResponse,
} from "@/types/types";
import axios from "axios";

export async function getApiKeys(businessId: string) {
  return axios
    .get<BusinessApiKeyJson[]>(`/api/businesses/${businessId}/api-keys`)
    .then((response) => response.data);
}

export async function createBusinessApiKey(businessId: string, name: string) {
  return axios
    .post<CreateBusinessApiKeyResponse>(
      `/api/businesses/${businessId}/api-keys`,
      {
        name: name.trim(),
      },
    )
    .then((response) => response.data);
}

export async function updateBusinessApiKey(
  businessId: string,
  apiKeyId: string,
  data: {
    name?: string;
    isActive?: boolean;
  },
) {
  return axios
    .patch<UpdateBusinessApiKeyResponse>(
      `/api/businesses/${businessId}/api-keys/${apiKeyId}`,
      data,
    )
    .then((response) => response.data);
}

export async function deleteBusinessApiKey(
  businessId: string,
  apiKeyId: string,
) {
  return axios
    .delete<{
      message: string;
    }>(`/api/businesses/${businessId}/api-keys/${apiKeyId}`)
    .then((response) => response.data);
}
