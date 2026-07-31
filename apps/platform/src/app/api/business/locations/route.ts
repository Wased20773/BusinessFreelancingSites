import { NextResponse } from "next/server";
import {
  authenticateBusinessReadAccess,
  getBusinessResponse,
} from "../../route_helper";
import { AccessLevel } from "@business-freelancer/database";

// GET /api/business/locations
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const authentication = await authenticateBusinessReadAccess(request, [
      AccessLevel.developer,
      AccessLevel.owner,
      AccessLevel.admin,
      AccessLevel.staff,
    ]);

    if (authentication instanceof NextResponse) return authentication;

    return await getBusinessResponse(
      authentication.businessId,
      {
        locations: {
          select: {
            id: true,
            address: true,
            zip: true,
            country: true,
            state: true,
            city: true,
            parking: true,
            isActive: true,
            enableHours: true,
            createdAt: true,
            updatedAt: true,
            days: {
              select: {
                id: true,
                locationId: true,
                dayOfWeek: true,
                isClosed: true,
                createdAt: true,
                updatedAt: true,
                hours: {
                  select: {
                    id: true,
                    locationDayId: true,
                    openTime: true,
                    closeTime: true,
                    title: true,
                    note: true,
                    isDisabled: true,
                    createdAt: true,
                    updatedAt: true,
                  },
                },
              },
            },
          },
        },
      },
      "location",
    );
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to fetch business locations: ${error}` },
      { status: 400 },
    );
  }
}
