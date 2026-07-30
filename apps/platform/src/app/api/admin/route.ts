import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/route.ts
export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized Access" },
        { status: 401 },
      );
    }

    const businessUser = await prisma.businessUser.findFirst({
      where: {
        user: {
          email: session.user.email,
        },
      },
      select: {
        id: true,
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!businessUser) {
      return NextResponse.json(
        { error: "No business membership found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        businessUserId: businessUser.id,
        businessId: businessUser.business.id,
        businessName: businessUser.business.name,
        businessSlug: businessUser.business.slug,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to retrieve current business:", error);

    return NextResponse.json(
      { error: "Failed to retrieve current business" },
      { status: 500 },
    );
  }
}
