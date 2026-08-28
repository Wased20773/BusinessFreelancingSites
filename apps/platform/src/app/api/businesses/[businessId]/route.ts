import { createDomainSlug } from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// GET /api/businesses/[businessId]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> },
): Promise<NextResponse> {
  try {
    const { businessId } = await params;

    if (!businessId) {
      return NextResponse.json(
        { error: "Missing businessId" },
        { status: 400 },
      );
    }

    const authentication = await authenticateBusinessAccess(
      request,
      businessId,
      [
        AccessLevel.owner,
        AccessLevel.admin,
        AccessLevel.staff,
        AccessLevel.developer,
      ],
    );

    if (authentication instanceof NextResponse) {
      return authentication;
    }

    const { userId } = authentication;

    /*
     * BusinessUser is exactly what we want here because
     * this endpoint represents the current User's
     * relationship with this specific Business.
     */
    const businessUser = await prisma.businessUser.findFirst({
      where: {
        businessId,
        userId,
      },
      select: {
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            domain: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        role: {
          select: {
            accessLevel: true,
            description: true,
          },
        },
      },
    });

    if (!businessUser) {
      return NextResponse.json(
        { error: "Business could not be found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        ...businessUser.business,
        role: businessUser.role,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to fetch business:", error);

    return NextResponse.json(
      { error: "Failed to fetch business" },
      { status: 500 },
    );
  }
}

// PATCH /api/businesses/[businessId]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> },
): Promise<NextResponse> {
  try {
    const { businessId } = await params;

    if (!businessId) {
      return NextResponse.json(
        { error: "Missing businessId" },
        { status: 400 },
      );
    }

    const authentication = await authenticateBusinessAccess(
      request,
      businessId,
      [AccessLevel.owner, AccessLevel.admin],
    );

    if (authentication instanceof NextResponse) {
      return authentication;
    }

    const body = await request.json();

    const updateData: {
      name?: string;
      domain?: string;
    } = {};

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json(
          { error: "Business name is required" },
          { status: 400 },
        );
      }

      updateData.name = body.name.trim();
    }

    if (body.domain !== undefined) {
      if (typeof body.domain !== "string" || !body.domain.trim()) {
        return NextResponse.json(
          { error: "Business domain is required" },
          { status: 400 },
        );
      }

      updateData.domain = createDomainSlug(body.domain.trim());
    }

    if (body.name === undefined && body.domain === undefined) {
      return NextResponse.json(
        { error: "No supported fields were provided" },
        { status: 400 },
      );
    }

    const business = await prisma.business.update({
      where: {
        id: businessId,
      },
      data: updateData,
      select: {
        id: true,
        name: true,
        slug: true,
        domain: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(business, { status: 200 });
  } catch (error) {
    console.error("Failed to update business:", error);

    return NextResponse.json(
      { error: "Failed to update business" },
      { status: 500 },
    );
  }
}
