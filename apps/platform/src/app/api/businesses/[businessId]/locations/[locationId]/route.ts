import { validateBusinessLocationParams } from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
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

    if (typeof body.address !== "string" || body.address.trim() === "") {
      return NextResponse.json(
        { error: "A location address is required" },
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
      data: {
        address: body.address.trim(),

        zip:
          typeof body.zip === "string" && body.zip.trim()
            ? body.zip.trim()
            : null,

        country:
          typeof body.country === "string" && body.country.trim()
            ? body.country.trim()
            : null,

        state:
          typeof body.state === "string" && body.state.trim()
            ? body.state.trim()
            : null,

        city:
          typeof body.city === "string" && body.city.trim()
            ? body.city.trim()
            : null,

        parking: typeof body.parking === "boolean" ? body.parking : false,

        isActive: typeof body.isActive === "boolean" ? body.isActive : true,

        enableHours:
          typeof body.enableHours === "boolean" ? body.enableHours : false,
      },
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
      },
    });

    if (!location) {
      return NextResponse.json(
        { error: "This location does not exist in our records" },
        { status: 404 },
      );
    }

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
