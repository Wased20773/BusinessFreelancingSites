import { NextResponse } from "next/server";
import { getBusinessResponse } from "../../route_helper";
import { authenticateBusinessReadAccess } from "@/lib/auth/authenticateBusinessReadAccess";
import { AccessLevel } from "@business-freelancer/database";

// GET /api/business/socials
export async function GET(request: Request): Promise<NextResponse> {
  const authentication = await authenticateBusinessReadAccess(request, [
    AccessLevel.developer,
    AccessLevel.owner,
    AccessLevel.admin,
    AccessLevel.staff,
  ]);

  if (authentication instanceof NextResponse) return authentication;

  return getBusinessResponse(
    authentication.businessId,
    {
      socials: {
        select: {
          id: true,
          dns: true,
          profileName: true,
          url: true,
          icon: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
    "social",
  );
}
