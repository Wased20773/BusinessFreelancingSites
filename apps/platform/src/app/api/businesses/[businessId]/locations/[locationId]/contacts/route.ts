import {
  createSyncedResource,
  validateBusinessLocationParams,
} from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// POST /api/businesses/[businessId]/locations/[locationId]/contacts
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

    const body = await request.json();

    if (!body.phoneNumber && !body.email) {
      return NextResponse.json(
        { error: "A contact must include either a phone number or an email" },
        { status: 400 },
      );
    }

    return await createSyncedResource({
      body,
      model: prisma.contact,
      resourceName: "contact",
      businessId,
      locationId,
      data: {
        phoneNumber: body.phoneNumber,
        email: body.email,
        isPersonal: body.isPersonal,
      },
      select: {
        id: true,
        locationId: true,
        phoneNumber: true,
        email: true,
        isPersonal: true,
        syncGroupId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    console.error("Failed to create contact:", error);

    return NextResponse.json(
      { error: "Failed to create contact" },
      { status: 500 },
    );
  }
}
