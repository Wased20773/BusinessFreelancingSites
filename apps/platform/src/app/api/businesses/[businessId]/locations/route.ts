import {
  isUniqueConstraintError,
  optionalString,
} from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    businessId: string;
  }>;
};

// POST /api/businesses/[businessId]/locations
export async function POST(
  request: Request,
  { params }: RouteContext,
): Promise<NextResponse> {
  try {
    const { businessId } = await params;

    if (!businessId) {
      return NextResponse.json(
        { error: "Missing businessId" },
        { status: 400 },
      );
    }

    /*
     * Only users who can manage business data should
     * be able to create locations.
     */
    const authResult = await authenticateBusinessAccess(request, businessId, [
      AccessLevel.owner,
      AccessLevel.admin,
    ]);

    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();

    const address = optionalString(body.address);

    if (!address) {
      return NextResponse.json(
        { error: "A location address is required" },
        { status: 400 },
      );
    }

    /*
     * Schema has:
     *
     * @@unique([businessId, address])
     *
     * so check that before attempting to create it.
     */
    const existingLocation = await prisma.location.findUnique({
      where: {
        businessId_address: {
          businessId,
          address,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingLocation) {
      return NextResponse.json(
        {
          error:
            "A location with this address already exists for this business",
        },
        { status: 409 },
      );
    }

    const location = await prisma.location.create({
      data: {
        businessId,
        address,

        city: optionalString(body.city),
        state: optionalString(body.state),
        zip: optionalString(body.zip),
        country: optionalString(body.country),
        parking: body.parking === true,
      },
      select: {
        id: true,
        address: true,
        zip: true,
        country: true,
        state: true,
        city: true,
        parking: true,
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        message: "Location created successfully",
        location,
      },
      { status: 201 },
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        {
          error:
            "A location with this address already exists for this business",
        },
        { status: 409 },
      );
    }

    console.error("Failed to create business location:", error);

    return NextResponse.json(
      { error: "Failed to create business location" },
      { status: 500 },
    );
  }
}
