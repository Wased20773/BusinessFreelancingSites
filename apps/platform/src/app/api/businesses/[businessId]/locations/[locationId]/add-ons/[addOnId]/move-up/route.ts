import {
  checkLocationAccess,
  MANAGE_LEVELS,
  moveAddOnRecord,
} from "@/lib/addOns/addOnRoutes";
import { NextResponse } from "next/server";

// PATCH /api/businesses/[businessId]/locations/[locationId]/add-ons/[addOnId]/move-up
export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ businessId: string; locationId: string; addOnId: string }>;
  },
): Promise<NextResponse> {
  try {
    const { businessId, locationId, addOnId } = await params;
    const accessError = await checkLocationAccess(
      request,
      businessId,
      locationId,
      MANAGE_LEVELS,
    );

    if (accessError) return accessError;

    return await moveAddOnRecord("addOn", addOnId, locationId, "up");
  } catch (error) {
    console.error("Failed to move add-on up:", error);

    return NextResponse.json(
      { error: "Failed to move add-on up" },
      { status: 500 },
    );
  }
}
