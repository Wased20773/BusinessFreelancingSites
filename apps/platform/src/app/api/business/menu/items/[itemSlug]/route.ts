import { authenticateBusinessReadAccess } from "@/lib/auth/authenticateBusinessReadAccess";
import { getObjectUrl } from "@/lib/s3/get-url";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// GET /api/business/menu/items/[itemSlug]
export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      itemSlug: string;
    }>;
  },
): Promise<NextResponse> {
  try {
    const { itemSlug } = await params;

    if (!itemSlug) {
      return NextResponse.json({ error: "Missing item slug" }, { status: 400 });
    }

    const authentication = await authenticateBusinessReadAccess(request, [
      AccessLevel.developer,
      AccessLevel.owner,
      AccessLevel.admin,
      AccessLevel.staff,
    ]);

    if (authentication instanceof NextResponse) return authentication;

    /*
     * Slugs only need to be unique within a location.
     *
     * This allows synchronized items at different locations
     * to share the same slug while still resolving to the
     * correct physical Item record.
     */
    const item = await prisma.item.findFirst({
      where: {
        slug: itemSlug,
        locationId: authentication.locationId,
      },

      select: {
        id: true,
        locationId: true,
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
        { error: "Item not found for this location" },
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
    console.error("Failed to fetch item:", error);

    return NextResponse.json(
      { error: "Failed to fetch item" },
      { status: 500 },
    );
  }
}
