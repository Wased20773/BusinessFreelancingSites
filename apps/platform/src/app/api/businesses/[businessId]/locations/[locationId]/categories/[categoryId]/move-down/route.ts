import { validateBusinessLocationParams } from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// PATCH /api/businesses/[businessId]/locations/[locationId]/categories/[categoryId]/move-down
export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      businessId: string;
      locationId: string;
      categoryId: string;
    }>;
  },
): Promise<NextResponse> {
  try {
    const { businessId, locationId, categoryId } = await params;
    const paramsError = validateBusinessLocationParams(businessId, locationId);

    if (paramsError) return paramsError;

    if (!categoryId) {
      return NextResponse.json(
        { error: "Missing categoryId" },
        { status: 400 },
      );
    }

    const authResult = await authenticateBusinessAccess(request, businessId, [
      AccessLevel.owner,
      AccessLevel.admin,
    ]);

    if (authResult instanceof NextResponse) return authResult;

    // Find the selected category.
    const currentCategory = await prisma.category.findFirst({
      where: {
        id: categoryId,
        locationId,
      },
      select: {
        id: true,
        order: true,
        parentId: true,
      },
    });

    if (!currentCategory) {
      return NextResponse.json(
        { error: "This category does not exist in our records" },
        { status: 400 },
      );
    }

    /*
     * Find the closest category below this one.
     *
     * locationId keeps ordering local to this location.
     * parentId makes sure categories only move among siblings.
     */
    const belowCategory = await prisma.category.findFirst({
      where: {
        locationId,
        parentId: currentCategory.parentId,
        order: {
          gt: currentCategory.order,
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

    if (!belowCategory) {
      return NextResponse.json(
        { error: "Category is already at the bottom" },
        { status: 400 },
      );
    }

    const currentOrder = currentCategory.order;
    const belowOrder = belowCategory.order;

    // Swap the two local order values.
    const [updatedCategory] = await prisma.$transaction([
      prisma.category.update({
        where: {
          id: currentCategory.id,
        },
        data: {
          order: belowOrder,
        },
        select: {
          id: true,
          name: true,
          description: true,
          order: true,
          isVisible: true,
          syncGroupId: true,
          isSynced: true,
          updatedAt: true,
        },
      }),

      prisma.category.update({
        where: {
          id: belowCategory.id,
        },
        data: {
          order: currentOrder,
        },
      }),
    ]);

    return NextResponse.json(updatedCategory, {
      status: 200,
    });
  } catch (error) {
    console.error("Failed to move category down:", error);

    return NextResponse.json(
      { error: "Failed to move category down" },
      { status: 500 },
    );
  }
}
