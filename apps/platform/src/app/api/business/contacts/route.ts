import { NextResponse } from "next/server";
import {
  authenticateBusinessReadAccess,
  getBusinessResponse,
} from "../../route_helper";
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

    return await getBusinessResponse(
      authentication.businessId,
      {
        contacts: {
          select: {
            id: true,
            phoneNumber: true,
            email: true,
            isPersonal: true,
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
