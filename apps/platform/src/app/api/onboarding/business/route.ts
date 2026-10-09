import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  createSlug,
  isUniqueConstraintError,
  optionalString,
} from "@/app/api/route_helper";
import { NextResponse } from "next/server";

// POST /api/onboarding/business
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
    const body = await request.json();

    const businessName = optionalString(body.name);
    const locationAddress = optionalString(body.address);

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

    /*
     * Business.slug is unique, so two businesses with the same
     * name get numbered slugs: tacos, tacos-2, tacos-3, ...
     */
    const takenSlugs = new Set(
      (
        await prisma.business.findMany({
          where: {
            slug: {
              startsWith: baseSlug,
            },
          },
          select: {
            slug: true,
          },
        })
      ).map((business) => business.slug),
    );

    let slug = baseSlug;

    for (let suffix = 2; takenSlugs.has(slug); suffix++) {
      slug = `${baseSlug}-${suffix}`;
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
          country: optionalString(body.country),
          state: optionalString(body.state),
          city: optionalString(body.city),
          zip: optionalString(body.zip),
          parking: body.parking === true,
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
    // Another business claimed the same slug between the check and the create.
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        {
          error:
            "A business with this name was just created. Please try again",
        },
        { status: 409 },
      );
    }

    console.error("Failed to create business during onboarding:", error);

    return NextResponse.json(
      { error: "Failed to create the business" },
      { status: 500 },
    );
  }
}
