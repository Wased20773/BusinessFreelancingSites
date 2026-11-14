import {
  createDomainSlug,
  isUniqueConstraintError,
} from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { cancelSubscriptionForDeletedBusiness } from "@/lib/billing/cancelSubscription";
import { prisma } from "@/lib/prisma";
import { getObjectUrl } from "@/lib/s3/get-url";
import { deleteObjects } from "@/lib/s3/delete";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// GET /api/businesses/[businessId]
export async function GET(
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
      [
        AccessLevel.owner,
        AccessLevel.admin,
        AccessLevel.staff,
        AccessLevel.developer,
      ],
    );

    if (authentication instanceof NextResponse) {
      return authentication;
    }

    const { userId } = authentication;

    /*
     * BusinessUser is exactly what we want here because
     * this endpoint represents the current User's
     * relationship with this specific Business.
     */
    const businessUser = await prisma.businessUser.findFirst({
      where: {
        businessId,
        userId,
      },
      select: {
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            domain: true,
            imageKey: true,
            originalImageKey: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        role: {
          select: {
            accessLevel: true,
            description: true,
          },
        },
      },
    });

    if (!businessUser) {
      return NextResponse.json(
        { error: "Business could not be found" },
        { status: 404 },
      );
    }

    const imageUrl = businessUser.business.imageKey
      ? await getObjectUrl(businessUser.business.imageKey)
      : null;

    const originalImageUrl = businessUser.business.originalImageKey
      ? await getObjectUrl(businessUser.business.originalImageKey)
      : null;

    return NextResponse.json(
      {
        ...businessUser.business,
        imageKey: imageUrl,
        originalImageKey: originalImageUrl,
        role: businessUser.role,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to fetch business:", error);

    return NextResponse.json(
      { error: "Failed to fetch business" },
      { status: 500 },
    );
  }
}

// PATCH /api/businesses/[businessId]
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

    const body = await request.json();

    const updateData: {
      name?: string;
      domain?: string;
    } = {};

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json(
          { error: "Business name is required" },
          { status: 400 },
        );
      }

      updateData.name = body.name.trim();
    }

    if (body.domain !== undefined) {
      if (typeof body.domain !== "string" || !body.domain.trim()) {
        return NextResponse.json(
          { error: "Business domain is required" },
          { status: 400 },
        );
      }

      updateData.domain = createDomainSlug(body.domain.trim());
    }

    if (body.name === undefined && body.domain === undefined) {
      return NextResponse.json(
        { error: "No supported fields were provided" },
        { status: 400 },
      );
    }

    const business = await prisma.business.update({
      where: {
        id: businessId,
      },
      data: updateData,
      select: {
        id: true,
        name: true,
        slug: true,
        domain: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(business, { status: 200 });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { error: "This domain is already used by another business" },
        { status: 409 },
      );
    }

    console.error("Failed to update business:", error);

    return NextResponse.json(
      { error: "Failed to update business" },
      { status: 500 },
    );
  }
}

// DELETE /api/businesses/[businessId]
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
      [AccessLevel.owner],
    );

    if (authentication instanceof NextResponse) {
      return authentication;
    }

    const body = (await request.json().catch(() => ({}))) as {
      confirmName?: unknown;
    };

    if (typeof body.confirmName !== "string" || !body.confirmName.trim()) {
      return NextResponse.json(
        { error: "Type the business name to confirm the deletion" },
        { status: 400 },
      );
    }

    /*
     * Collect every image key before deleting. The cascade removes the
     * records that hold them, but not the objects in S3.
     */
    const business = await prisma.business.findUnique({
      where: {
        id: businessId,
      },
      select: {
        id: true,
        name: true,
        imageKey: true,
        originalImageKey: true,
        locations: {
          select: {
            items: {
              select: {
                imageKey: true,
                originalImageKey: true,
              },
            },
          },
        },
      },
    });

    if (!business) {
      return NextResponse.json(
        { error: "Business could not be found" },
        { status: 404 },
      );
    }

    if (body.confirmName.trim() !== business.name.trim()) {
      return NextResponse.json(
        { error: "The business name does not match" },
        { status: 400 },
      );
    }

    /*
     * Cancel the subscription first, so a deleted business can never keep
     * being charged. If Stripe fails, this throws and nothing is deleted.
     */
    await cancelSubscriptionForDeletedBusiness(business.id);

    /*
     * Deletes the business and, through the configured cascades, its
     * memberships, API keys, and locations along with everything inside them
     * (days, hours, categories, items, options, contacts, socials).
     */
    await prisma.business.delete({
      where: {
        id: business.id,
      },
    });

    /*
     * Best-effort image cleanup. The business is already gone, so a failure
     * here is logged rather than reported to the user. Item images are only
     * shared between this business's own locations, so every key is safe to
     * remove.
     */
    const imageKeys = [
      business.imageKey,
      business.originalImageKey,
      ...business.locations.flatMap((location) =>
        location.items.flatMap((item) => [
          item.imageKey,
          item.originalImageKey,
        ]),
      ),
    ].filter((imageKey): imageKey is string => imageKey !== null);

    if (imageKeys.length > 0) {
      try {
        const failedKeys = await deleteObjects(imageKeys);

        if (failedKeys.length > 0) {
          console.error(
            `Failed to clean up ${failedKeys.length} image(s) of deleted business "${business.id}":`,
            failedKeys,
          );
        }
      } catch (cleanupError) {
        console.error(
          `Failed to clean up images of deleted business "${business.id}":`,
          cleanupError,
        );
      }
    }

    return NextResponse.json(
      { message: "Business deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to delete business:", error);

    return NextResponse.json(
      { error: "Failed to delete business" },
      { status: 500 },
    );
  }
}
