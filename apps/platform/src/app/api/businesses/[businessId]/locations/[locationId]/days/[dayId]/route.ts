import {
  updateSyncedResource,
  validateBusinessLocationParams,
} from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// PATCH /api/businesses/[businessId]/locations/[locationId]/days/[dayId]
export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      businessId: string;
      locationId: string;
      dayId: string;
    }>;
  },
): Promise<NextResponse> {
  try {
    const { businessId, locationId, dayId } = await params;
    const paramsError = validateBusinessLocationParams(businessId, locationId);

    if (paramsError) return paramsError;

    if (!dayId) {
      return NextResponse.json({ error: "Missing dayId" }, { status: 400 });
    }

    const authResult = await authenticateBusinessAccess(request, businessId, [
      AccessLevel.owner,
      AccessLevel.admin,
    ]);

    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();

    if (typeof body.isClosed !== "boolean") {
      return NextResponse.json(
        { error: "Closed setting was not found" },
        { status: 400 },
      );
    }

    return await updateSyncedResource({
      body,
      model: prisma.locationDay,
      resourceName: "day",
      id: dayId,
      locationId,
      data: {
        isClosed: body.isClosed,
      },
      select: {
        id: true,
        locationId: true,
        dayOfWeek: true,
        isClosed: true,
        syncGroupId: true,
        isSynced: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    console.error("Failed to update location day:", error);

    return NextResponse.json(
      { error: "Failed to update location day" },
      { status: 500 },
    );
  }
}
