import { validateBusinessLocationParams } from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// PATCH /api/businesses/[businessId]/locations/[locationId]/items/[itemId]/options/[optionId]/move-up
export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      businessId: string;
      locationId: string;
      itemId: string;
      optionId: string;
    }>;
  },
): Promise<NextResponse> {
  try {
    const { businessId, locationId, itemId, optionId } = await params;
    const paramsError = validateBusinessLocationParams(businessId, locationId);

    if (paramsError) return paramsError;

    if (!itemId) {
      return NextResponse.json({ error: "Missing itemId" }, { status: 400 });
    }

    if (!optionId) {
      return NextResponse.json({ error: "Missing optionId" }, { status: 400 });
    }

    const authResult = await authenticateBusinessAccess(request, businessId, [
      AccessLevel.owner,
      AccessLevel.admin,
    ]);

    if (authResult instanceof NextResponse) return authResult;

    /*
     * Validate the Option through its parent Item.
     *
     * ItemOption does not have locationId directly.
     */
    const currentOption = await prisma.itemOption.findFirst({
      where: {
        id: optionId,
        itemId,
        item: {
          locationId,
        },
      },
      select: {
        id: true,
        order: true,
      },
    });

    if (!currentOption) {
      return NextResponse.json(
        { error: "This item option does not exist in our records" },
        { status: 400 },
      );
    }

    /*
     * Find the closest Option above this one.
     *
     * itemId keeps ordering scoped to this exact parent Item.
     */
    const aboveOption = await prisma.itemOption.findFirst({
      where: {
        itemId,
        order: {
          lt: currentOption.order,
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

    if (!aboveOption) {
      return NextResponse.json(
        { error: "Item option is already at the top" },
        { status: 400 },
      );
    }

    const currentOrder = currentOption.order;
    const aboveOrder = aboveOption.order;

    /*
     * Swap the two local order values.
     */
    const [updatedOption] = await prisma.$transaction([
      prisma.itemOption.update({
        where: {
          id: currentOption.id,
        },

        data: {
          order: aboveOrder,
        },

        select: {
          id: true,
          itemId: true,
          order: true,
          updatedAt: true,
        },
      }),

      prisma.itemOption.update({
        where: {
          id: aboveOption.id,
        },

        data: {
          order: currentOrder,
        },
      }),
    ]);

    return NextResponse.json(updatedOption, { status: 200 });
  } catch (error) {
    console.error("Failed to move item option up:", error);

    return NextResponse.json(
      { error: "Failed to move item option up" },
      { status: 500 },
    );
  }
}
