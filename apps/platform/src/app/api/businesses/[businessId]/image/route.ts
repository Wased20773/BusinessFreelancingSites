import { imageRequestValidation } from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { processImage } from "@/lib/images/process";
import { prisma } from "@/lib/prisma";
import { deleteObject } from "@/lib/s3/delete";
import { generateBusinessImageKey } from "@/lib/s3/keys";
import { uploadImage } from "@/lib/s3/upload";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

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
      },
    });

    if (!business) {
      return NextResponse.json(
        { error: "Business could not be found" },
        { status: 404 },
      );
    }

    if (business.imageKey) {
      return NextResponse.json(
        {
          error:
            "This business already has an image. Please replace the existing image instead",
        },
        { status: 409 },
      );
    }

    const imageResult = await imageRequestValidation(request, false);

    if (imageResult instanceof NextResponse) {
      return imageResult;
    }

    const processedImage = await processImage(imageResult.image);

    const imageKey = generateBusinessImageKey({
      businessId,
      extension: processedImage.extension,
    });

    await uploadImage({
      key: imageKey,
      body: processedImage.buffer,
      contentType: processedImage.contentType,
    });

    try {
      const updatedBusiness = await prisma.business.update({
        where: {
          id: businessId,
        },
        data: {
          imageKey,
        },
        select: {
          id: true,
          imageKey: true,
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
        await deleteObject(imageKey);
      } catch (cleanupError) {
        console.error(
          "Failed to clean up uploaded business image after database failure:",
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

    const imageResult = await imageRequestValidation(request, false);

    if (imageResult instanceof NextResponse) {
      return imageResult;
    }

    const processedImage = await processImage(imageResult.image);

    const newImageKey = generateBusinessImageKey({
      businessId,
      extension: processedImage.extension,
    });

    const oldImageKey = business.imageKey;

    /*
     * Upload the replacement first.
     *
     * If the extension stayed the same this simply overwrites
     * the existing S3 object at the deterministic key.
     *
     * If the extension changed, a new object is created and the
     * old object is deleted after Prisma succeeds.
     */
    await uploadImage({
      key: newImageKey,
      body: processedImage.buffer,
      contentType: processedImage.contentType,
    });

    let updatedBusiness;

    try {
      updatedBusiness = await prisma.business.update({
        where: {
          id: businessId,
        },
        data: {
          imageKey: newImageKey,
        },
        select: {
          id: true,
          imageKey: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      /*
       * Only delete the uploaded object when it was created
       * at a different key.
       *
       * If newImageKey === oldImageKey, deleting it here would
       * remove the replacement image entirely.
       */
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

      throw error;
    }

    /*
     * If processing changed the extension, the Business now
     * points at the new object and the old one is no longer needed.
     */
    if (oldImageKey !== newImageKey) {
      try {
        await deleteObject(oldImageKey);
      } catch (cleanupError) {
        /*
         * Do not fail the successful replacement just because
         * cleanup of the old unused object failed.
         */
        console.error(
          "Failed to delete old business image after replacement:",
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
        { error: "This business does not have an image" },
        { status: 404 },
      );
    }

    const oldImageKey = business.imageKey;

    /*
     * Remove the database reference first.
     */
    const updatedBusiness = await prisma.business.update({
      where: {
        id: businessId,
      },
      data: {
        imageKey: null,
      },
      select: {
        id: true,
        imageKey: true,
        updatedAt: true,
      },
    });

    try {
      /*
       * Now remove the actual S3 object.
       */
      await deleteObject(oldImageKey);
    } catch (error) {
      /*
       * S3 failed, so restore the database reference.
       */
      try {
        await prisma.business.update({
          where: {
            id: businessId,
          },
          data: { imageKey: oldImageKey },
        });
      } catch (rollbackError) {
        console.error(
          "Failed to restore business imageKey after S3 deletion failure:",
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
