import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";
import {
  createSocialUrl,
  createSyncedResource,
  isUniqueConstraintError,
  validateBusinessLocationParams,
  verifyLocationInBusiness,
} from "@/app/api/route_helper";

// POST /api/businesses/[businessId]/locations/[locationId]/socials
export async function POST(
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

    const locationError = await verifyLocationInBusiness(
      businessId,
      locationId,
    );

    if (locationError) return locationError;

    const body = await request.json();

    if (!body.domain) {
      return NextResponse.json(
        { error: "Missing Domain Name" },
        { status: 400 },
      );
    }

    if (!body.profileName) {
      return NextResponse.json(
        { error: "Missing social profile name" },
        { status: 400 },
      );
    }

    const url = createSocialUrl(body.domain, body.profileName);

    if (!body.icon) {
      return NextResponse.json(
        { error: "Missing social icon" },
        { status: 400 },
      );
    }

    return await createSyncedResource({
      body,
      model: prisma.social,
      resourceName: "social",
      businessId,
      locationId,
      data: {
        domain: body.domain,
        profileName: body.profileName,
        url: url,
        icon: body.icon,
      },
      select: {
        id: true,
        locationId: true,
        domain: true,
        profileName: true,
        url: true,
        icon: true,
        isSynced: true,
        syncGroupId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        { error: "This social profile already exists in this location" },
        { status: 409 },
      );
    }

    console.error("Failed to create social:", error);

    return NextResponse.json(
      { error: "Failed to create social" },
      { status: 500 },
    );
  }
}
