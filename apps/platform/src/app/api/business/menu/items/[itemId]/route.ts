import { authenticateBusinessReadAccess } from "@/lib/auth/authenticateBusinessReadAccess";
import { getObjectUrl } from "@/lib/s3/get-url";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// GET /api/business/menu/items/[itemId]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> },
): Promise<NextResponse> {
  try {
    const authentication = await authenticateBusinessReadAccess(request, [
      AccessLevel.developer,
      AccessLevel.owner,
      AccessLevel.admin,
      AccessLevel.staff,
    ]);

    if (authentication instanceof NextResponse) return authentication;

    const { itemId } = await params;

    if (!itemId) {
      return NextResponse.json({ error: "Missing item ID" }, { status: 400 });
    }

    const item = await prisma.item.findFirst({
      where: {
        id: itemId,
        businessId: authentication.businessId,
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
          orderBy: {
            order: "asc",
          },
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

    const itemWithImageUrl = {
      ...item,
      imageKey: item.imageKey ? await getObjectUrl(item.imageKey) : null,
    };

    return NextResponse.json(itemWithImageUrl, {
      status: 200,
    });
  } catch (error) {
    console.error("Failed to fetch business item:", error);

    return NextResponse.json(
      { error: "Failed to fetch business item" },
      { status: 500 },
    );
  }
}
