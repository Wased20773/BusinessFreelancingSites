import { validateBusinessLocationParams } from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// PATCH /api/businesses/[businessId]/locations/[locationId]/categories/[categoryId]/items/[itemId]/move-down
export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      businessId: string;
      locationId: string;
      categoryId: string;
      itemId: string;
    }>;
  },
): Promise<NextResponse> {
  try {
    const { businessId, locationId, categoryId, itemId } = await params;
    const paramsError = validateBusinessLocationParams(businessId, locationId);

    if (paramsError) return paramsError;

    if (!categoryId) {
      return NextResponse.json(
        { error: "Missing categoryId" },
        { status: 400 },
      );
    }

    if (!itemId) {
      return NextResponse.json({ error: "Missing itemId" }, { status: 400 });
    }

    const authResult = await authenticateBusinessAccess(request, businessId, [
      AccessLevel.owner,
      AccessLevel.admin,
    ]);

    if (authResult instanceof NextResponse) return authResult;

    // Find the currently selected Item.
    const currentItem = await prisma.item.findFirst({
      where: {
        id: itemId,
        categoryId,
        locationId,
      },
      select: {
        id: true,
        order: true,
      },
    });

    if (!currentItem) {
      return NextResponse.json(
        { error: "This item does not exist in our records" },
        { status: 400 },
      );
    }

    /*
     * Find the closest Item below the selected Item.
     *
     * categoryId keeps the order scoped to this Category.
     * locationId keeps the order local to this Location.
     */
    const belowItem = await prisma.item.findFirst({
      where: {
        categoryId,
        locationId,
        order: {
          gt: currentItem.order,
        },
      },
      orderBy: {
        order: "asc",
      },
      select: {
        id: true,
        order: true,
      },
    });

    if (!belowItem) {
      return NextResponse.json(
        { error: "Item is already at the bottom" },
        { status: 400 },
      );
    }

    const currentOrder = currentItem.order;
    const belowOrder = belowItem.order;

    // Swap the two local order values.
    const [updatedItem] = await prisma.$transaction([
      prisma.item.update({
        where: {
          id: currentItem.id,
        },
        data: {
          order: belowOrder,
        },
        select: {
          id: true,
          locationId: true,
          categoryId: true,
          order: true,
          updatedAt: true,
        },
      }),

      prisma.item.update({
        where: {
          id: belowItem.id,
        },
        data: {
          order: currentOrder,
        },
      }),
    ]);

    return NextResponse.json(updatedItem, {
      status: 200,
    });
  } catch (error) {
    console.error("Failed to move item down:", error);

    return NextResponse.json(
      { error: "Failed to move item down" },
      { status: 500 },
    );
  }
}
