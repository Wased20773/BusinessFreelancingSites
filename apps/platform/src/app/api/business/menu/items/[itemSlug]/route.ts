import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { authenticateBusinessReadAccess } from "@/lib/auth/authenticateBusinessReadAccess";

// GET /api/business/menu/items/[itemSlug]
export async function GET(
  request: Request,
  params: Promise<{
    itemSlug: string;
  }>,
): Promise<NextResponse> {
  try {
    const authentication = await authenticateBusinessReadAccess(request, [
      AccessLevel.developer,
      AccessLevel.owner,
      AccessLevel.admin,
      AccessLevel.staff,
    ]);

    if (authentication instanceof NextResponse) return authentication;

    const { itemSlug } = await params;

    if (!itemSlug) {
      return NextResponse.json({ error: "Missing item slug" }, { status: 400 });
    }

    const item = await prisma.item.findFirst({
      where: {
        businessId: authentication.businessId,
        slug: itemSlug,
      },
      select: {
        id: true,
        categoryId: true,
        name: true,
        description: true,
        containsList: true,
        calories: true,
        price: true,
        order: true,
        isAvailable: true,
        slug: true,
        imageKey: true,
        createdAt: true,
        updatedAt: true,
        options: {
          select: {
            id: true,
            itemId: true,
            name: true,
            price: true,
            order: true,
            isAvailable: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Item not found for this business" },
        { status: 404 },
      );
    }

    return NextResponse.json(item, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch business item:", error);

    return NextResponse.json(
      { error: "Failed to fetch business item" },
      { status: 500 },
    );
  }
}
