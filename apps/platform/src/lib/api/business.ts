import { BusinessJson, BusinessOwnerShip } from "@/types/types";
import axios from "axios";

export async function getBusinesses() {
  return axios
    .get<BusinessOwnerShip[]>("/api/businesses")
    .then((response) => response.data);
}

export async function getBusiness(businessId: string) {
  return axios
    .get<BusinessJson>("/api/business", {
      headers: {
        "x-business-id": businessId,
      },
    })
    .then((response) => response.data);
}
