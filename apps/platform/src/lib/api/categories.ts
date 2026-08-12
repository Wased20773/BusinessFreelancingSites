import { CategoryJson } from "@/types/types";
import axios from "axios";

// GET
export async function getCategories(): Promise<CategoryJson[]> {
  return axios.get<{categories: CategoryJson[]}>(`/api/business/menu/`)
    .then((response) => response.data.categories);
}
