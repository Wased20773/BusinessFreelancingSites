import { BusinessOwnerShip } from "@/types/types";
import axios from "axios";

export async function getBusinesses() {
  return axios
    .get<BusinessOwnerShip[]>("/api/businesses")
    .then((response) => response.data);
}
