import {
  checkLocationAccess,
  MANAGE_LEVELS,
  moveAddOnRecord,
} from "@/lib/addOns/addOnRoutes";
import { NextResponse } from "next/server";

// PATCH /api/businesses/[businessId]/locations/[locationId]/add-on-groups/[groupId]/move-down
export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ businessId: string; locationId: string; groupId: string }>;
  },
): Promise<NextResponse> {
  try {
    const { businessId, locationId, groupId } = await params;
    const accessError = await checkLocationAccess(
      request,
      businessId,
      locationId,
      MANAGE_LEVELS,
    );

    if (accessError) return accessError;

    return await moveAddOnRecord("group", groupId, locationId, "down");
  } catch (error) {
    console.error("Failed to move add-on group down:", error);

    return NextResponse.json(
      { error: "Failed to move add-on group down" },
      { status: 500 },
    );
  }
}
