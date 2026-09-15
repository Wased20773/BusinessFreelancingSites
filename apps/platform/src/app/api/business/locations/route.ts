import { NextResponse } from "next/server";
import { authenticateBusinessReadAccess } from "@/lib/auth/authenticateBusinessReadAccess";
import { AccessLevel } from "@business-freelancer/database";
import { prisma } from "@/lib/prisma";
import { rateLimiterRead } from "../../route_helper";

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
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
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
      },
    });

    return NextResponse.json(locations, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch business locations:", error);

    return NextResponse.json(
      { error: `Failed to fetch business locations: ${error}` },
      { status: 400 },
    );
  }
}
