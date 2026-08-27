import { validateBusinessLocationParams } from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// PATCH /api/businesses/[businessId]/locations/[locationId]/items/[itemId]/options/[optionId]
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

    if (authResult instanceof NextResponse) {
      return authResult;
    }

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
     * ItemOption does not have locationId directly.
     *
     * Verify ownership through:
     *
     * ItemOption
     * -> Item
     * -> locationId
     */
    const option = await prisma.itemOption.findFirst({
      where: {
        id: optionId,
        itemId,

        item: {
          locationId,
        },
      },

      select: {
        id: true,
        syncGroupId: true,
      },
    });

    if (!option) {
      return NextResponse.json(
        { error: "This item option does not exist in our records" },
        { status: 400 },
      );
    }

    // ################################
    // ##### SYNCHRONIZED UPDATE ######
    // ################################

    if (option.syncGroupId && body.isSynced === true) {
      await prisma.itemOption.updateMany({
        where: {
          syncGroupId: option.syncGroupId,

          /*
           * Only currently-synced copies participate,
           * but always include the selected Option itself.
           */
          OR: [{ isSynced: true }, { id: option.id }],
        },

        data: {
          name: body.name,
          price: body.price,
          isAvailable: body.isAvailable,
          isSynced: true,
        },
      });

      return NextResponse.json(
        { message: "Synchronized item options updated successfully" },
        { status: 200 },
      );
    }

    // ################################
    // ##### SINGLE OPTION UPDATE #####
    // ################################

    const updatedOption = await prisma.itemOption.update({
      where: {
        id: option.id,
      },

      data: {
        name: body.name,
        price: body.price,
        isAvailable: body.isAvailable,
        isSynced: body.isSynced,
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
        updatedAt: true,
      },
    });

    return NextResponse.json(updatedOption, { status: 200 });
  } catch (error) {
    console.error("Failed to update item option:", error);

    return NextResponse.json(
      { error: "Failed to update item option" },
      { status: 500 },
    );
  }
}

// DELETE /api/businesses/[businessId]/locations/[locationId]/items/[itemId]/options/[optionId]
export async function DELETE(
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

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await request.json();

    if (typeof body.deleteAllSynced !== "boolean") {
      return NextResponse.json(
        { error: "Delete synchronization option was not found" },
        { status: 400 },
      );
    }

    /*
     * Again, validate location through the parent Item.
     */
    const option = await prisma.itemOption.findFirst({
      where: {
        id: optionId,
        itemId,

        item: {
          locationId,
        },
      },

      select: {
        id: true,
        itemId: true,
        syncGroupId: true,
      },
    });

    if (!option) {
      return NextResponse.json(
        { error: "This item option does not exist in our records" },
        { status: 400 },
      );
    }

    // ################################
    // ##### DELETE ALL SYNCED ########
    // ################################

    if (option.syncGroupId && body.deleteAllSynced === true) {
      /*
       * Get every currently-synced Option in the group,
       * while always including the selected Option itself.
       */
      const optionsToDelete = await prisma.itemOption.findMany({
        where: {
          syncGroupId: option.syncGroupId,

          OR: [{ isSynced: true }, { id: option.id }],
        },

        select: {
          id: true,
          itemId: true,
        },
      });

      /*
       * Each Item needs its own Option order repaired.
       *
       * itemId alone is enough because Item IDs are unique.
       */
      const affectedItemIds = [
        ...new Set(
          optionsToDelete.map((selectedOption) => selectedOption.itemId),
        ),
      ];

      await prisma.itemOption.deleteMany({
        where: {
          id: {
            in: optionsToDelete.map((selectedOption) => selectedOption.id),
          },
        },
      });

      /*
       * Rebuild Option order independently
       * inside every affected Item.
       */
      for (const affectedItemId of affectedItemIds) {
        const remainingOptions = await prisma.itemOption.findMany({
          where: {
            itemId: affectedItemId,
          },

          orderBy: {
            order: "asc",
          },

          select: {
            id: true,
          },
        });

        await prisma.$transaction(
          remainingOptions.map((remainingOption, index) =>
            prisma.itemOption.update({
              where: {
                id: remainingOption.id,
              },

              data: {
                order: index + 1,
              },
            }),
          ),
        );
      }

      return NextResponse.json(
        {
          message: "Synchronized item options deleted successfully",
        },
        { status: 200 },
      );
    }

    // ################################
    // ##### SINGLE OPTION DELETE #####
    // ################################

    await prisma.itemOption.delete({
      where: {
        id: option.id,
      },
    });

    /*
     * Only the selected parent Item needs
     * its Option order repaired.
     */
    const remainingOptions = await prisma.itemOption.findMany({
      where: {
        itemId: option.itemId,
      },

      orderBy: {
        order: "asc",
      },

      select: {
        id: true,
      },
    });

    await prisma.$transaction(
      remainingOptions.map((remainingOption, index) =>
        prisma.itemOption.update({
          where: {
            id: remainingOption.id,
          },

          data: {
            order: index + 1,
          },
        }),
      ),
    );

    return NextResponse.json(
      { message: "Item option deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to delete item option:", error);

    return NextResponse.json(
      { error: "Failed to delete item option" },
      { status: 500 },
    );
  }
}
