import { NextResponse } from "next/server";
import { authenticateBusinessReadAccess } from "@/lib/auth/authenticateBusinessReadAccess";
import { AccessLevel } from "@business-freelancer/database";
import { prisma } from "@/lib/prisma";
import { rateLimiterRead } from "../../route_helper";
import { LOCATION_FIELDS, LOCATION_ORDER } from "@/lib/businessData/selects";

// GET /api/business/locations
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const authentication = await authenticateBusinessReadAccess(
      request,
      [
        AccessLevel.developer,
        AccessLevel.owner,
        AccessLevel.admin,
        AccessLevel.staff,
      ],
      { requireLocation: false },
    );

    if (authentication instanceof NextResponse) return authentication;

    const rateLimit = await rateLimiterRead(authentication);

    if (rateLimit instanceof NextResponse) return rateLimit;

    const locations = await prisma.location.findMany({
      where: {
        businessId: authentication.businessId,
      },
      orderBy: LOCATION_ORDER,
      select: LOCATION_FIELDS,
    });

    return NextResponse.json(locations, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch business locations:", error);

    return NextResponse.json(
      { error: "Failed to fetch business locations" },
      { status: 500 },
    );
  }
}
