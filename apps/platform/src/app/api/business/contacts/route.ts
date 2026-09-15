import { NextResponse } from "next/server";
import { getLocationResponse, rateLimiterRead } from "../../route_helper";
import { authenticateBusinessReadAccess } from "@/lib/auth/authenticateBusinessReadAccess";
import { AccessLevel } from "@business-freelancer/database";

// GET /api/business/contacts
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
        contacts: {
          orderBy: [
            {
              isPersonal: "asc",
            },
            {
              createdAt: "desc",
            },
          ],
          select: {
            id: true,
            locationId: true,
            phoneNumber: true,
            email: true,
            isPersonal: true,

            ...(authentication.authenticationType === "session"
              ? { syncGroupId: true, isSynced: true }
              : {}),

            createdAt: true,
            updatedAt: true,
          },
        },
      },
      "contact",
    );
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to fetch business contacts: ${error}` },
      { status: 400 },
    );
  }
}
