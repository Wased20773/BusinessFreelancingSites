import {
  createSlug,
  updateSyncedResource,
  validateBusinessLocationParams,
} from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { copyObject } from "@/lib/s3/copy";
import { deleteObject } from "@/lib/s3/delete";
import {
  generateItemImageKey,
  generateSyncedItemImageKey,
} from "@/lib/s3/keys";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// PATCH /api/businesses/[businessId]/locations/[locationId]/items/[itemId]
export async function PATCH(
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
      return NextResponse.json({ error: "Missing item name" }, { status: 400 });
    }

    if (body.price === undefined || body.price === null) {
      return NextResponse.json(
        { error: "Missing item price" },
        { status: 400 },
      );
    }

    if (body.containsList !== undefined && !Array.isArray(body.containsList)) {
      return NextResponse.json(
        { error: "Item contains list must be an array" },
        { status: 400 },
      );
    }

    if (typeof body.isSynced !== "boolean") {
      return NextResponse.json(
        { error: "Synchronization setting was not found" },
        { status: 400 },
      );
    }

    const item = await prisma.item.findFirst({
      where: {
        id: itemId,
        locationId,
      },
      select: {
        id: true,
        locationId: true,
        syncGroupId: true,
        isSynced: true,
        imageKey: true,
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "This item does not exist in our records" },
        { status: 400 },
      );
    }

    const slug = createSlug(body.name);

    /*
     * Figure out which Items will be affected by this update.
     */
    const affectedItems =
      item.syncGroupId && body.isSynced
        ? await prisma.item.findMany({
            where: {
              syncGroupId: item.syncGroupId,

              OR: [{ isSynced: true }, { id: item.id }],
            },
            select: {
              id: true,
              locationId: true,
              imageKey: true,
              isSynced: true,
            },
          })
        : [
            {
              id: item.id,
              locationId: item.locationId,
              imageKey: item.imageKey,
              isSynced: item.isSynced,
            },
          ];

    /*
     * Since the slug now follows the Item name, make sure
     * there is no collision at any affected location.
     */
    const conflictingItem = await prisma.item.findFirst({
      where: {
        slug,

        locationId: {
          in: affectedItems.map((affectedItem) => affectedItem.locationId),
        },

        id: {
          notIn: affectedItems.map((affectedItem) => affectedItem.id),
        },
      },
      select: {
        id: true,
      },
    });

    if (conflictingItem) {
      return NextResponse.json(
        {
          error:
            "An item with this name already exists in one or more affected locations",
        },
        { status: 409 },
      );
    }

    let nextImageKey = item.imageKey;

    /*
     * If we create a new S3 object before Prisma succeeds,
     * remember it so it can be cleaned up on failure.
     */
    let copiedImageKey: string | null = null;

    /*
     * When an independent Item rejoins a group, its old
     * private object can be removed after Prisma succeeds.
     */
    let oldPrivateImageKey: string | null = null;

    // ################################
    // ##### SYNCED -> UNSYNCED #######
    // ################################

    if (item.isSynced === true && body.isSynced === false && item.imageKey) {
      const extension = getImageExtensionFromKey(item.imageKey);

      if (!extension) {
        return NextResponse.json(
          { error: "Unable to determine item image type" },
          { status: 500 },
        );
      }

      const privateImageKey = generateItemImageKey({
        businessId,
        itemId: item.id,
        extension,
      });

      if (privateImageKey !== item.imageKey) {
        await copyObject(item.imageKey, privateImageKey);

        copiedImageKey = privateImageKey;
      }

      nextImageKey = privateImageKey;
    }

    // ################################
    // ##### UNSYNCED -> SYNCED #######
    // ################################

    if (item.isSynced === false && body.isSynced === true && item.syncGroupId) {
      /*
       * Find an image being used by the currently-synced
       * members of this group.
       */
      const groupImageKey =
        affectedItems.find(
          (affectedItem) =>
            affectedItem.id !== item.id &&
            affectedItem.isSynced === true &&
            affectedItem.imageKey,
        )?.imageKey ?? null;

      /*
       * Existing group image wins.
       */
      if (groupImageKey) {
        if (item.imageKey && item.imageKey !== groupImageKey) {
          oldPrivateImageKey = item.imageKey;
        }

        nextImageKey = groupImageKey;
      } else if (item.imageKey) {
        /*
         * No group image exists, but the rejoining Item
         * has its own private image.
         *
         * Promote that image to the shared sync path.
         */
        const extension = getImageExtensionFromKey(item.imageKey);

        if (!extension) {
          return NextResponse.json(
            { error: "Unable to determine item image type" },
            { status: 500 },
          );
        }

        const sharedImageKey = generateSyncedItemImageKey({
          businessId,
          syncGroupId: item.syncGroupId,
          extension,
        });

        if (sharedImageKey !== item.imageKey) {
          await copyObject(item.imageKey, sharedImageKey);

          copiedImageKey = sharedImageKey;
          oldPrivateImageKey = item.imageKey;
        }

        nextImageKey = sharedImageKey;
      } else {
        /*
         * Neither the group nor this Item has an image.
         */
        nextImageKey = null;
      }
    }

    /*
     * If the Item was already synced and stays synced,
     * use the current group's shared image.
     */
    if (item.isSynced === true && body.isSynced === true) {
      nextImageKey =
        affectedItems.find(
          (affectedItem) =>
            affectedItem.isSynced === true && affectedItem.imageKey,
        )?.imageKey ?? null;
    }

    const response = await updateSyncedResource({
      body,
      model: prisma.item,
      resourceName: "item",
      id: itemId,
      locationId,
      data: {
        name: body.name,
        description: body.description,
        containsList: body.containsList,
        calories: body.calories,
        price: body.price,
        isAvailable: body.isAvailable,
        slug,
        imageKey: nextImageKey,
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
        syncGroupId: true,
        isSynced: true,
        updatedAt: true,
      },
    });

    /*
     * Prisma failed after we copied an object.
     */
    if (!response.ok) {
      if (copiedImageKey) {
        try {
          await deleteObject(copiedImageKey);
        } catch (cleanupError) {
          console.error(
            "Failed to clean up copied item image after database failure:",
            cleanupError,
          );
        }
      }

      return response;
    }

    /*
     * Re-sync succeeded.
     * The Item's old private S3 object is no longer needed.
     */
    if (oldPrivateImageKey && oldPrivateImageKey !== nextImageKey) {
      try {
        await deleteObject(oldPrivateImageKey);
      } catch (cleanupError) {
        console.error(
          "Failed to clean up old private item image:",
          cleanupError,
        );
      }
    }

    return response;
  } catch (error) {
    console.error("Failed to update item:", error);

    return NextResponse.json(
      { error: "Failed to update item" },
      { status: 500 },
    );
  }
}

