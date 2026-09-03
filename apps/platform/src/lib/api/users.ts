import { BusinessUserJson } from "@/types/types";
import axios from "axios";

export async function getBusinessUsers(businessId: string) {
  return axios
    .get<BusinessUserJson[]>(`/api/businesses/${businessId}/users`)
    .then((response) => response.data);
}
