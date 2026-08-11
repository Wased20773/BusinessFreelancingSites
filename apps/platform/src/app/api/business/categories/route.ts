import { NextResponse } from "next/server";
import { getBusinessResponse } from "../../route_helper";
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

    return await getBusinessResponse(
      authentication.businessId,
      {
        categories: {
          where: { parentId: null },
          orderBy: {
            order: "asc",
          },
          select: {
            id: true,
            name: true,
            description: true,
            order: true,
            isVisible: true,
            createdAt: true,
            updatedAt: true,
            items: true,
            subcategories: true,
          },
        },
      },
      "category",
    );
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to fetch business menu categories: ${error}` },
      { status: 400 },
    );
  }
}
