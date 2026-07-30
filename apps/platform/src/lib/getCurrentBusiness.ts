import { cache } from "react";
import { GET as getCurrentBusinessRoute } from "@/app/api/admin/route";

export const getCurrentBusiness = cache(async () => {
  // GET /api/admin/
  const response = await getCurrentBusinessRoute();

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
});
