import {
  getNextOrder,
  validateBusinessLocationParams,
} from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// POST /api/businesses/[businessId]/locations/[locationId]/items/[itemId]/options
export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      businessId: string;
      locationId: string;
      itemId: string;
    }>;
  },
): Promise<NextResponse> {
  try {
    const { businessId, locationId, itemId } = await params;
    const paramsError = validateBusinessLocationParams(businessId, locationId);

    if (paramsError) return paramsError;

    if (!itemId) {
      return NextResponse.json({ error: "Missing itemId" }, { status: 400 });
    }

    const authResult = await authenticateBusinessAccess(request, businessId, [
      AccessLevel.owner,
      AccessLevel.admin,
    ]);

    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: "Missing option name" },
        { status: 400 },
      );
    }

    if (body.price === undefined || body.price === null) {
      return NextResponse.json(
        { error: "Missing option price" },
        { status: 400 },
      );
    }

    if (typeof body.isSynced !== "boolean") {
      return NextResponse.json(
        { error: "Synchronization setting was not found" },
        { status: 400 },
      );
    }

    /*
     * Get the selected parent Item.
     */
    const item = await prisma.item.findFirst({
      where: {
        id: itemId,
        locationId,
      },
      select: {
        id: true,
        locationId: true,
        syncGroupId: true,
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "This item does not exist in our records" },
        { status: 400 },
      );
    }

    // ################################
    // ##### SINGLE LOCATION ##########
    // ################################

    if (!body.isSynced) {
      const nextOrder = await getNextOrder(prisma.itemOption, {
        itemId: item.id,
      });

      if (nextOrder instanceof NextResponse) {
        return nextOrder;
      }

      const option = await prisma.itemOption.create({
        data: {
          itemId: item.id,
          name: body.name,
          price: body.price,
          order: nextOrder,
          isAvailable: body.isAvailable,
          syncGroupId: null,
          isSynced: false,
        },
        select: {
          id: true,
          itemId: true,
          name: true,
          price: true,
          order: true,
          isAvailable: true,
          syncGroupId: true,
          isSynced: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return NextResponse.json(option, { status: 201 });
    }

    // ################################
    // ##### SYNCHRONIZED #############
    // ################################

    if (!item.syncGroupId) {
      return NextResponse.json(
        { error: "This item does not belong to a synchronization group" },
        { status: 400 },
      );
    }

    /*
     * Find every corresponding Item participating
     * in this synchronization group.
     *
     * Always include the selected Item itself.
     */
    const parentItems = await prisma.item.findMany({
      where: {
        syncGroupId: item.syncGroupId,

        OR: [{ isSynced: true }, { id: item.id }],
      },
      select: {
        id: true,
      },
    });

    /*
     * Grab the highest option order for every parent
     * Item in one operation.
     */
    const existingOrders = await prisma.itemOption.groupBy({
      by: ["itemId"],
      where: {
        itemId: {
          in: parentItems.map((parentItem) => parentItem.id),
        },
      },
      _max: {
        order: true,
      },
    });

    const orderByItemId = new Map(
      existingOrders.map((result) => [result.itemId, result._max.order ?? 0]),
    );

    /*
     * This represents ONE logical option across
     * all corresponding Items.
     */
    const syncGroupId = crypto.randomUUID();

    const createdOptions = await prisma.itemOption.createMany({
      data: parentItems.map((parentItem) => ({
        itemId: parentItem.id,
        name: body.name,
        price: body.price,

        /*
         * Order stays independent per Item.
         */
        order: (orderByItemId.get(parentItem.id) ?? 0) + 1,

        isAvailable: body.isAvailable,
        syncGroupId,
        isSynced: true,
      })),
    });

    return NextResponse.json(
      {
        message: "Synchronized item options created successfully",
        count: createdOptions.count,
        syncGroupId,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create item option:", error);

    return NextResponse.json(
      { error: "Failed to create item option" },
      { status: 500 },
    );
  }
}
