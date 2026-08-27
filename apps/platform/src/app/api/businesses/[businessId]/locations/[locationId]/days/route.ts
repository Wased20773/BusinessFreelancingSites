import {
  normalizeDayOfWeek,
  validateBusinessLocationParams,
} from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel, DayOfWeek } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// POST /api/businesses/[businessId]/locations/[locationId]/days
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

    // A complete weekly schedule must contain all 7 days.
    if (!Array.isArray(body.days) || body.days.length !== 7) {
      return NextResponse.json(
        { error: "All 7 days of the week must be provided" },
        { status: 400 },
      );
    }

    // Validate and normalize every supplied day.
    const normalizedDays: { dayOfWeek: DayOfWeek; isClosed: boolean }[] = [];

    for (const day of body.days) {
      if (!day.dayOfWeek) {
        return NextResponse.json(
          { error: "Each day must include a day of the week" },
          { status: 400 },
        );
      }

      const dayOfWeek = normalizeDayOfWeek(day.dayOfWeek);

      if (!dayOfWeek) {
        return NextResponse.json(
          { error: `Invalid day of the week: ${day.dayOfWeek}` },
          { status: 400 },
        );
      }

      normalizedDays.push({
        dayOfWeek,
        isClosed: typeof day.isClosed === "boolean" ? day.isClosed : false,
      });
    }

    // Ensure the same day was not supplied more than once.
    const uniqueDays = new Set(normalizedDays.map((day) => day.dayOfWeek));

    if (uniqueDays.size !== 7) {
      return NextResponse.json(
        {
          error: "Each day of the week must be provided exactly once",
        },
        { status: 400 },
      );
    }

    /*
     * If synchronization is ON, create the full week
     * for every location in this business.
     *
     * Each weekday gets its own synchronization group.
     *
     * Example:
     * Monday  -> same syncGroupId across all locations
     * Tuesday -> different syncGroupId across all locations
     * etc.
     */
    if (body.isSynced === true) {
      const locations = await prisma.location.findMany({
        where: {
          businessId,

          days: {
            none: {},
          },
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

      const daySyncGroups = new Map(
        normalizedDays.map((day) => [day.dayOfWeek, crypto.randomUUID()]),
      );

      // Create all 7 days in a single batch operation with their
      // individual syncGroupId's.
      const createdDays = await prisma.locationDay.createMany({
        data: locations.flatMap((location) =>
          normalizedDays.map((day) => ({
            locationId: location.id,
            dayOfWeek: day.dayOfWeek,
            isClosed: day.isClosed,
            syncGroupId: daySyncGroups.get(day.dayOfWeek),
          })),
        ),
      });

      return NextResponse.json(
        {
          message: "Synchronized location days created successfully",
          count: createdDays.count,
        },
        { status: 201 },
      );
    }

    /*
     * Synchronization is OFF:
     * only create the 7 days for the selected location.
     */
    const createdDays = await prisma.locationDay.createMany({
      data: normalizedDays.map((day) => ({
        locationId,
        dayOfWeek: day.dayOfWeek,
        isClosed: day.isClosed,
        syncGroupId: null,
        isSynced: false,
      })),
    });

    return NextResponse.json(
      {
        message: "Location days created successfully",
        count: createdDays.count,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create location days:", error);

    return NextResponse.json(
      { error: "Failed to create location days" },
      { status: 500 },
    );
  }
}

// DELETE /api/businesses/[businessId]/locations/[locationId]/days
export async function DELETE(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      businessId: string;
      locationId: string;
    }>;
  },
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
     * This route deletes the complete schedule for only
     * the currently selected location.
     */
    const deletedDays = await prisma.locationDay.deleteMany({
      where: {
        locationId,
      },
    });

    return NextResponse.json(
      {
        message: "Location days removed successfully",
        count: deletedDays.count,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to remove location days:", error);

    return NextResponse.json(
      { error: "Failed to remove location days" },
      { status: 500 },
    );
  }
}
