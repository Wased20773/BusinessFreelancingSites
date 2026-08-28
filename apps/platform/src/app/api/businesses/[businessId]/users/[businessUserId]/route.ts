import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// PATCH /api/businesses/[businessId]/users/[businessUserId]
export async function PATCH(
  request: Request,
  {
    params,
  }: { params: Promise<{ businessId: string; businessUserId: string }> },
): Promise<NextResponse> {
  try {
    const { businessId, businessUserId } = await params;

    if (!businessId) {
      return NextResponse.json(
        { error: "Missing businessId" },
        { status: 400 },
      );
    }

    if (!businessUserId) {
      return NextResponse.json(
        { error: "Missing businessUserId" },
        { status: 400 },
      );
    }

    const authResult = await authenticateBusinessAccess(request, businessId, [
      AccessLevel.owner,
      AccessLevel.admin,
    ]);

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await request.json();

    if (!body.accessLevel) {
      return NextResponse.json(
        { error: "Missing access level" },
        { status: 400 },
      );
    }

    if (!Object.values(AccessLevel).includes(body.accessLevel as AccessLevel)) {
      return NextResponse.json(
        { error: "Selected access level does not exist" },
        { status: 400 },
      );
    }

    // Grab the selected role
    const role = await prisma.role.findFirst({
      where: {
        accessLevel: body.accessLevel,
      },

      select: {
        id: true,
      },
    });

    if (!role) {
      return NextResponse.json(
        { error: "Invalid access level selection" },
        { status: 400 },
      );
    }

    // Verify this BusinessUser belongs to this business
    const businessUser = await prisma.businessUser.findFirst({
      where: {
        id: businessUserId,
        businessId,
      },
      select: {
        id: true,
      },
    });

    if (!businessUser) {
      return NextResponse.json(
        { error: "This business user does not exist in our records" },
        { status: 404 },
      );
    }

    // Update the user's role inside this business
    const updatedBusinessUser = await prisma.businessUser.update({
      where: {
        id: businessUser.id,
      },
      data: {
        role: {
          connect: {
            id: role.id,
          },
        },
      },
      select: {
        id: true,
        businessId: true,
        userId: true,
        roleId: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            image: true,
          },
        },
        role: {
          select: {
            id: true,
            accessLevel: true,
            description: true,
          },
        },
      },
    });

    return NextResponse.json(updatedBusinessUser, { status: 200 });
  } catch (error) {
    console.error("Failed to update business user:", error);

    return NextResponse.json(
      { error: "Failed to update business user" },
      { status: 500 },
    );
  }
}

// DELETE /api/businesses/[businessId]/users/[businessUserId]
export async function DELETE(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      businessId: string;
      businessUserId: string;
    }>;
  },
): Promise<NextResponse> {
  try {
    const { businessId, businessUserId } = await params;

    if (!businessId) {
      return NextResponse.json(
        { error: "Missing businessId" },
        { status: 400 },
      );
    }

    if (!businessUserId) {
      return NextResponse.json(
        { error: "Missing businessUserId" },
        { status: 400 },
      );
    }

    const authResult = await authenticateBusinessAccess(request, businessId, [
      AccessLevel.owner,
      AccessLevel.admin,
    ]);

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    /*
     * deleteMany is intentional here.
     *
     * It lets us scope the deletion to BOTH the BusinessUser ID
     * and the businessId while also receiving a count when nothing
     * matched instead of relying on Prisma throwing an error.
     */
    const deletedBusinessUser = await prisma.businessUser.deleteMany({
      where: {
        id: businessUserId,
        businessId,
      },
    });

    if (deletedBusinessUser.count === 0) {
      return NextResponse.json(
        { error: "This business user does not exist in our records" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Business user deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to delete business user:", error);

    return NextResponse.json(
      { error: "Failed to delete business user" },
      { status: 500 },
    );
  }
}
