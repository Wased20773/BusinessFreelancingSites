import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { Turret_Road } from "next/font/google";
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

    const {
      userId: authenticatedUserId,
      accessLevel: authenticatedAccessLevel,
    } = authResult;

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
    const requestedAccessLevel = body.accessLevel as AccessLevel;

    // Verify this BusinessUser belongs to this business
    const businessUser = await prisma.businessUser.findFirst({
      where: {
        id: businessUserId,
        businessId,
      },
      select: {
        id: true,
        userId: true,
        role: {
          select: {
            accessLevel: true,
          },
        },
      },
    });

    if (!businessUser) {
      return NextResponse.json(
        { error: "This business user does not exist in our records" },
        { status: 404 },
      );
    }

    // Check for self assignment
    if (businessUser.userId === authResult.userId) {
      return NextResponse.json(
        { error: "You cannot change your own access level." },
        { status: 403 },
      );
    }

    // Admin cannot demote or otherwise modify the owner's role.
    if (
      businessUser.role.accessLevel === AccessLevel.owner &&
      authenticatedAccessLevel !== AccessLevel.owner
    ) {
      return NextResponse.json(
        { error: "Administrators cannot modify the business owner." },
        { status: 403 },
      );
    }

    /**
     * ##############################
     * ##### OWNERSHIP TRANSFER #####
     * ##############################
     */

    if (requestedAccessLevel === AccessLevel.owner) {
      if (authenticatedAccessLevel !== AccessLevel.owner) {
        return NextResponse.json(
          { error: "Only the business owner can transfer ownership." },
          { status: 403 },
        );
      }
      const updatedBusinessUser = await prisma.$transaction(async (tx) => {
        /**
         * Demote the authenticated owner to admin.
         *
         * We already know exactly who the owner is:
         *  authResult.userId.
         */
        await tx.businessUser.update({
          where: {
            businessId_userId: {
              businessId,
              userId: authenticatedUserId,
            },
          },
          data: {
            role: {
              connect: {
                accessLevel: AccessLevel.admin,
              },
            },
          },
        });

        /**
         * Promote the selected member to Owner
         */
        return tx.businessUser.update({
          where: {
            id: businessUser.id,
          },
          data: {
            role: {
              connect: {
                accessLevel: AccessLevel.owner,
              },
            },
          },
          select: {
            id: true,
            businessId: true,
            userId: true,
            roleId: true,
            updatedAt: true,
            createdAt: true,
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
      });

      return NextResponse.json(updatedBusinessUser, { status: 200 });
    }

    /**
     * ##############################
     * ##### NORMAL ROLE CHANGE #####
     * ##############################
     */
    const updatedBusinessUser = await prisma.businessUser.update({
      where: {
        id: businessUser.id,
      },
      data: {
        role: {
          connect: {
            accessLevel: requestedAccessLevel,
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

    const {
      userId: authenticatedUserId,
      accessLevel: authenticatedAccessLevel,
    } = authResult;

    /*
     * We need the selected BusinessUser before
     * deleting so we can enforce self/owner rules.
     */
    const businessUser = await prisma.businessUser.findFirst({
      where: {
        id: businessUserId,
        businessId,
      },

      select: {
        id: true,
        userId: true,

        role: {
          select: {
            accessLevel: true,
          },
        },
      },
    });

    if (!businessUser) {
      return NextResponse.json(
        { error: "This business user does not exist in our records" },
        { status: 404 },
      );
    }

    /*
     * Removing yourself is a separate action from
     * managing another member.
     */
    if (businessUser.userId === authenticatedUserId) {
      return NextResponse.json(
        {
          error:
            "You cannot remove yourself from the business through member management.",
        },
        { status: 403 },
      );
    }

    /*
     * Admins cannot remove the owner.
     */
    if (
      businessUser.role.accessLevel === AccessLevel.owner &&
      authenticatedAccessLevel !== AccessLevel.owner
    ) {
      return NextResponse.json(
        { error: "Administrators cannot remove the business owner." },
        { status: 403 },
      );
    }

    await prisma.businessUser.delete({
      where: {
        id: businessUser.id,
      },
    });

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
