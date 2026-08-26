import {
  deleteSyncedResource,
  updateSyncedResource,
  validateBusinessLocationParams,
} from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// PATCH /api/businesses/[businessId]/locations/[locationId]/contacts/[contactId]
export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      businessId: string;
      locationId: string;
      contactId: string;
    }>;
  },
): Promise<NextResponse> {
  try {
    const { businessId, locationId, contactId } = await params;
    const paramsError = validateBusinessLocationParams(businessId, locationId);

    if (paramsError) {
      return paramsError;
    }

    if (!contactId) {
      return NextResponse.json({ error: "Missing contactId" }, { status: 400 });
    }

    const authResult = await authenticateBusinessAccess(request, businessId, [
      AccessLevel.owner,
      AccessLevel.admin,
    ]);

    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();

    return await updateSyncedResource({
      body,
      model: prisma.contact,
      resourceName: "contact",
      id: contactId,
      locationId,
      updateManyData: {
        phoneNumber: body.phoneNumber,
        email: body.email,
        isPersonal: body.isPersonal,
        isSynced: true,
      },
      updateSingleData: {
        phoneNumber: body.phoneNumber,
        email: body.email,
        isPersonal: body.isPersonal,
        isSynced: body.isSynced,
      },
      select: {
        id: true,
        locationId: true,
        phoneNumber: true,
        email: true,
        isPersonal: true,
        syncGroupId: true,
        isSynced: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    console.error("Failed to update contact:", error);

    return NextResponse.json(
      { error: "Failed to update contact" },
      { status: 500 },
    );
  }
}

// DELETE /api/businesses/[businessId]/locations/[locationId]/contacts/[contactId]
export async function DELETE(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      businessId: string;
      locationId: string;
      contactId: string;
    }>;
  },
): Promise<NextResponse> {
  try {
    const { businessId, locationId, contactId } = await params;
    const paramsError = validateBusinessLocationParams(businessId, locationId);

    if (paramsError) {
      return paramsError;
    }

    if (!contactId) {
      return NextResponse.json({ error: "Missing contactId" }, { status: 400 });
    }

    const authResult = await authenticateBusinessAccess(request, businessId, [
      AccessLevel.owner,
      AccessLevel.admin,
    ]);

    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();

    return await deleteSyncedResource({
      body,
      model: prisma.contact,
      resourceName: "contact",
      id: contactId,
      locationId,
    });
  } catch (error) {
    console.error("Failed to delete contact:", error);

    return NextResponse.json(
      { error: "Failed to delete contact" },
      { status: 500 },
    );
  }
}
