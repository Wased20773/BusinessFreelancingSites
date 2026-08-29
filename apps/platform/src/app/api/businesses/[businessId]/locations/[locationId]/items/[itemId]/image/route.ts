import {
  imageRequestValidation,
  validateBusinessLocationParams,
} from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { processImage } from "@/lib/images/process";
import { prisma } from "@/lib/prisma";
import { deleteObject } from "@/lib/s3/delete";
import {
  generateItemImageKey,
  generateSyncedItemImageKey,
} from "@/lib/s3/keys";
import { uploadImage } from "@/lib/s3/upload";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// POST /api/businesses/[businessId]/locations/[locationId]/items/[itemId]/image
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

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const item = await prisma.item.findFirst({
      where: {
        id: itemId,
        locationId,
      },
      select: {
        id: true,
        imageKey: true,
        syncGroupId: true,
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 400 });
    }

    const imageResult = await imageRequestValidation(request);

    if (imageResult instanceof NextResponse) {
      return imageResult;
    }

    const { image, isSynced } = imageResult;

    /*
     * If this operation is being synchronized, check
     * whether the group already has an image.
     */
    if (isSynced && item.syncGroupId) {
      const syncedItemWithImage = await prisma.item.findFirst({
        where: {
          syncGroupId: item.syncGroupId,
          isSynced: true,
          imageKey: {
            not: null,
          },
        },
        select: {
          imageKey: true,
        },
      });

      if (syncedItemWithImage) {
        return NextResponse.json(
          {
            error:
              "The synchronized items already have an image. Please use replace instead",
          },
          { status: 409 },
        );
      }
    }

    /*
     * For a single-location upload, only the selected Item
     * matters.
     */
    if (!isSynced && item.imageKey) {
      return NextResponse.json(
        {
          error:
            "You cannot add to an item with an existing imageKey. Please use replace instead",
        },
        { status: 409 },
      );
    }

    const processedImage = await processImage(image);

    const imageKey =
      isSynced && item.syncGroupId
        ? generateSyncedItemImageKey({
            businessId,
            syncGroupId: item.syncGroupId,
            extension: processedImage.extension,
          })
        : generateItemImageKey({
            businessId,
            itemId: item.id,
            extension: processedImage.extension,
          });

    await uploadImage({
      key: imageKey,
      body: processedImage.buffer,
      contentType: processedImage.contentType,
    });

    try {
      /*
       * Synchronized upload.
       */
      if (isSynced && item.syncGroupId) {
        const updatedItems = await prisma.item.updateMany({
          where: {
            syncGroupId: item.syncGroupId,

            OR: [{ isSynced: true }, { id: item.id }],
          },
          data: {
            imageKey,
          },
        });

        return NextResponse.json(
          {
            message: "Synchronized item image uploaded successfully",
            count: updatedItems.count,
            imageKey,
          },
          { status: 201 },
        );
      }

      /*
       * Single Item upload.
       */
      const updatedItem = await prisma.item.update({
        where: {
          id: item.id,
          locationId,
        },
        data: {
          imageKey,
        },
        select: {
          id: true,
          locationId: true,
          imageKey: true,
          updatedAt: true,
        },
      });

      return NextResponse.json(
        {
          message: "Item image uploaded",
          item: updatedItem,
        },
        { status: 201 },
      );
    } catch (error) {
      try {
        await deleteObject(imageKey);
      } catch (cleanupError) {
        console.error(
          "Failed to clean up uploaded image after database failure:",
          cleanupError,
        );
      }

      throw error;
    }
  } catch (error) {
    console.error("Failed to add image to item:", error);

    return NextResponse.json(
      {
        error: "Failed to upload image to the item",
      },
      { status: 500 },
    );
  }
}

