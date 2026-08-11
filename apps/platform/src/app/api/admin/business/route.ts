import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// PATCH /api/admin/business
export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    const authentication = await authenticateBusinessAccess(request, [
      AccessLevel.owner,
      AccessLevel.admin,
    ]);

    if (authentication instanceof NextResponse) return authentication;

    const { businessId } = authentication;
    const body = await request.json();

    if (
      !body.businessName ||
      body.businessName === "" ||
      !body.businessName.trim()
    ) {
      return NextResponse.json(
        { error: "Business name is required" },
        { status: 400 },
      );
    }

    const business = await prisma.business.update({
      where: {
        id: businessId,
      },
      data: {
        name: body.businessName.trim(),
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

    return NextResponse.json(business);
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to update business: ${error}` },
      { status: 500 },
    );
  }
}
