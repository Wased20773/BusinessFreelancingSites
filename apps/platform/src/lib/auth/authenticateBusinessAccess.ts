import { NextResponse } from "next/server";
import { AccessLevel } from "@business-freelancer/database";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Session } from "next-auth";

/**
 * Authenticates the current dashboard user and verifies that they belong
 * to the selected business with one of the allowed access levels.
 */
export async function authenticateBusinessAccess(
  request: Request,
  businessId: string,
  allowedRoles: AccessLevel[],
): Promise<
  | NextResponse
  | {
      userId: string;
      businessId: string;
      accessLevel: string;
    }
> {
  try {
    // 1. Ask Auth.js if there is a logged-in user
    const session: Session | null = await auth();

    // 2. If there is no logged-in user, block the request
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized Access" },
        { status: 401 },
      );
    }

    // 3. Make sure the dashboard provided a businessId
    if (!businessId) {
      return NextResponse.json(
        { error: "Missing businessId" },
        { status: 400 },
      );
    }

    // 4. Verify that this user belongs to the selected business
    //    with one of the allowed access levels.
    const businessUser = await prisma.businessUser.findFirst({
      where: {
        userId: session.user.id,
        businessId: businessId,

        role: {
          accessLevel: {
            in: allowedRoles,
          },
        },
      },

      select: {
        userId: true,
        businessId: true,
        role: {
          select: {
            id: true,
            accessLevel: true,
          },
        },
      },
    });

    // 5. User does not have access to the selected business
    if (!businessUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 6. Return the verified IDs for the route
    return {
      userId: businessUser.userId,
      businessId: businessUser.businessId,
      accessLevel: businessUser.role.accessLevel,
    };
  } catch (error) {
    console.error("Failed to authenticate:", error);

    return NextResponse.json(
      { error: "Failed to authenticate" },
      { status: 400 },
    );
  }
}
