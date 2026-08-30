import { authenticateBusinessReadAccess } from "@/lib/auth/authenticateBusinessReadAccess";
import { getObjectUrl } from "@/lib/s3/get-url";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// GET /api/business/menu/items/[itemId]
export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      itemId: string;
    }>;
  },
): Promise<NextResponse> {
  try {
    const { itemId } = await params;

    if (!itemId) {
      return NextResponse.json({ error: "Missing item id" }, { status: 400 });
    }

    const authentication = await authenticateBusinessReadAccess(request, [
      AccessLevel.developer,
      AccessLevel.owner,
      AccessLevel.admin,
      AccessLevel.staff,
    ]);

    if (authentication instanceof NextResponse) return authentication;

    const item = await prisma.item.findFirst({
      where: {
        id: itemId,
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

        ...(authentication.authenticationType === "session"
          ? { syncGroupId: true, isSynced: true }
          : {}),

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

            ...(authentication.authenticationType === "session"
              ? { syncGroupId: true, isSynced: true }
              : {}),

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
