import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";
import { createDomainSlug } from "../../route_helper";

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

    const updateData: {
      name?: string;
      domain?: string;
    } = {};

    // Are we updating the name?
    if (body.name) {
      if (body.name === "" || !body.name.trim()) {
        return NextResponse.json(
          { error: "Business name is required" },
          { status: 400 },
        );
      }

      updateData.name = body.name.trim();
    }

    // Are we updating the domain?
    if (body.domain) {
      if (body.domain === "" || !body.domain.trim()) {
        return NextResponse.json(
          { error: "Business domain is required" },
          { status: 400 },
        );
      }

      updateData.domain = createDomainSlug(body.domain.trim());
    }

    // Nothing supported was provided
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

    return NextResponse.json(business);
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to update business: ${error}` },
      { status: 500 },
    );
  }
}
