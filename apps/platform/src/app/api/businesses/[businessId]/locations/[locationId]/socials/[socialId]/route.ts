import {
  createSocialUrl,
  deleteSyncedResource,
  updateSyncedResource,
  isUniqueConstraintError,
  validateBusinessLocationParams,
  verifyLocationInBusiness,
} from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// PATCH /api/businesses/[businessId]/locations/[locationId]/socials/[socialId]
export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      businessId: string;
      locationId: string;
      socialId: string;
    }>;
  },
): Promise<NextResponse> {
  try {
    const { businessId, locationId, socialId } = await params;
    const paramsError = validateBusinessLocationParams(businessId, locationId);

    if (paramsError) return paramsError;

    if (!socialId) {
      return NextResponse.json({ error: "Missing socialId" }, { status: 400 });
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

    if (!body.domain || !body.profileName) {
      return NextResponse.json(
        { error: "A social must include a domain and profile name" },
        { status: 400 },
      );
    }

    if (!body.icon) {
      return NextResponse.json(
        { error: "Social is missing an icon" },
        { status: 400 },
      );
    }

    const url = createSocialUrl(body.domain, body.profileName);

    return await updateSyncedResource({
      body,
      model: prisma.social,
      resourceName: "social",
      id: socialId,
      locationId,
      data: {
        domain: body.domain,
        profileName: body.profileName,
        url: url,
        icon: body.icon,
      },
      select: {
        id: true,
        domain: true,
        profileName: true,
        url: true,
        icon: true,
        syncGroupId: true,
        isSynced: true,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { error: "This social profile already exists in this location" },
        { status: 409 },
      );
    }

    console.error("Failed to update social:", error);

    return NextResponse.json(
      { error: "Failed to update social" },
      { status: 500 },
    );
  }
}

// DELETE /api/businesses/[businessId]/locations/[locationId]/socials/[socialId]
export async function DELETE(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      businessId: string;
      locationId: string;
      socialId: string;
    }>;
  },
): Promise<NextResponse> {
  try {
    const { businessId, locationId, socialId } = await params;
    const paramsError = validateBusinessLocationParams(businessId, locationId);

    if (paramsError) return paramsError;

    if (!socialId) {
      return NextResponse.json({ error: "Missing socialId" }, { status: 400 });
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

    return await deleteSyncedResource({
      body,
      model: prisma.social,
      resourceName: "social",
      id: socialId,
      locationId,
    });
  } catch (error) {
    console.error("Failed to delete social:", error);

    return NextResponse.json(
      { error: "Failed to delete social" },
      { status: 500 },
    );
  }
}
