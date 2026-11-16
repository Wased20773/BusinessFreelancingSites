import { getLocationResponse, rateLimiterRead } from "../../route_helper";
import { authenticateBusinessReadAccess } from "@/lib/auth/authenticateBusinessReadAccess";
import { NextResponse } from "next/server";
import { AccessLevel } from "@business-freelancer/database";
import { resolveMenuAddOns } from "@/lib/addOns/resolveAddOns";
import { menuCategoriesQuery } from "@/lib/businessData/selects";

// GET /api/business/menu
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
        // Parent categories, with their items and subcategories.
        categories: menuCategoriesQuery(
          authentication.authenticationType === "session",
        ),
      },
      "menu",
      { signImages: true, transform: resolveMenuAddOns },
    );
  } catch (error) {
    console.error("Failed to fetch business menu:", error);

    return NextResponse.json(
      { error: "Failed to fetch business menu" },
      { status: 500 },
    );
  }
}
