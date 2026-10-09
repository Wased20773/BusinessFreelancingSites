import {
  isUniqueConstraintError,
  optionalString,
  validateBusinessLocationParams,
} from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { deleteObject } from "@/lib/s3/delete";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// PATCH /api/businesses/[businessId]/locations/[locationId]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ businessId: string; locationId: string }> },
): Promise<NextResponse> {
  try {
    const { businessId, locationId } = await params;
    const paramsError = validateBusinessLocationParams(businessId, locationId);

    if (paramsError) return paramsError;

    const authResult = await authenticateBusinessAccess(request, businessId, [
      AccessLevel.owner,
      AccessLevel.admin,
    ]);

    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();

    /*
     * Only fields present in the body are updated.
     * Send null or "" to clear an optional text field.
     */
    const updateData: {
      address?: string;
      zip?: string | null;
      country?: string | null;
      state?: string | null;
      city?: string | null;
      parking?: boolean;
      isActive?: boolean;
      enableHours?: boolean;
    } = {};

    if (body.address !== undefined) {
      const address = optionalString(body.address);

      if (!address) {
        return NextResponse.json(
          { error: "A location address is required" },
          { status: 400 },
        );
      }

      updateData.address = address;
    }

    for (const field of ["zip", "country", "state", "city"] as const) {
      if (body[field] !== undefined) {
        updateData[field] = optionalString(body[field]);
      }
    }

    for (const field of ["parking", "isActive", "enableHours"] as const) {
      if (body[field] !== undefined) {
        if (typeof body[field] !== "boolean") {
          return NextResponse.json(
            { error: `${field} must be a boolean` },
            { status: 400 },
          );
        }

        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No supported fields were provided" },
        { status: 400 },
      );
    }

    /*
     * Make sure this location actually belongs
     * to the selected business.
     */
    const location = await prisma.location.findFirst({
      where: {
        id: locationId,
        businessId,
      },
      select: {
        id: true,
      },
    });

    if (!location) {
      return NextResponse.json(
        { error: "This location does not exist in our records" },
        { status: 404 },
      );
    }

    /*
     * Location itself is NOT synchronized.
     *
     * Every change here applies only to this
     * individual physical location.
     */
    const updatedLocation = await prisma.location.update({
      where: {
        id: location.id,
      },
      data: updateData,
      select: {
        id: true,
        address: true,
        zip: true,
        country: true,
        state: true,
        city: true,
        parking: true,
        isActive: true,
        enableHours: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updatedLocation, {
      status: 200,
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        {
          error:
            "A location with this address already exists for this business",
        },
        { status: 409 },
      );
    }

    console.error("Failed to update location:", error);

    return NextResponse.json(
      { error: "Failed to update location" },
      { status: 500 },
    );
  }
}

// DELETE /api/businesses/[businessId]/locations/[locationId]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ businessId: string; locationId: string }> },
): Promise<NextResponse> {
  try {
    const { businessId, locationId } = await params;
    const paramsError = validateBusinessLocationParams(businessId, locationId);

    if (paramsError) return paramsError;

    const authResult = await authenticateBusinessAccess(request, businessId, [
      AccessLevel.owner,
      AccessLevel.admin,
    ]);

    if (authResult instanceof NextResponse) return authResult;

    /*
     * Verify ownership before deleting.
     */
    const location = await prisma.location.findFirst({
      where: {
        id: locationId,
        businessId,
      },
      select: {
        id: true,
        items: {
          select: {
            imageKey: true,
            originalImageKey: true,
          },
        },
      },
    });

    if (!location) {
      return NextResponse.json(
        { error: "This location does not exist in our records" },
        { status: 404 },
      );
    }

    const imageKeys = [
      ...new Set(
        location.items
          .flatMap((item) => [item.imageKey, item.originalImageKey])
          .filter((imageKey): imageKey is string => imageKey !== null),
      ),
    ];

    /*
     * This deletes only this physical location.
     *
     * Location-owned records will follow their
     * configured cascade behavior.
     */
    await prisma.location.delete({
      where: {
        id: location.id,
      },
    });

    /*
     * The cascade removes the Item records but not their S3 objects.
     *
     * Synced items at other locations can share the same image,
     * so only delete objects nothing else points to anymore.
     */
    if (imageKeys.length > 0) {
      const remainingImageReferences = await prisma.item.findMany({
        where: {
          OR: [
            { imageKey: { in: imageKeys } },
            { originalImageKey: { in: imageKeys } },
          ],
        },
        select: {
          imageKey: true,
          originalImageKey: true,
        },
      });

      const stillReferencedImageKeys = new Set(
        remainingImageReferences.flatMap((item) => [
          item.imageKey,
          item.originalImageKey,
        ]),
      );

      for (const imageKey of imageKeys) {
        if (stillReferencedImageKeys.has(imageKey)) continue;

        try {
          await deleteObject(imageKey);
        } catch (cleanupError) {
          console.error(
            `Failed to clean up deleted location's item image "${imageKey}":`,
            cleanupError,
          );
        }
      }
    }

    return NextResponse.json(
      { message: "Location deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to delete location:", error);

    return NextResponse.json(
      { error: "Failed to delete location" },
      { status: 500 },
    );
  }
}
