import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// GET /api/businesses/[businessId]/users/search?email=...
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
    ]);

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const searchedUser = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        businesses: {
          where: {
            businessId,
          },
          select: {
            id: true,
          },
        },
      },
    });

    if (!searchedUser) {
      return NextResponse.json(
        { error: "Searched user was not found" },
        { status: 404 },
      );
    }

    if (searchedUser.businesses.length > 0) {
      return NextResponse.json(
        { error: "This user is already attached to this business" },
        { status: 400 },
      );
    }

    const { ...user } = searchedUser;

    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error("Failed to search for account:", error);

    return NextResponse.json(
      { error: "Failed to search for account" },
      { status: 500 },
    );
  }
}
