import { BusinessJson, BusinessOwnerShip } from "@/types/types";
import { AccessLevel } from "@business-freelancer/database";
import axios from "axios";

export async function getBusinesses() {
  return axios
    .get<BusinessOwnerShip[]>("/api/businesses")
    .then((response) => response.data);
}
