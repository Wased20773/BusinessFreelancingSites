import { imageRequestValidation } from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { processImage } from "@/lib/images/process";
import { prisma } from "@/lib/prisma";
import { deleteObject } from "@/lib/s3/delete";
import {
  generateBusinessImageKey,
  generateBusinessOriginalImageKey,
} from "@/lib/s3/keys";
import { uploadImage } from "@/lib/s3/upload";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

async function getOriginalImage(
  request: Request,
): Promise<File | null | NextResponse> {
  try {
    const formData = await request.formData();
    const originalImage = formData.get("originalImage");

    if (originalImage === null) {
      return null;
    }

    if (!(originalImage instanceof File)) {
      return NextResponse.json(
        {
          error:
            'The original image must be submitted using the "originalImage" form-data field',
        },
        { status: 400 },
      );
    }

    if (originalImage.size === 0) {
      return NextResponse.json(
        { error: "The uploaded original image is empty" },
        { status: 400 },
      );
    }

    if (
      originalImage.type !== "image/jpeg" &&
      originalImage.type !== "image/png" &&
      originalImage.type !== "image/webp"
    ) {
      return NextResponse.json(
        {
          error:
            "Unsupported original image type. Only JPEG, PNG, and WebP images are allowed.",
        },
        { status: 415 },
      );
    }

    return originalImage;
  } catch {
    return NextResponse.json(
      { error: "Failed to get form data from request" },
      { status: 400 },
    );
  }
}

// POST /api/businesses/[businessId]/image
export async function POST(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> },
): Promise<NextResponse> {
  try {
    const { businessId } = await params;

    if (!businessId) {
      return NextResponse.json(
        { error: "Missing businessId" },
        { status: 400 },
      );
    }

    const authentication = await authenticateBusinessAccess(
      request,
      businessId,
      [AccessLevel.owner, AccessLevel.admin],
    );

    if (authentication instanceof NextResponse) {
      return authentication;
    }

    const business = await prisma.business.findUnique({
      where: {
        id: businessId,
      },
      select: {
        id: true,
        imageKey: true,
        originalImageKey: true,
      },
    });

    if (!business) {
      return NextResponse.json(
        { error: "Business could not be found" },
        { status: 404 },
      );
    }

    if (business.imageKey || business.originalImageKey) {
      return NextResponse.json(
        {
          error:
            "This business already has an image. Please replace the existing image instead",
        },
        { status: 409 },
      );
    }

    /*
     * Clone the request because both helpers need to read
     * the multipart form-data body.
     */
    const originalRequest = request.clone();

    const imageResult = await imageRequestValidation(request, false);

    if (imageResult instanceof NextResponse) {
      return imageResult;
    }

    const originalImageResult = await getOriginalImage(originalRequest);

    if (originalImageResult instanceof NextResponse) {
      return originalImageResult;
    }

    if (!originalImageResult) {
      return NextResponse.json(
        {
          error:
            'Missing original image file. Please submit the file using the "originalImage" form-data field',
        },
        { status: 400 },
      );
    }

    const [processedImage, processedOriginalImage] = await Promise.all([
      processImage(imageResult.image),
      processImage(originalImageResult),
    ]);

    const imageKey = generateBusinessImageKey({
      businessId,
      extension: processedImage.extension,
    });

    const originalImageKey = generateBusinessOriginalImageKey({
      businessId,
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
          "Failed to clean up cropped business image after original image upload failure:",
          cleanupError,
        );
      }

      throw error;
    }

    try {
      const updatedBusiness = await prisma.business.update({
        where: {
          id: businessId,
        },
        data: {
          imageKey,
          originalImageKey,
        },
        select: {
          id: true,
          imageKey: true,
          originalImageKey: true,
          updatedAt: true,
        },
      });

      return NextResponse.json(
        {
          message: "Business image uploaded successfully",
          business: updatedBusiness,
        },
        { status: 201 },
      );
    } catch (error) {
      try {
        await Promise.all([
          deleteObject(imageKey),
          deleteObject(originalImageKey),
        ]);
      } catch (cleanupError) {
        console.error(
          "Failed to clean up uploaded business images after database failure:",
          cleanupError,
        );
      }

      throw error;
    }
  } catch (error) {
    console.error("Failed to upload business image:", error);

    return NextResponse.json(
      { error: "Failed to upload business image" },
      { status: 500 },
    );
  }
}

