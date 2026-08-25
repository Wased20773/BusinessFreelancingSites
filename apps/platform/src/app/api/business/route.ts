import { NextResponse } from "next/server";
import { authenticateBusinessReadAccess } from "@/lib/auth/authenticateBusinessReadAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";

// GET /api/business
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
      {
        requireLocation: false,
      },
    );

    if (authentication instanceof NextResponse) {
      return authentication;
    }

    const business = await prisma.business.findUnique({
      where: {
        id: authentication.businessId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        domain: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!business) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(business, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch business:", error);

    return NextResponse.json(
      { error: "Failed to fetch business" },
      { status: 500 },
    );
  }
}
