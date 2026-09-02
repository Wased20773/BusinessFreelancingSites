import { LocationJson } from "@/types/types";
import axios from "axios";

export async function getLocations(businessId: string) {
  return axios
    .get<LocationJson[]>("/api/business/locations", {
      headers: {
        "x-business-id": businessId,
      },
    })
    .then((response) => response.data);
}
