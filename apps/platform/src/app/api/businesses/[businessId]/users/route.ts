import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// GET /api/businesses/[businessId]/users
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

    const authResult = await authenticateBusinessAccess(request, businessId, [
      AccessLevel.owner,
      AccessLevel.admin,
      AccessLevel.staff,
    ]);

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    /*
     * This route is for other users attached to the business.
     *
     * The authenticated user's own role is returned from:
     * GET /api/businesses/[businessId]
     */
    if (userId === authResult.userId) {
      return NextResponse.json(
        { error: "You cannot request your own business user record here." },
        { status: 400 },
      );
    }

    /*
     * If a userId search parameter is provided:
     *   → return that specific user.
     *
     * If one is not provided:
     *   → return every business user except the authenticated user.
     */
    const businessUsers = await prisma.businessUser.findMany({
      where: {
        businessId,
        userId: userId
          ? userId
          : {
              not: authResult.userId,
            },
      },
      orderBy: {
        user: {
          email: "asc",
        },
      },
      select: {
        id: true,
        businessId: true,
        userId: true,
        roleId: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            image: true,
            createdAt: true,
            updatedAt: true,
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

    return NextResponse.json(businessUsers, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch business users:", error);

    return NextResponse.json(
      { error: "Failed to fetch business users" },
      { status: 500 },
    );
  }
}

// POST /api/businesses/[businessId]/users
export async function POST(
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

    const authResult = await authenticateBusinessAccess(request, businessId, [
      AccessLevel.owner,
      AccessLevel.admin,
    ]);

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await request.json();

    if (typeof body.email !== "string" || !body.email.trim()) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

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

    // 1. Find the user we are trying to add
    const user = await prisma.user.findUnique({
      where: {
        email: body.email.trim(),
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "A selected user could not be found" },
        { status: 404 },
      );
    }

    // 2. Make sure the user is not already attached to THIS business
    const existingBusinessUser = await prisma.businessUser.findFirst({
      where: {
        businessId,
        userId: user.id,
      },
      select: {
        id: true,
      },
    });

    if (existingBusinessUser) {
      return NextResponse.json(
        { error: "This user is already attached to this business" },
        { status: 400 },
      );
    }

    // 3. Grab the selected role
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

    // 4. Attach the user to this business
    const businessUser = await prisma.businessUser.create({
      data: {
        businessId,
        userId: user.id,
        roleId: role.id,
      },
      select: {
        id: true,
        businessId: true,
        userId: true,
        roleId: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            image: true,
            createdAt: true,
            updatedAt: true,
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

    return NextResponse.json(businessUser, { status: 201 });
  } catch (error) {
    console.error("Failed to link user to business:", error);

    return NextResponse.json(
      { error: "Failed to link user to business" },
      { status: 500 },
    );
  }
}
