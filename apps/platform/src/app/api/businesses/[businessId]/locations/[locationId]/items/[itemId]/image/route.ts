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
  generateItemOriginalImageKey,
  generateSyncedItemImageKey,
  generateSyncedItemOriginalImageKey,
} from "@/lib/s3/keys";
import { uploadImage } from "@/lib/s3/upload";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

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
        originalImageKey: true,
        syncGroupId: true,
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 400 });
    }

    /*
     * imageRequestValidation consumes the request body,
     * so clone it before validating the cropped image.
     *
     * The clone is used to retrieve the uncropped original.
     */
    const originalImageRequest = request.clone();

    const imageResult = await imageRequestValidation(request);

    if (imageResult instanceof NextResponse) {
      return imageResult;
    }

    const { image, isSynced } = imageResult;

    const originalImageResult = await getOriginalImage(
      originalImageRequest,
      true,
    );

    if (originalImageResult instanceof NextResponse) {
      return originalImageResult;
    }

    if (!originalImageResult) {
      return NextResponse.json(
        { error: "Original image was not found" },
        { status: 400 },
      );
    }

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

    const [processedImage, processedOriginalImage] = await Promise.all([
      processImage(image),
      processImage(originalImageResult),
    ]);

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

    const originalImageKey =
      isSynced && item.syncGroupId
        ? generateSyncedItemOriginalImageKey({
            businessId,
            syncGroupId: item.syncGroupId,
            extension: processedOriginalImage.extension,
          })
        : generateItemOriginalImageKey({
            businessId,
            itemId: item.id,
            extension: processedOriginalImage.extension,
          });

    await uploadImage({
      key: imageKey,
      body: processedImage.buffer,
      contentType: processedImage.contentType,
    });

    try {
      await uploadImage({
        key: originalImageKey,
        body: processedOriginalImage.buffer,
        contentType: processedOriginalImage.contentType,
      });
    } catch (error) {
      try {
        await deleteObject(imageKey);
      } catch (cleanupError) {
        console.error(
          "Failed to clean up cropped image after original image upload failure:",
          cleanupError,
        );
      }

      throw error;
    }

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
            originalImageKey,
          },
        });

        return NextResponse.json(
          {
            message: "Synchronized item image uploaded successfully",
            count: updatedItems.count,
            imageKey,
            originalImageKey,
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
          originalImageKey,
        },
        select: {
          id: true,
          locationId: true,
          imageKey: true,
          originalImageKey: true,
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

      try {
        await deleteObject(originalImageKey);
      } catch (cleanupError) {
        console.error(
          "Failed to clean up uploaded original image after database failure:",
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
        originalImageKey: true,
        syncGroupId: true,
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 400 });
    }

    /*
     * Clone before imageRequestValidation consumes the body.
     *
     * PATCH only includes originalImage when the user selected
     * an entirely new source image.
     *
     * Re-cropping an existing source only sends image.
     */
    const originalImageRequest = request.clone();

    const imageResult = await imageRequestValidation(request);

    if (imageResult instanceof NextResponse) {
      return imageResult;
    }

    const { image, isSynced } = imageResult;

    const originalImageResult = await getOriginalImage(
      originalImageRequest,
      false,
    );

    if (originalImageResult instanceof NextResponse) {
      return originalImageResult;
    }

    const processedImage = await processImage(image);

    const processedOriginalImage = originalImageResult
      ? await processImage(originalImageResult)
      : null;

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
          originalImageKey: true,
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
       * The shared group's existing cropped key is overwritten.
       *
       * This means changing only the crop does NOT touch the
       * stored original image.
       */
      await uploadImage({
        key: syncedItemWithImage.imageKey,
        body: processedImage.buffer,
        contentType: processedImage.contentType,
      });

      let syncedOriginalImageKey: string | null = null;

      /*
       * originalImage is only present when a completely new
       * source image was selected.
       */
      if (processedOriginalImage) {
        syncedOriginalImageKey =
          syncedItemWithImage.originalImageKey ??
          generateSyncedItemOriginalImageKey({
            businessId,
            syncGroupId: item.syncGroupId,
            extension: processedOriginalImage.extension,
          });

        await uploadImage({
          key: syncedOriginalImageKey,
          body: processedOriginalImage.buffer,
          contentType: processedOriginalImage.contentType,
        });
      }

      const updatedAt = new Date();

      const updatedItems = await prisma.item.updateMany({
        where: {
          syncGroupId: item.syncGroupId,

          OR: [{ isSynced: true }, { id: item.id }],
        },
        data: syncedOriginalImageKey
          ? {
              imageKey: syncedItemWithImage.imageKey,
              originalImageKey: syncedOriginalImageKey,
              updatedAt,
            }
          : {
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
     * Instead create/overwrite this Item's private cropped key.
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

    let privateOriginalImageKey: string | null = null;

    /*
     * If no new original was sent, keep the Item's existing
     * originalImageKey exactly as-is.
     *
     * That original may still be a synchronized/shared object.
     * This allows one Item to have a private crop while still
     * using the group's original source for future cropping.
     */
    if (processedOriginalImage) {
      privateOriginalImageKey = generateItemOriginalImageKey({
        businessId,
        itemId: item.id,
        extension: processedOriginalImage.extension,
      });

      await uploadImage({
        key: privateOriginalImageKey,
        body: processedOriginalImage.buffer,
        contentType: processedOriginalImage.contentType,
      });
    }

    const oldOriginalImageKey = item.originalImageKey;

    const updatedItem = await prisma.item.update({
      where: {
        id: item.id,
        locationId,
      },
      data: privateOriginalImageKey
        ? {
            imageKey: privateImageKey,
            originalImageKey: privateOriginalImageKey,
          }
        : {
            imageKey: privateImageKey,
          },
      select: {
        id: true,
        locationId: true,
        imageKey: true,
        originalImageKey: true,
        updatedAt: true,
      },
    });

    /*
     * If a completely new private original replaced an older
     * private original with a different key, remove the old one.
     *
     * Never remove a shared synchronized original here because
     * other Items may still reference it.
     */
    if (
      privateOriginalImageKey &&
      oldOriginalImageKey &&
      oldOriginalImageKey !== privateOriginalImageKey
    ) {
      const oldOriginalWasShared =
        item.syncGroupId &&
        oldOriginalImageKey.includes(`/synced/${item.syncGroupId}/`);

      if (!oldOriginalWasShared) {
        try {
          await deleteObject(oldOriginalImageKey);
        } catch (cleanupError) {
          console.error(
            "Failed to remove previous private original image:",
            cleanupError,
          );
        }
      }
    }

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
        originalImageKey: true,
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
          originalImageKey: true,
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
      const oldOriginalImageKey = syncedItemWithImage.originalImageKey;

      await prisma.item.updateMany({
        where: {
          syncGroupId: item.syncGroupId,

          OR: [{ isSynced: true }, { id: item.id }],
        },
        data: {
          imageKey: null,
          originalImageKey: null,
        },
      });

      try {
        await deleteObject(oldImageKey);

        if (oldOriginalImageKey && oldOriginalImageKey !== oldImageKey) {
          await deleteObject(oldOriginalImageKey);
        }
      } catch (error) {
        try {
          await prisma.item.updateMany({
            where: {
              syncGroupId: item.syncGroupId!,

              OR: [{ isSynced: true }, { id: item.id }],
            },
            data: {
              imageKey: oldImageKey,
              originalImageKey: oldOriginalImageKey,
            },
          });
        } catch (rollbackError) {
          console.error(
            "Failed to restore synchronized image keys after S3 deletion failure:",
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
     * A cropped image and original image are checked separately.
     *
     * Either one may still point at the synchronized group's
     * shared S3 object.
     */

    const oldImageKey = item.imageKey;
    const oldOriginalImageKey = item.originalImageKey;

    const sharedImage =
      item.syncGroupId && oldImageKey.includes(`/synced/${item.syncGroupId}/`);

    const sharedOriginalImage =
      item.syncGroupId &&
      oldOriginalImageKey?.includes(`/synced/${item.syncGroupId}/`);

    const updatedItem = await prisma.item.update({
      where: {
        id: item.id,
        locationId,
      },
      data: {
        imageKey: null,
        originalImageKey: null,
      },
      select: {
        id: true,
        locationId: true,
        imageKey: true,
        originalImageKey: true,
        updatedAt: true,
      },
    });

    try {
      /*
       * Only physically delete objects that belong exclusively
       * to this Item.
       */
      if (!sharedImage) {
        await deleteObject(oldImageKey);
      }

      if (
        oldOriginalImageKey &&
        !sharedOriginalImage &&
        oldOriginalImageKey !== oldImageKey
      ) {
        await deleteObject(oldOriginalImageKey);
      }
    } catch (error) {
      try {
        await prisma.item.update({
          where: {
            id: item.id,
            locationId,
          },
          data: {
            imageKey: oldImageKey,
            originalImageKey: oldOriginalImageKey,
          },
        });
      } catch (rollbackError) {
        console.error(
          "Failed to restore image keys after S3 deletion failure:",
          rollbackError,
        );
      }

      throw error;
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

async function getOriginalImage(
  request: Request,
  required: boolean,
): Promise<File | null | NextResponse> {
  const formData = await request.formData();
  const originalImage = formData.get("originalImage");

  if (!originalImage) {
    if (required) {
      return NextResponse.json(
        { error: "An original image was not found" },
        { status: 400 },
      );
    }

    return null;
  }

  if (!(originalImage instanceof File)) {
    return NextResponse.json(
      { error: "The original image must be a file" },
      { status: 400 },
    );
  }

  if (
    !ALLOWED_IMAGE_TYPES.includes(
      originalImage.type as (typeof ALLOWED_IMAGE_TYPES)[number],
    )
  ) {
    return NextResponse.json(
      {
        error: "The original image must be a JPEG, PNG, or WebP image",
      },
      { status: 400 },
    );
  }

  if (originalImage.size > MAX_IMAGE_SIZE) {
    return NextResponse.json(
      {
        error: "The original image cannot be larger than 10MB",
      },
      { status: 400 },
    );
  }

  return originalImage;
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
