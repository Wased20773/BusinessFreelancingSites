import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    businessId: string;
  }>;
};

type CreateLocationBody = {
  address?: string;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
};

async function getBusinessAccess(userId: string, businessId: string) {
  return prisma.businessUser.findUnique({
    where: {
      businessId_userId: {
        businessId,
        userId,
      },
    },
    select: {
      id: true,

      role: {
        select: {
          accessLevel: true,
        },
      },

      business: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

// POST /api/businesses/[businessId]/locations
export async function POST(
  request: Request,
  { params }: RouteContext,
): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { businessId } = await params;

    // Verify the current user is linked to this business.
    const businessAccess = await getBusinessAccess(session.user.id, businessId);

    if (!businessAccess) {
      return NextResponse.json(
        { error: "You do not have access to this business" },
        { status: 403 },
      );
    }

    /*
     * Only users who can manage business data should
     * be able to create locations.
     */
    if (
      businessAccess.role.accessLevel !== "owner" &&
      businessAccess.role.accessLevel !== "admin"
    ) {
      return NextResponse.json(
        {
          error:
            "You do not have permission to create locations for this business",
        },
        { status: 403 },
      );
    }

    const body = (await request.json()) as CreateLocationBody;

    const address = body.address?.trim();

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

        city: body.city?.trim() || null,
        state: body.state?.trim() || null,
        zip: body.zip?.trim() || null,
        country: body.country?.trim() || null,
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
    console.error("Failed to create business location:", error);

    return NextResponse.json(
      { error: "Failed to create business location" },
      { status: 500 },
    );
  }
}
