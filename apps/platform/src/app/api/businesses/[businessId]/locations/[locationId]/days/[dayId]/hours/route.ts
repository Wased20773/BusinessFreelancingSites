import {
  checkTimeOverlap,
  normalizeTime,
  timeToMinutes,
  validateBusinessLocationParams,
} from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// POST /api/businesses/[businessId]/locations/[locationId]/days/[dayId]/hours
export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      businessId: string;
      locationId: string;
      dayId: string;
    }>;
  },
): Promise<NextResponse> {
  try {
    const { businessId, locationId, dayId } = await params;
    const paramsError = validateBusinessLocationParams(businessId, locationId);

    if (paramsError) return paramsError;

    if (!dayId) {
      return NextResponse.json({ error: "Missing dayId" }, { status: 400 });
    }

    const authResult = await authenticateBusinessAccess(request, businessId, [
      AccessLevel.owner,
      AccessLevel.admin,
    ]);

    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();

    if (!body.openTime || !body.closeTime) {
      return NextResponse.json(
        { error: "Both open and close time must be provided" },
        { status: 400 },
      );
    }

    if (typeof body.isSpecial !== "boolean") {
      return NextResponse.json(
        { error: "Hour type must be provided" },
        { status: 400 },
      );
    }

    if (typeof body.isSynced !== "boolean") {
      return NextResponse.json(
        { error: "Synchronization setting was not found" },
        { status: 400 },
      );
    }

    const openTime = normalizeTime(body.openTime);
    const closeTime = normalizeTime(body.closeTime);

    if (timeToMinutes(openTime) >= timeToMinutes(closeTime)) {
      return NextResponse.json(
        { error: "Open time must be earlier than close time" },
        { status: 400 },
      );
    }

    /*
     * Get the selected parent day.
     *
     * Its syncGroupId tells us which equivalent days
     * exist at the other locations.
     */
    const day = await prisma.locationDay.findFirst({
      where: {
        id: dayId,
        locationId,
      },
      select: {
        id: true,
        syncGroupId: true,

        hour: {
          select: {
            id: true,
          },
        },

        specialHours: {
          select: {
            id: true,
            openTime: true,
            closeTime: true,
          },
        },
      },
    });

    if (!day) {
      return NextResponse.json(
        { error: "This location day does not exist in our records" },
        { status: 400 },
      );
    }

    /*
     * #############################
     * ##### SINGLE LOCATION #######
     * #############################
     */

    if (!body.isSynced) {
      // Regular Hour
      if (!body.isSpecial) {
        if (day.hour) {
          return NextResponse.json(
            { error: "Regular hours already exist for this day" },
            { status: 409 },
          );
        }

        const hour = await prisma.hour.create({
          data: {
            regularDayId: day.id,
            openTime,
            closeTime,
            title: body.title,
            note: body.note,
            syncGroupId: null,
            isSynced: false,
          },
          select: {
            id: true,
            regularDayId: true,
            specialDayId: true,
            openTime: true,
            closeTime: true,
            title: true,
            note: true,
            isDisabled: true,
            syncGroupId: true,
            isSynced: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        return NextResponse.json(hour, { status: 201 });
      }

      // Special Hour
      const conflictingHour = day.specialHours.find((hour) =>
        checkTimeOverlap(openTime, closeTime, hour.openTime, hour.closeTime),
      );

      if (conflictingHour) {
        return NextResponse.json(
          {
            error: `The selected time conflicts with the existing hours ${conflictingHour.openTime} - ${conflictingHour.closeTime}`,
          },
          { status: 409 },
        );
      }

      const hour = await prisma.hour.create({
        data: {
          specialDayId: day.id,
          openTime,
          closeTime,
          title: body.title,
          note: body.note,
          syncGroupId: null,
          isSynced: false,
        },
        select: {
          id: true,
          regularDayId: true,
          specialDayId: true,
          openTime: true,
          closeTime: true,
          title: true,
          note: true,
          isDisabled: true,
          syncGroupId: true,
          isSynced: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return NextResponse.json(hour, { status: 201 });
    }

    /*
     * #############################
     * ##### SYNCHRONIZED ##########
     * #############################
     */

    if (!day.syncGroupId) {
      return NextResponse.json(
        {
          error: "This location day does not belong to a synchronization group",
        },
        { status: 400 },
      );
    }

    /*
     * Find every corresponding synced day.
     *
     * Always include the selected day itself in case
     * its stored isSynced value is currently false.
     */
    const syncedDays = await prisma.locationDay.findMany({
      where: {
        syncGroupId: day.syncGroupId,

        OR: [{ isSynced: true }, { id: day.id }],
      },
      select: {
        id: true,

        hour: {
          select: {
            id: true,
          },
        },

        specialHours: {
          select: {
            id: true,
            openTime: true,
            closeTime: true,
          },
        },
      },
    });

    /*
     * Regular Hours:
     * every participating day must be free because
     * each day may only have one regular Hour.
     */
    if (!body.isSpecial) {
      const dayWithRegularHour = syncedDays.find(
        (selectedDay) => selectedDay.hour,
      );

      if (dayWithRegularHour) {
        return NextResponse.json(
          {
            error:
              "Regular hours already exist for one or more synchronized days",
          },
          { status: 409 },
        );
      }
    }

    /*
     * Special Hours:
     * check every participating parent day for overlap
     * before creating anything.
     */
    if (body.isSpecial) {
      for (const selectedDay of syncedDays) {
        const conflictingHour = selectedDay.specialHours.find((hour) =>
          checkTimeOverlap(openTime, closeTime, hour.openTime, hour.closeTime),
        );

        if (conflictingHour) {
          return NextResponse.json(
            {
              error: `The selected time conflicts with existing special hours ${conflictingHour.openTime} - ${conflictingHour.closeTime}`,
            },
            { status: 409 },
          );
        }
      }
    }

    /*
     * One Hour synchronization group for this logical
     * regular/special hour across all participating days.
     */
    const syncGroupId = crypto.randomUUID();

    const createdHours = await prisma.hour.createMany({
      data: syncedDays.map((selectedDay) => ({
        regularDayId: body.isSpecial ? null : selectedDay.id,
        specialDayId: body.isSpecial ? selectedDay.id : null,
        openTime,
        closeTime,
        title: body.title,
        note: body.note,
        syncGroupId,
        isSynced: true,
      })),
    });

    return NextResponse.json(
      {
        message: "Synchronized hours created successfully",
        count: createdHours.count,
        syncGroupId,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create location hours:", error);

    return NextResponse.json(
      { error: "Failed to create location hours" },
      { status: 500 },
    );
  }
}
