import { NextResponse } from "next/server";
import { getLocationResponse, rateLimiterRead } from "../../route_helper";
import { authenticateBusinessReadAccess } from "@/lib/auth/authenticateBusinessReadAccess";
import { AccessLevel } from "@business-freelancer/database";

// GET /api/business/categories
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const authentication = await authenticateBusinessReadAccess(request, [
      AccessLevel.developer,
      AccessLevel.owner,
      AccessLevel.admin,
      AccessLevel.staff,
    ]);

    if (authentication instanceof NextResponse) return authentication;

    const rateLimit = await rateLimiterRead(authentication);

    if (rateLimit instanceof NextResponse) return rateLimit;

    return await getLocationResponse(
      authentication.businessId,
      authentication.locationId,
      {
        categories: {
          where: { parentId: null },
          orderBy: { order: "asc" },
          select: {
            id: true,
            locationId: true,
            name: true,
            description: true,
            order: true,
            isVisible: true,
            items: true,
            subcategories: true,

            ...(authentication.authenticationType === "session"
              ? { syncGroupId: true, isSynced: true }
              : {}),

            createdAt: true,
            updatedAt: true,
          },
        },
      },
      "category",
    );
  } catch (error) {
    console.error("Failed to fetch business menu categories:", error);

    return NextResponse.json(
      { error: `Failed to fetch business menu categories: ${error}` },
      { status: 400 },
    );
  }
}
