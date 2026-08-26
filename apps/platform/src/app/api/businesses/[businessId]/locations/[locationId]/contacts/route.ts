import { validateBusinessLocationParams } from "@/app/api/route_helper";
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

    if (paramsError) {
      return paramsError;
    }

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

    if (typeof body.isSynced !== "boolean") {
      return NextResponse.json(
        {
          error: "Synchronization setting was not found",
        },
        { status: 400 },
      );
    }

    if (body.isSynced === true) {
      /*
       * Get every location belonging to this business.
       */
      const locations = await prisma.location.findMany({
        where: {
          businessId: businessId,
        },
        select: {
          id: true,
        },
      });

      if (locations.length === 0) {
        return NextResponse.json(
          {
            error: "No locations were found for this business",
          },
          { status: 400 },
        );
      }

      /*
       * Generate ONE synchronization ID.
       *
       * Every created contact receives this exact same ID,
       * allowing future PATCH/DELETE operations to find them
       * as one synchronized group.
       */
      const syncGroupId = crypto.randomUUID();

      const contacts = await prisma.contact.createMany({
        data: locations.map((location) => ({
          locationId: location.id,
          phoneNumber: body.phoneNumber,
          email: body.email,
          isPersonal: body.isPersonal ?? false,
          syncGroupId: syncGroupId,
          isSynced: true,
        })),
      });

      return NextResponse.json(
        {
          message: "Synchronized contacts created successfully",
          count: contacts.count,
          syncGroupId: syncGroupId,
        },
        { status: 201 },
      );
    }

    const contact = await prisma.contact.create({
      data: {
        locationId: locationId,
        phoneNumber: body.phoneNumber,
        email: body.email,
        isPersonal: body.isPersonal ?? false,
        syncGroupId: null,
        isSynced: false,
      },
      select: {
        id: true,
        locationId: true,
        phoneNumber: true,
        email: true,
        isPersonal: true,
        syncGroupId: true,
        isSynced: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error("Failed to create contact:", error);

    return NextResponse.json(
      { error: "Failed to create contact" },
      { status: 500 },
    );
  }
}