// PATCH /api/businesses/[businessId]/locations/[locationId]/items/[itemId]/image
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

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const item = await prisma.item.findFirst({
      where: {
        id: itemId,
        locationId,
      },
      select: {
        id: true,
        imageKey: true,
        syncGroupId: true,
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 400 });
    }

    const imageResult = await imageRequestValidation(request);

    if (imageResult instanceof NextResponse) {
      return imageResult;
    }

    const { image, isSynced } = imageResult;

    const processedImage = await processImage(image);

    /*
     * #############################
     * ##### SYNCED REPLACE ########
     * #############################
     */
    if (isSynced && item.syncGroupId) {
      const syncedItemWithImage = await prisma.item.findFirst({
        where: {
          syncGroupId: item.syncGroupId,
          isSynced: true,
          imageKey: {
            not: null,
          },
        },
        select: {
          imageKey: true,
        },
      });

      if (!syncedItemWithImage?.imageKey) {
        return NextResponse.json(
          {
            error:
              "The synchronized items do not currently have an image. Please upload one first",
          },
          { status: 409 },
        );
      }

      /*
       * The shared group's existing key is the one
       * that gets overwritten.
       */
      await uploadImage({
        key: syncedItemWithImage.imageKey,
        body: processedImage.buffer,
        contentType: processedImage.contentType,
      });

      const updatedAt = new Date();

      const updatedItems = await prisma.item.updateMany({
        where: {
          syncGroupId: item.syncGroupId,

          OR: [{ isSynced: true }, { id: item.id }],
        },
        data: {
          imageKey: syncedItemWithImage.imageKey,
          updatedAt,
        },
      });

      return NextResponse.json(
        {
          message: "Synchronized item image replaced successfully",
          count: updatedItems.count,
        },
        { status: 200 },
      );
    }

    /*
     * #############################
     * ##### SINGLE REPLACE ########
     * #############################
     */

    if (!item.imageKey) {
      return NextResponse.json(
        {
          error:
            "This item does not currently have an image in our records. Please upload an image to this item first",
        },
        { status: 409 },
      );
    }

    /*
     * IMPORTANT:
     *
     * If this Item currently points at a shared S3 key but the
     * request explicitly says isSynced=false, we must NOT
     * overwrite the shared object.
     *
     * Instead create/overwrite this Item's private key.
     */
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

    await uploadImage({
      key: privateImageKey,
      body: processedImage.buffer,
      contentType: processedImage.contentType,
    });

    const updatedItem = await prisma.item.update({
      where: {
        id: item.id,
        locationId,
      },
      data: {
        imageKey: privateImageKey,
      },
      select: {
        id: true,
        locationId: true,
        imageKey: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "Item image replaced successfully",
        item: updatedItem,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to update image to item:", error);

    return NextResponse.json(
      {
        error: "Failed to replace the image to the item",
      },
      { status: 500 },
    );
  }
}

// DELETE /api/businesses/[businessId]/locations/[locationId]/items/[itemId]/image
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

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    /*
     * DELETE has no image file, so it can stay JSON.
     */
    const body = await request.json();

    if (typeof body.deleteAllSynced !== "boolean") {
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
        imageKey: true,
        syncGroupId: true,
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Item was not found" },
        { status: 400 },
      );
    }

    if (!item.imageKey) {
      return NextResponse.json(
        {
          error: "This item does not have an image",
        },
        { status: 400 },
      );
    }

    /*
     * #############################
     * ##### SYNCED DELETE #########
     * #############################
     */

    if (body.deleteAllSynced && item.syncGroupId) {
      const syncedItemWithImage = await prisma.item.findFirst({
        where: {
          syncGroupId: item.syncGroupId,
          isSynced: true,
          imageKey: {
            not: null,
          },
        },
        select: {
          imageKey: true,
        },
      });

      if (!syncedItemWithImage?.imageKey) {
        return NextResponse.json(
          {
            error: "The synchronized items do not have an image",
          },
          { status: 400 },
        );
      }

      const oldImageKey = syncedItemWithImage.imageKey;

      await prisma.item.updateMany({
        where: {
          syncGroupId: item.syncGroupId,

          OR: [{ isSynced: true }, { id: item.id }],
        },
        data: {
          imageKey: null,
        },
      });

      try {
        await deleteObject(oldImageKey);
      } catch (error) {
        try {
          await prisma.item.updateMany({
            where: {
              syncGroupId: item.syncGroupId!,

              OR: [{ isSynced: true }, { id: item.id }],
            },
            data: {
              imageKey: oldImageKey,
            },
          });
        } catch (rollbackError) {
          console.error(
            "Failed to restore synchronized imageKey after S3 deletion failure:",
            rollbackError,
          );
        }

        throw error;
      }

      return NextResponse.json(
        { message: "Synchronized item image deleted successfully" },
        { status: 200 },
      );
    }

    /*
     * #############################
     * ##### SINGLE DELETE #########
     * #############################
     *
     * If the selected Item points at a shared image, DO NOT
     * delete the S3 object. Other synced Items still need it.
     */

    const sharedImage =
      item.syncGroupId &&
      item.imageKey.includes(`/synced/${item.syncGroupId}/`);

    const oldImageKey = item.imageKey;

    const updatedItem = await prisma.item.update({
      where: {
        id: item.id,
        locationId,
      },
      data: {
        imageKey: null,
      },
      select: {
        id: true,
        locationId: true,
        imageKey: true,
        updatedAt: true,
      },
    });

    /*
     * Only physically delete the S3 object if it belongs
     * exclusively to this Item.
     */
    if (!sharedImage) {
      try {
        await deleteObject(oldImageKey);
      } catch (error) {
        try {
          await prisma.item.update({
            where: {
              id: item.id,
              locationId,
            },
            data: {
              imageKey: oldImageKey,
            },
          });
        } catch (rollbackError) {
          console.error(
            "Failed to restore imageKey after S3 deletion failure:",
            rollbackError,
          );
        }

        throw error;
      }
    }

    return NextResponse.json(
      {
        message: "Item image deleted successfully",
        item: updatedItem,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to delete image from item:", error);

    return NextResponse.json(
      { error: "Failed to delete the image from the item" },
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
