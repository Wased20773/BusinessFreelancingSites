import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createSlug } from "@/app/api/route_helper";
import { NextResponse } from "next/server";

type CreateBusinessBody = {
  name?: string;
  address?: string;
};

// POST /api/admin/onboarding/business
export async function POST(request: Request): Promise<NextResponse> {
  try {
    // #############################
    // ##### Authenticate User #####
    // #############################
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // ##########################
    // ##### Validate Input #####
    // ##########################
    const body = (await request.json()) as CreateBusinessBody;

    const businessName = body.name?.trim();
    const locationAddress = body.address?.trim();

    if (!businessName) {
      return NextResponse.json(
        { error: "A business name is required" },
        { status: 400 },
      );
    }

    if (!locationAddress) {
      return NextResponse.json(
        { error: "A location address is required" },
        { status: 400 },
      );
    }

    // ############################
    // ##### Find Owner Role ######
    // ############################

    const ownerRole = await prisma.role.findFirst({
      where: {
        accessLevel: "owner",
      },
      select: {
        id: true,
      },
    });

    if (!ownerRole) {
      return NextResponse.json(
        { error: "The owner role could not be found" },
        { status: 500 },
      );
    }

    // ##########################
    // ##### Generate Slug ######
    // ##########################
    const baseSlug = createSlug(businessName);

    if (!baseSlug) {
      return NextResponse.json(
        { error: "A valid business name is required" },
        { status: 400 },
      );
    }

    let slug = baseSlug;
    let suffix = 2;

    while (
      await prisma.business.findUnique({
        where: {
          slug,
        },
        select: {
          id: true,
        },
      })
    ) {
      // Prevent duplicate business names
      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }

    // ################################
    // ##### Create Business Setup #####
    // ################################
    const result = await prisma.$transaction(async (tx) => {
      // Create business
      const business = await tx.business.create({
        data: {
          name: businessName,
          slug,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          domain: true,
        },
      });

      // Create location
      const location = await tx.location.create({
        data: {
          businessId: business.id,
          address: locationAddress,
        },
        select: {
          id: true,
          address: true,
        },
      });

      // Create businessUser relationship
      await tx.businessUser.create({
        data: {
          businessId: business.id,
          userId,
          roleId: ownerRole.id,
        },
      });

      return {
        business,
        location,
      };
    });

    return NextResponse.json(
      {
        message: "Business created successfully",
        business: result.business,
        location: result.location,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create business during onboarding:", error);

    return NextResponse.json(
      { error: "Failed to create the business" },
      { status: 500 },
    );
  }
}
