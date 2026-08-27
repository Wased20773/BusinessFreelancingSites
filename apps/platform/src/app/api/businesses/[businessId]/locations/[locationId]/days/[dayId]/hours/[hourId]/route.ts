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

// PATCH /api/businesses/[businessId]/locations/[locationId]/days/[dayId]/hours/[hourId]
export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      businessId: string;
      locationId: string;
      dayId: string;
      hourId: string;
    }>;
  },
): Promise<NextResponse> {
  try {
    const { businessId, locationId, dayId, hourId } = await params;
    const paramsError = validateBusinessLocationParams(businessId, locationId);

    if (paramsError) return paramsError;

    if (!dayId) {
      return NextResponse.json({ error: "Missing dayId" }, { status: 400 });
    }

    if (!hourId) {
      return NextResponse.json({ error: "Missing hourId" }, { status: 400 });
    }

    const authResult = await authenticateBusinessAccess(request, businessId, [
      AccessLevel.owner,
      AccessLevel.admin,
    ]);

    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();

    if (typeof body.isSynced !== "boolean") {
      return NextResponse.json(
        { error: "Synchronization setting was not found" },
        { status: 400 },
      );
    }

    /*
     * Find the selected Hour and make sure it belongs
     * to the selected LocationDay.
     */
    const existingHour = await prisma.hour.findFirst({
      where: {
        id: hourId,

        OR: [
          {
            regularDayId: dayId,
            regularDay: { locationId },
          },
          {
            specialDayId: dayId,
            specialDay: { locationId },
          },
        ],
      },
      select: {
        id: true,
        regularDayId: true,
        specialDayId: true,
        openTime: true,
        closeTime: true,
        syncGroupId: true,
        isSynced: true,
      },
    });

    if (!existingHour) {
      return NextResponse.json(
        { error: "This location hour does not exist in our records" },
        { status: 400 },
      );
    }

    const updatedOpenTime = normalizeTime(
      body.openTime ?? existingHour.openTime,
    );

    const updatedCloseTime = normalizeTime(
      body.closeTime ?? existingHour.closeTime,
    );

    if (timeToMinutes(updatedOpenTime) >= timeToMinutes(updatedCloseTime)) {
      return NextResponse.json(
        { error: "Open time must be earlier than close time" },
        { status: 400 },
      );
    }

    /*
     * #############################
     * ##### SINGLE UPDATE #########
     * #############################
     */

    if (!body.isSynced || !existingHour.syncGroupId) {
      /*
       * Only special hours need overlap validation.
       */
      if (existingHour.specialDayId) {
        const otherSpecialHours = await prisma.hour.findMany({
          where: {
            specialDayId: existingHour.specialDayId,

            id: {
              not: existingHour.id,
            },
          },
          select: {
            openTime: true,
            closeTime: true,
          },
        });

        const conflictingHour = otherSpecialHours.find((hour) =>
          checkTimeOverlap(
            updatedOpenTime,
            updatedCloseTime,
            hour.openTime,
            hour.closeTime,
          ),
        );

        if (conflictingHour) {
          return NextResponse.json(
            {
              error: `The selected time conflicts with the existing special hours ${conflictingHour.openTime} - ${conflictingHour.closeTime}`,
            },
            { status: 409 },
          );
        }
      }

      const updatedHour = await prisma.hour.update({
        where: {
          id: existingHour.id,
        },
        data: {
          openTime: updatedOpenTime,
          closeTime: updatedCloseTime,
          title: body.title,
          note: body.note,
          isDisabled: body.isDisabled,
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
          updatedAt: true,
        },
      });

      return NextResponse.json(updatedHour, { status: 200 });
    }

    /*
     * #############################
     * ##### SYNCED UPDATE #########
     * #############################
     */

    const syncedHours = await prisma.hour.findMany({
      where: {
        syncGroupId: existingHour.syncGroupId,

        OR: [{ isSynced: true }, { id: existingHour.id }],
      },
      select: {
        id: true,
        specialDayId: true,
      },
    });

    /*
     * When these are special hours, validate the new
     * range against each Hour's own parent day.
     */
    if (existingHour.specialDayId) {
      for (const syncedHour of syncedHours) {
        if (!syncedHour.specialDayId) continue;

        const otherSpecialHours = await prisma.hour.findMany({
          where: {
            specialDayId: syncedHour.specialDayId,

            id: {
              not: syncedHour.id,
            },
          },
          select: {
            openTime: true,
            closeTime: true,
          },
        });

        const conflictingHour = otherSpecialHours.find((hour) =>
          checkTimeOverlap(
            updatedOpenTime,
            updatedCloseTime,
            hour.openTime,
            hour.closeTime,
          ),
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

    await prisma.hour.updateMany({
      where: {
        syncGroupId: existingHour.syncGroupId,

        OR: [{ isSynced: true }, { id: existingHour.id }],
      },
      data: {
        openTime: updatedOpenTime,
        closeTime: updatedCloseTime,
        title: body.title,
        note: body.note,
        isDisabled: body.isDisabled,
        isSynced: true,
      },
    });

    return NextResponse.json(
      { message: "Synchronized hours updated successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to update location hours:", error);

    return NextResponse.json(
      { error: "Failed to update location hours" },
      { status: 500 },
    );
  }
}

// DELETE /api/businesses/[businessId]/locations/[locationId]/days/[dayId]/hours/[hourId]
export async function DELETE(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      businessId: string;
      locationId: string;
      dayId: string;
      hourId: string;
    }>;
  },
): Promise<NextResponse> {
  try {
    const { businessId, locationId, dayId, hourId } = await params;
    const paramsError = validateBusinessLocationParams(businessId, locationId);

    if (paramsError) return paramsError;

    if (!dayId) {
      return NextResponse.json({ error: "Missing dayId" }, { status: 400 });
    }

    if (!hourId) {
      return NextResponse.json({ error: "Missing hourId" }, { status: 400 });
    }

    const authResult = await authenticateBusinessAccess(request, businessId, [
      AccessLevel.owner,
      AccessLevel.admin,
    ]);

    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();

    if (typeof body.deleteAllSynced !== "boolean") {
      return NextResponse.json(
        { error: "Delete synchronization option was not found" },
        { status: 400 },
      );
    }

    const hour = await prisma.hour.findFirst({
      where: {
        id: hourId,

        OR: [
          {
            regularDayId: dayId,
            regularDay: {
              locationId,
            },
          },
          {
            specialDayId: dayId,
            specialDay: {
              locationId,
            },
          },
        ],
      },
      select: {
        id: true,
        syncGroupId: true,
      },
    });

    if (!hour) {
      return NextResponse.json(
        { error: "This location hour does not exist in our records" },
        { status: 400 },
      );
    }

    /*
     * Explicit synchronized delete:
     * remove every currently-synced Hour in this group
     * plus the selected Hour itself.
     */
    if (hour.syncGroupId && body.deleteAllSynced === true) {
      const deletedHours = await prisma.hour.deleteMany({
        where: {
          syncGroupId: hour.syncGroupId,

          OR: [{ isSynced: true }, { id: hour.id }],
        },
      });

      return NextResponse.json(
        {
          message: "Synchronized hours deleted successfully",
          count: deletedHours.count,
        },
        { status: 200 },
      );
    }

    /*
     * Otherwise only delete the selected Hour.
     */
    await prisma.hour.delete({
      where: { id: hour.id },
    });

    return NextResponse.json(
      { message: "Location hour deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to delete location hour:", error);

    return NextResponse.json(
      { error: "Failed to delete location hour" },
      { status: 500 },
    );
  }
}