function getImageExtensionFromKey(
  imageKey: string,
): "jpg" | "png" | "webp" | null {
  const extension = imageKey.split(".").pop();

  if (extension === "jpg" || extension === "png" || extension === "webp") {
    return extension;
  }

  return null;
}

// DELETE /api/businesses/[businessId]/locations/[locationId]/items/[itemId]
export async function DELETE(
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

    if (typeof body.deleteAllSynced !== "boolean") {
      return NextResponse.json(
        { error: "Delete synchronization option was not found" },
        { status: 400 },
      );
    }

    const item = await prisma.item.findFirst({
      where: {
        id: itemId,
        locationId,
      },
      select: {
        id: true,
        locationId: true,
        categoryId: true,
        syncGroupId: true,
        imageKey: true,
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "This item does not exist in our records" },
        { status: 400 },
      );
    }

    // ################################
    // ##### DELETE ALL SYNCED ########
    // ################################

    if (item.syncGroupId && body.deleteAllSynced === true) {
      /*
       * Find every currently-synced Item in the group,
       * plus the selected Item itself.
       *
       * imageKey is included so we know which S3 objects
       * may need cleanup after deletion.
       */
      const itemsToDelete = await prisma.item.findMany({
        where: {
          syncGroupId: item.syncGroupId,

          OR: [{ isSynced: true }, { id: item.id }],
        },
        select: {
          id: true,
          locationId: true,
          categoryId: true,
          imageKey: true,
        },
      });

      const itemIds = itemsToDelete.map((selectedItem) => selectedItem.id);

      /*
       * Every affected Category must have its Item order
       * repaired independently.
       */
      const affectedCategories = [
        ...new Map(
          itemsToDelete.map((selectedItem) => [
            selectedItem.categoryId,
            {
              categoryId: selectedItem.categoryId,
              locationId: selectedItem.locationId,
            },
          ]),
        ).values(),
      ];

      /*
       * Grab every unique S3 key referenced by the Items
       * we're about to delete.
       */
      const imageKeys = [
        ...new Set(
          itemsToDelete
            .map((selectedItem) => selectedItem.imageKey)
            .filter((imageKey): imageKey is string => imageKey !== null),
        ),
      ];

      /*
       * Before deciding which S3 objects can be deleted,
       * check whether any Item OUTSIDE this deletion still
       * references one of those keys.
       *
       * This protects shared synced images.
       */
      const remainingImageReferences =
        imageKeys.length > 0
          ? await prisma.item.findMany({
              where: {
                id: {
                  notIn: itemIds,
                },

                imageKey: {
                  in: imageKeys,
                },
              },
              select: {
                imageKey: true,
              },
            })
          : [];

      const stillReferencedImageKeys = new Set(
        remainingImageReferences
          .map((remainingItem) => remainingItem.imageKey)
          .filter((imageKey): imageKey is string => imageKey !== null),
      );

      const imageKeysToDelete = imageKeys.filter(
        (imageKey) => !stillReferencedImageKeys.has(imageKey),
      );

      /*
       * Delete the database records first.
       *
       * If S3 cleanup fails afterward, the worst case is an
       * orphaned S3 object rather than a database Item pointing
       * to an image that no longer exists.
       */
      await prisma.item.deleteMany({
        where: {
          id: {
            in: itemIds,
          },
        },
      });

      /*
       * Rebuild order independently inside every affected
       * Category.
       */
      for (const affectedCategory of affectedCategories) {
        const remainingItems = await prisma.item.findMany({
          where: {
            locationId: affectedCategory.locationId,
            categoryId: affectedCategory.categoryId,
          },
          orderBy: {
            order: "asc",
          },
          select: {
            id: true,
          },
        });

        await prisma.$transaction(
          remainingItems.map((remainingItem, index) =>
            prisma.item.update({
              where: {
                id: remainingItem.id,
              },
              data: {
                order: index + 1,
              },
            }),
          ),
        );
      }

      /*
       * Clean up S3 only after the Item records are gone.
       *
       * Do not fail the successful Item deletion if S3 cleanup
       * fails. That would tell the client the delete failed even
       * though the database records are already gone.
       */
      for (const imageKey of imageKeysToDelete) {
        try {
          await deleteObject(imageKey);
        } catch (cleanupError) {
          console.error(
            `Failed to clean up deleted Item image "${imageKey}":`,
            cleanupError,
          );
        }
      }

      return NextResponse.json(
        { message: "Synchronized items deleted successfully" },
        { status: 200 },
      );
    }

    // ################################
    // ##### SINGLE ITEM DELETE #######
    // ################################

    /*
     * If this Item has an image, check whether another Item
     * still references that exact S3 object.
     *
     * This is especially important if the selected Item
     * currently points at a shared sync-group image.
     */
    let deleteImageFromS3 = false;

    if (item.imageKey) {
      const otherImageReference = await prisma.item.findFirst({
        where: {
          id: {
            not: item.id,
          },
          imageKey: item.imageKey,
        },
        select: {
          id: true,
        },
      });

      deleteImageFromS3 = !otherImageReference;
    }

    /*
     * Delete only the selected Item.
     */
    await prisma.item.delete({
      where: {
        id: item.id,
        locationId,
      },
    });

    /*
     * Reorganize this Category's Item order.
     */
    const remainingItems = await prisma.item.findMany({
      where: {
        locationId,
        categoryId: item.categoryId,
      },
      orderBy: {
        order: "asc",
      },
      select: {
        id: true,
      },
    });

    await prisma.$transaction(
      remainingItems.map((remainingItem, index) =>
        prisma.item.update({
          where: {
            id: remainingItem.id,
          },
          data: {
            order: index + 1,
          },
        }),
      ),
    );

    /*
     * Delete the S3 object only if the selected Item was the
     * final Item referencing it.
     */
    if (item.imageKey && deleteImageFromS3) {
      try {
        await deleteObject(item.imageKey);
      } catch (cleanupError) {
        console.error(
          `Failed to clean up deleted Item image "${item.imageKey}":`,
          cleanupError,
        );
      }
    }

    return NextResponse.json(
      { message: "Item deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to delete item:", error);

    return NextResponse.json(
      { error: "Failed to delete item" },
      { status: 500 },
    );
  }
}
