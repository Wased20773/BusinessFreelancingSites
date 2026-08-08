import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { AccessLevel } from "@business-freelancer/database";

// GET /api/admin/business-users
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const authResult = await authenticateBusinessAccess(request, [
      AccessLevel.owner,
      AccessLevel.admin,
      AccessLevel.staff,
    ]);

    if (authResult instanceof NextResponse) return authResult;

    const { businessId } = authResult;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (userId === authResult.userId) {
      return NextResponse.json(
        { error: "You cannot request your own business user record here." },
        { status: 400 },
      );
    }

    const businessUsers = await prisma.businessUser.findMany({
      where: {
        businessId: businessId,
        userId: userId ? userId : { not: authResult.userId },
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

    return NextResponse.json(businessUsers);
  } catch (error) {
    console.error("Failed to fetch business users:", error);

    return NextResponse.json(
      { error: "Failed to fetch business users" },
      { status: 500 },
    );
  }
}

// POST /api/admin/business-users
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const authResult = await authenticateBusinessAccess(request, [
      AccessLevel.owner,
      AccessLevel.admin,
    ]);

    if (authResult instanceof NextResponse) return authResult;

    const { businessId } = authResult;
    const body = await request.json();

    // 1. Find the user we are trying to add
    const user = await prisma.user.findUnique({
      where: { email: body.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "A selected user could not be found" },
        { status: 404 },
      );
    }

    // 2. Grab the role selected
    const role = await prisma.role.findFirst({
      where: { accessLevel: body.accessLevel },
      select: { id: true },
    });

    if (!role) {
      return NextResponse.json(
        { error: "Invalid access level selection" },
        { status: 400 },
      );
    }

    // 3. Assign user with appropriate role to current business
    const businessUser = await prisma.businessUser.create({
      data: {
        businessId: businessId,
        userId: user.id,
        roleId: role.id,
      },
      select: {
        id: true,
        user: {
          select: {
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

    return NextResponse.json(businessUser, { status: 201 });
  } catch (error) {
    console.error("Failed to link user to business:", error);

    return NextResponse.json(
      { error: "Failed to link user to business" },
      { status: 500 },
    );
  }
}