// PATCH /api/businesses/[businessId]/image
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> },
): Promise<NextResponse> {
  try {
    const { businessId } = await params;

    if (!businessId) {
      return NextResponse.json(
        { error: "Missing businessId" },
        { status: 400 },
      );
    }

    const authentication = await authenticateBusinessAccess(
      request,
      businessId,
      [AccessLevel.owner, AccessLevel.admin],
    );

    if (authentication instanceof NextResponse) {
      return authentication;
    }

    const business = await prisma.business.findUnique({
      where: {
        id: businessId,
      },
      select: {
        id: true,
        imageKey: true,
        originalImageKey: true,
      },
    });

    if (!business) {
      return NextResponse.json(
        { error: "Business could not be found" },
        { status: 404 },
      );
    }

    if (!business.imageKey) {
      return NextResponse.json(
        {
          error:
            "This business does not currently have an image. Please upload an image first",
        },
        { status: 409 },
      );
    }

    const originalRequest = request.clone();

    const imageResult = await imageRequestValidation(request, false);

    if (imageResult instanceof NextResponse) {
      return imageResult;
    }

    const originalImageResult = await getOriginalImage(originalRequest);

    if (originalImageResult instanceof NextResponse) {
      return originalImageResult;
    }

    const processedImage = await processImage(imageResult.image);

    const newImageKey = generateBusinessImageKey({
      businessId,
      extension: processedImage.extension,
    });

    const oldImageKey = business.imageKey;
    const oldOriginalImageKey = business.originalImageKey;

    let newOriginalImageKey = oldOriginalImageKey;

    /*
     * A new originalImage means the user selected
     * an entirely new source image.
     *
     * If originalImage is missing, this is only a re-crop
     * of the already stored original.
     */
    let processedOriginalImage: Awaited<
      ReturnType<typeof processImage>
    > | null = null;

    if (originalImageResult) {
      processedOriginalImage = await processImage(originalImageResult);

      newOriginalImageKey = generateBusinessOriginalImageKey({
        businessId,
        extension: processedOriginalImage.extension,
      });
    }

    await uploadImage({
      key: newImageKey,
      body: processedImage.buffer,
      contentType: processedImage.contentType,
    });

    if (processedOriginalImage && newOriginalImageKey) {
      try {
        await uploadImage({
          key: newOriginalImageKey,
          body: processedOriginalImage.buffer,
          contentType: processedOriginalImage.contentType,
        });
      } catch (error) {
        /*
         * Only remove the newly uploaded cropped object if
         * it did not overwrite the existing deterministic key.
         */
        if (newImageKey !== oldImageKey) {
          try {
            await deleteObject(newImageKey);
          } catch (cleanupError) {
            console.error(
              "Failed to clean up cropped business image:",
              cleanupError,
            );
          }
        }

        throw error;
      }
    }

    let updatedBusiness;

    try {
      updatedBusiness = await prisma.business.update({
        where: {
          id: businessId,
        },
        data: {
          imageKey: newImageKey,
          originalImageKey: newOriginalImageKey,
        },
        select: {
          id: true,
          imageKey: true,
          originalImageKey: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      if (newImageKey !== oldImageKey) {
        try {
          await deleteObject(newImageKey);
        } catch (cleanupError) {
          console.error(
            "Failed to clean up uploaded business image after database failure:",
            cleanupError,
          );
        }
      }

      if (newOriginalImageKey && newOriginalImageKey !== oldOriginalImageKey) {
        try {
          await deleteObject(newOriginalImageKey);
        } catch (cleanupError) {
          console.error(
            "Failed to clean up uploaded original business image after database failure:",
            cleanupError,
          );
        }
      }

      throw error;
    }

    /*
     * Clean up old objects if processing changed extensions.
     */
    if (oldImageKey !== newImageKey) {
      try {
        await deleteObject(oldImageKey);
      } catch (cleanupError) {
        console.error(
          "Failed to delete old business image after replacement:",
          cleanupError,
        );
      }
    }

    if (
      oldOriginalImageKey &&
      newOriginalImageKey &&
      oldOriginalImageKey !== newOriginalImageKey
    ) {
      try {
        await deleteObject(oldOriginalImageKey);
      } catch (cleanupError) {
        console.error(
          "Failed to delete old original business image after replacement:",
          cleanupError,
        );
      }
    }

    return NextResponse.json(
      {
        message: "Business image replaced successfully",
        business: updatedBusiness,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to replace business image:", error);

    return NextResponse.json(
      { error: "Failed to replace business image" },
      { status: 500 },
    );
  }
}

// DELETE /api/businesses/[businessId]/image
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> },
): Promise<NextResponse> {
  try {
    const { businessId } = await params;

    if (!businessId) {
      return NextResponse.json(
        { error: "Missing businessId" },
        { status: 400 },
      );
    }

    const authentication = await authenticateBusinessAccess(
      request,
      businessId,
      [AccessLevel.owner, AccessLevel.admin],
    );

    if (authentication instanceof NextResponse) {
      return authentication;
    }

    const business = await prisma.business.findUnique({
      where: {
        id: businessId,
      },
      select: {
        id: true,
        imageKey: true,
        originalImageKey: true,
      },
    });

    if (!business) {
      return NextResponse.json(
        { error: "Business could not be found" },
        { status: 404 },
      );
    }

    if (!business.imageKey && !business.originalImageKey) {
      return NextResponse.json(
        { error: "This business does not have an image" },
        { status: 404 },
      );
    }

    const oldImageKey = business.imageKey;
    const oldOriginalImageKey = business.originalImageKey;

    const updatedBusiness = await prisma.business.update({
      where: {
        id: businessId,
      },
      data: {
        imageKey: null,
        originalImageKey: null,
      },
      select: {
        id: true,
        imageKey: true,
        originalImageKey: true,
        updatedAt: true,
      },
    });

    try {
      const deleteRequests: Promise<void>[] = [];

      if (oldImageKey) {
        deleteRequests.push(deleteObject(oldImageKey));
      }

      if (oldOriginalImageKey) {
        deleteRequests.push(deleteObject(oldOriginalImageKey));
      }

      await Promise.all(deleteRequests);
    } catch (error) {
      /*
       * Restore both database references if S3 cleanup failed.
       */
      try {
        await prisma.business.update({
          where: {
            id: businessId,
          },
          data: {
            imageKey: oldImageKey,
            originalImageKey: oldOriginalImageKey,
          },
        });
      } catch (rollbackError) {
        console.error(
          "Failed to restore business image keys after S3 deletion failure:",
          rollbackError,
        );
      }

      throw error;
    }

    return NextResponse.json(
      {
        message: "Business image deleted successfully",
        business: updatedBusiness,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to delete business image:", error);

    return NextResponse.json(
      { error: "Failed to delete business image" },
      { status: 500 },
    );
  }
}
