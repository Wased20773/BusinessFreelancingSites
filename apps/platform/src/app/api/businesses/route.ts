import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/businesses
export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const businessUsers = await prisma.businessUser.findMany({
      where: {
        userId: session.user.id,
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
            slug: true,
            domain: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json(businessUsers, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch user businesses:", error);

    return NextResponse.json(
      { error: "Failed to fetch businesses" },
      { status: 500 },
    );
  }
}
