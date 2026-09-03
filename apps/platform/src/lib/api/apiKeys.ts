import { BusinessApiKeyJson } from "@/types/types";
import axios from "axios";

export async function getApiKeys(businessId: string) {
  return axios
    .get<BusinessApiKeyJson[]>(`/api/businesses/${businessId}/api-keys`)
    .then((response) => response.data);
}
