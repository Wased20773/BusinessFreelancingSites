import {
  createSlug,
  isUniqueConstraintError,
  validateBusinessLocationParams,
  verifyLocationInBusiness,
} from "@/app/api/route_helper";
import {
  parseOptions,
  replaceItemOptions,
  type OptionInput,
} from "@/lib/items/itemOptions";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { copyObject } from "@/lib/s3/copy";
import { deleteObject } from "@/lib/s3/delete";
import {
  generateItemImageKey,
  generateItemOriginalImageKey,
  generateSyncedItemImageKey,
  generateSyncedItemOriginalImageKey,
} from "@/lib/s3/keys";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";
import { allowSync } from "@/lib/billing/sync";

const ITEM_SELECT = {
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
  originalImageKey: true,
  syncGroupId: true,
  isSynced: true,
  updatedAt: true,
} as const;

// An option id in the request that isn't one of this item's options.
class OptionNotOnItemError extends Error {}

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

    const locationError = await verifyLocationInBusiness(
      businessId,
      locationId,
    );

    if (locationError) return locationError;

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

    /*
     * Optional: the item's full option list, in display order. When sent,
     * the item's options are made to match it (see replaceItemOptions).
     * Left out, the options aren't touched.
     */
    let options: OptionInput[] | null = null;

    if (body.options !== undefined) {
      const parsedOptions = parseOptions(body.options, { allowIds: true });

      if ("error" in parsedOptions) {
        return NextResponse.json(
          { error: parsedOptions.error },
          { status: 400 },
        );
      }

      options = parsedOptions.options;
    }

    body.isSynced = await allowSync(businessId, body.isSynced);

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
        originalImageKey: true,
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "This item does not exist in our records" },
        { status: 404 },
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
              originalImageKey: true,
              isSynced: true,
            },
          })
        : [
            {
              id: item.id,
              locationId: item.locationId,
              imageKey: item.imageKey,
              originalImageKey: item.originalImageKey,
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
    let nextOriginalImageKey = item.originalImageKey;

    /*
     * If we create new S3 objects before Prisma succeeds,
     * remember them so they can be cleaned up on failure.
     */
    let copiedImageKey: string | null = null;
    let copiedOriginalImageKey: string | null = null;

    /*
     * When an independent Item rejoins a group, its old
     * private objects can be removed after Prisma succeeds.
     */
    let oldPrivateImageKey: string | null = null;
    let oldPrivateOriginalImageKey: string | null = null;

    // ################################
    // ##### SYNCED -> UNSYNCED #######
    // ################################

    if (item.isSynced === true && body.isSynced === false) {
      /*
       * Give the Item its own private cropped image.
       */
      if (item.imageKey) {
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

      /*
       * Give the Item its own private original image too.
       */
      if (item.originalImageKey) {
        const originalExtension = getImageExtensionFromKey(
          item.originalImageKey,
        );

        if (!originalExtension) {
          if (copiedImageKey) {
            try {
              await deleteObject(copiedImageKey);
            } catch (cleanupError) {
              console.error(
                "Failed to clean up copied item image:",
                cleanupError,
              );
            }
          }

          return NextResponse.json(
            { error: "Unable to determine original item image type" },
            { status: 500 },
          );
        }

        const privateOriginalImageKey = generateItemOriginalImageKey({
          businessId,
          itemId: item.id,
          extension: originalExtension,
        });

        if (privateOriginalImageKey !== item.originalImageKey) {
          try {
            await copyObject(item.originalImageKey, privateOriginalImageKey);

            copiedOriginalImageKey = privateOriginalImageKey;
          } catch (error) {
            /*
             * The cropped image may already have been copied.
             * Clean it up if copying the original fails.
             */
            if (copiedImageKey) {
              try {
                await deleteObject(copiedImageKey);
              } catch (cleanupError) {
                console.error(
                  "Failed to clean up copied item image after original copy failure:",
                  cleanupError,
                );
              }
            }

            throw error;
          }
        }

        nextOriginalImageKey = privateOriginalImageKey;
      }
    }

    // ################################
    // ##### UNSYNCED -> SYNCED #######
    // ################################

    if (item.isSynced === false && body.isSynced === true && item.syncGroupId) {
      /*
       * Find an image being used by the currently-synced
       * members of this group.
       */
      const groupItem =
        affectedItems.find(
          (affectedItem) =>
            affectedItem.id !== item.id &&
            affectedItem.isSynced === true &&
            affectedItem.imageKey,
        ) ?? null;

      /*
       * Existing group image wins.
       */
      if (groupItem?.imageKey) {
        if (item.imageKey && item.imageKey !== groupItem.imageKey) {
          oldPrivateImageKey = item.imageKey;
        }

        if (
          item.originalImageKey &&
          item.originalImageKey !== groupItem.originalImageKey
        ) {
          oldPrivateOriginalImageKey = item.originalImageKey;
        }

        nextImageKey = groupItem.imageKey;
        nextOriginalImageKey = groupItem.originalImageKey;
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

        /*
         * Promote the private original to the shared sync path too.
         */
        if (item.originalImageKey) {
          const originalExtension = getImageExtensionFromKey(
            item.originalImageKey,
          );

          if (!originalExtension) {
            if (copiedImageKey) {
              try {
                await deleteObject(copiedImageKey);
              } catch (cleanupError) {
                console.error(
                  "Failed to clean up copied item image:",
                  cleanupError,
                );
              }
            }

            return NextResponse.json(
              { error: "Unable to determine original item image type" },
              { status: 500 },
            );
          }

          const sharedOriginalImageKey = generateSyncedItemOriginalImageKey({
            businessId,
            syncGroupId: item.syncGroupId,
            extension: originalExtension,
          });

          if (sharedOriginalImageKey !== item.originalImageKey) {
            try {
              await copyObject(item.originalImageKey, sharedOriginalImageKey);

              copiedOriginalImageKey = sharedOriginalImageKey;
              oldPrivateOriginalImageKey = item.originalImageKey;
            } catch (error) {
              if (copiedImageKey) {
                try {
                  await deleteObject(copiedImageKey);
                } catch (cleanupError) {
                  console.error(
                    "Failed to clean up copied item image after original copy failure:",
                    cleanupError,
                  );
                }
              }

              throw error;
            }
          }

          nextOriginalImageKey = sharedOriginalImageKey;
        } else {
          nextOriginalImageKey = null;
        }
      } else {
        /*
         * Neither the group nor this Item has an image.
         */
        nextImageKey = null;
        nextOriginalImageKey = null;
      }
    }

    /*
     * If the Item was already synced and stays synced,
     * use the current group's shared images.
     */
    if (item.isSynced === true && body.isSynced === true) {
      const syncedItem =
        affectedItems.find(
          (affectedItem) =>
            affectedItem.isSynced === true && affectedItem.imageKey,
        ) ?? null;

      nextImageKey = syncedItem?.imageKey ?? null;
      nextOriginalImageKey = syncedItem?.originalImageKey ?? null;
    }

    const data = {
      name: body.name,
      description: body.description,
      containsList: body.containsList,
      calories: body.calories,
      price: body.price,
      isAvailable: body.isAvailable,
      slug,
      imageKey: nextImageKey,
      originalImageKey: nextOriginalImageKey,
    };

    // Synced save: every synced copy of the item (and its options) changes.
    const syncWide = Boolean(item.syncGroupId) && body.isSynced === true;

    /*
     * The item and all its option changes are saved in one transaction:
     * if any part fails, nothing changes.
     */
    let response: NextResponse;

    try {
      response = await prisma.$transaction(async (tx) => {
        if (syncWide) {
          await tx.item.updateMany({
            where: {
              syncGroupId: item.syncGroupId,
              // Only synced copies, plus this item even if it was unsynced.
              OR: [{ isSynced: true }, { id: item.id }],
            },
            data: { ...data, isSynced: true },
          });
        } else {
          await tx.item.update({
            where: { id: item.id, locationId },
            data: { ...data, isSynced: false },
          });
        }

        if (options) {
          const existing = await tx.itemOption.findMany({
            where: { itemId: item.id },
            select: { id: true, syncGroupId: true },
          });
          const existingIds = new Set(existing.map((option) => option.id));

          if (
            options.some((option) => option.id && !existingIds.has(option.id))
          ) {
            throw new OptionNotOnItemError();
          }

          await replaceItemOptions(tx, {
            itemId: item.id,
            existing,
            options,
            syncCopies: syncWide,
            copyItemIds: syncWide
              ? affectedItems
                  .filter((affectedItem) => affectedItem.id !== item.id)
                  .map((affectedItem) => affectedItem.id)
              : [],
          });
        }

        const updatedItem = await tx.item.findFirst({
          where: { id: item.id, locationId },
          select: ITEM_SELECT,
        });

        if (!updatedItem) {
          return NextResponse.json(
            { error: "This item could not be found after updating" },
            { status: 404 },
          );
        }

        return NextResponse.json(
          syncWide
            ? {
                message: "Synchronized item's updated successfully",
                ...updatedItem,
              }
            : updatedItem,
          { status: 200 },
        );
      });
    } catch (error) {
      if (error instanceof OptionNotOnItemError) {
        response = NextResponse.json(
          { error: "An option in the list does not belong to this item" },
          { status: 400 },
        );
      } else if (isUniqueConstraintError(error)) {
        response = NextResponse.json(
          { error: "Two options on this item can't have the same name" },
          { status: 409 },
        );
      } else {
        console.error("Failed to update item:", error);

        response = NextResponse.json(
          { error: "Failed to update item" },
          { status: 500 },
        );
      }
    }

    /*
     * Prisma failed after we copied one or both objects.
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

      if (copiedOriginalImageKey) {
        try {
          await deleteObject(copiedOriginalImageKey);
        } catch (cleanupError) {
          console.error(
            "Failed to clean up copied original item image after database failure:",
            cleanupError,
          );
        }
      }

      return response;
    }

    /*
     * Re-sync succeeded.
     * The Item's old private S3 objects are no longer needed.
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

    if (
      oldPrivateOriginalImageKey &&
      oldPrivateOriginalImageKey !== nextOriginalImageKey
    ) {
      try {
        await deleteObject(oldPrivateOriginalImageKey);
      } catch (cleanupError) {
        console.error(
          "Failed to clean up old private original item image:",
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

    const locationError = await verifyLocationInBusiness(
      businessId,
      locationId,
    );

    if (locationError) return locationError;

    const body = await request.json();

    if (typeof body.deleteAllSynced !== "boolean") {
      return NextResponse.json(
        { error: "Delete synchronization option was not found" },
        { status: 400 },
      );
    }

    body.deleteAllSynced = await allowSync(businessId, body.deleteAllSynced);

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
        originalImageKey: true,
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "This item does not exist in our records" },
        { status: 404 },
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
       * Both image keys are included so we know which S3
       * objects may need cleanup after deletion.
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
          originalImageKey: true,
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
       *
       * This includes both cropped and original images.
       */
      const imageKeys = [
        ...new Set(
          itemsToDelete
            .flatMap((selectedItem) => [
              selectedItem.imageKey,
              selectedItem.originalImageKey,
            ])
            .filter((imageKey): imageKey is string => imageKey !== null),
        ),
      ];

      /*
       * Before deciding which S3 objects can be deleted,
       * check whether any Item OUTSIDE this deletion still
       * references one of those keys.
       *
       * We check both imageKey and originalImageKey because
       * either type of image may still be shared.
       */
      const remainingImageReferences =
        imageKeys.length > 0
          ? await prisma.item.findMany({
              where: {
                id: {
                  notIn: itemIds,
                },

                OR: [
                  {
                    imageKey: {
                      in: imageKeys,
                    },
                  },
                  {
                    originalImageKey: {
                      in: imageKeys,
                    },
                  },
                ],
              },
              select: {
                imageKey: true,
                originalImageKey: true,
              },
            })
          : [];

      const stillReferencedImageKeys = new Set(
        remainingImageReferences
          .flatMap((remainingItem) => [
            remainingItem.imageKey,
            remainingItem.originalImageKey,
          ])
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
     * Collect both images belonging to the selected Item.
     *
     * Either one may still be referenced by another Item,
     * especially if this Item recently left a sync group.
     */
    const imageKeys = [
      ...new Set(
        [item.imageKey, item.originalImageKey].filter(
          (imageKey): imageKey is string => imageKey !== null,
        ),
      ),
    ];

    /*
     * Check whether another Item still references either
     * S3 object.
     */
    const remainingImageReferences =
      imageKeys.length > 0
        ? await prisma.item.findMany({
            where: {
              id: {
                not: item.id,
              },

              OR: [
                {
                  imageKey: {
                    in: imageKeys,
                  },
                },
                {
                  originalImageKey: {
                    in: imageKeys,
                  },
                },
              ],
            },
            select: {
              imageKey: true,
              originalImageKey: true,
            },
          })
        : [];

    const stillReferencedImageKeys = new Set(
      remainingImageReferences
        .flatMap((remainingItem) => [
          remainingItem.imageKey,
          remainingItem.originalImageKey,
        ])
        .filter((imageKey): imageKey is string => imageKey !== null),
    );

    const imageKeysToDelete = imageKeys.filter(
      (imageKey) => !stillReferencedImageKeys.has(imageKey),
    );

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
     * Delete each S3 object only if the selected Item was
     * the final Item referencing it.
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
