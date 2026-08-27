import { validateBusinessLocationParams } from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// PATCH /api/businesses/[businessId]/locations/[locationId]/categories/[categoryId]/move-up
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
     * Find the closest category above this one.
     *
     * locationId keeps ordering local to this location.
     * parentId makes sure categories only move among siblings.
     */
    const aboveCategory = await prisma.category.findFirst({
      where: {
        locationId,
        parentId: currentCategory.parentId,
        order: {
          lt: currentCategory.order,
        },
      },
      orderBy: {
        order: "desc",
      },
      select: {
        id: true,
        order: true,
      },
    });

    if (!aboveCategory) {
      return NextResponse.json(
        { error: "Category is already at the top" },
        { status: 400 },
      );
    }

    const currentOrder = currentCategory.order;
    const aboveOrder = aboveCategory.order;

    // Swap the two local order values.
    const [updatedCategory] = await prisma.$transaction([
      prisma.category.update({
        where: {
          id: currentCategory.id,
        },
        data: {
          order: aboveOrder,
        },
        select: {
          id: true,
          locationId: true,
          parentId: true,
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
          id: aboveCategory.id,
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
    console.error("Failed to move category up:", error);

    return NextResponse.json(
      { error: "Failed to move category up" },
      { status: 500 },
    );
  }
}
