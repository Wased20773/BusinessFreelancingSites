import { normalizeDayOfWeek } from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// POST /api/admin/locations/[locationId]/days
export async function POST(
  request: Request,
  { params }: { params: Promise<{ locationId: string }> },
): Promise<NextResponse> {
  try {
    const authResult = await authenticateBusinessAccess(request, [
      AccessLevel.owner,
      AccessLevel.admin,
    ]);

    if (authResult instanceof NextResponse) return authResult;

    const { businessId } = authResult;
    const { locationId } = await params;
    const body = await request.json();

    if (!locationId) {
      return NextResponse.json(
        { error: "Missing locationId" },
        { status: 400 },
      );
    }

    // A complete weekly schedule must contain all 7 days.
    if (!Array.isArray(body.days) || body.days.length !== 7) {
      return NextResponse.json(
        { error: "All 7 days of the week must be provided" },
        { status: 400 },
      );
    }

    // Validate and normalize every supplied day.
    const normalizedDays = [];

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

    // Make sure this location belongs to the authenticated business.
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
        {
          error: "This location does not exist in our records",
        },
        { status: 404 },
      );
    }

    // Create all 7 days in a single batch operation.
    const createdDays = await prisma.locationDay.createMany({
      data: normalizedDays.map((day) => ({
        locationId: location.id,
        dayOfWeek: day.dayOfWeek,
        isClosed: day.isClosed,
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

// DELETE /api/admin/locations/[locationId]/days
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ locationId: string }> },
): Promise<NextResponse> {
  try {
    const authResult = await authenticateBusinessAccess(request, [
      AccessLevel.owner,
      AccessLevel.admin,
    ]);

    if (authResult instanceof NextResponse) return authResult;

    const { businessId } = authResult;
    const { locationId } = await params;

    if (!locationId) {
      return NextResponse.json(
        { error: "Missing locationId" },
        { status: 400 },
      );
    }

    // Make sure this location belongs to the authenticated business.
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
        {
          error: "This location does not exist in our records",
        },
        { status: 404 },
      );
    }

    // Delete all business days for this location in one operation.
    const deletedDays = await prisma.locationDay.deleteMany({
      where: {
        locationId: location.id,
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
