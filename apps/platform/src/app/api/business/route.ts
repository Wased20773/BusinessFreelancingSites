import { NextResponse } from "next/server";
import {
  authenticateBusinessReadAccess,
  getBusinessResponse,
} from "../route_helper";
import { AccessLevel } from "@business-freelancer/database";

// GET /api/business
export async function GET(request: Request): Promise<NextResponse> {
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
      id: true,
      name: true,
      slug: true,
      domain: true,
      createdAt: true,
      updatedAt: true,
    },
    "business",
  );
}
