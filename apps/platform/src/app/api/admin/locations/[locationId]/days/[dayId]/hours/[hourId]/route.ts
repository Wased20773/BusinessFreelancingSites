import { checkTimeOverlap, timeToMinutes } from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// PATCH /api/admin/locations/[locationId]/days/[dayId]/hours/[hourId]
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ locationId: string; dayId: string; hourId: string }> }
): Promise<NextResponse> {
    try {
        const authResult = await authenticateBusinessAccess(
            request,
            [AccessLevel.owner, AccessLevel.admin]
        );

        if (authResult instanceof NextResponse) return authResult;

        const { businessId } = authResult;
        const { locationId, dayId, hourId } = await params;
        const body = await request.json();

        if (!locationId) {
            return NextResponse.json(
                { error: "Missing locationId" },
                { status: 400 }
            );
        }

        if (!dayId) {
            return NextResponse.json(
                { error: "Missing dayId" },
                { status: 400 }
            );
        }

        if (!hourId) {
            return NextResponse.json(
                { error: "Missing hourId" },
                { status: 400 }
            );
        }

        const existingHour = await prisma.hour.findFirst({
            where: {
                id: hourId,
                locationDayId: dayId,
                locationDay: {
                    locationId: locationId,
                    location: { businessId: businessId },
                },
            },
            select: {
                id: true,
                openTime: true,
                closeTime: true,
            },
        });

        if (!existingHour) {
            return NextResponse.json(
                { error: "This location hour does not exist in our records" },
                { status: 404 }
            );
        }

        const updatedOpenTime = body.openTime ?? existingHour.openTime;
        const updatedCloseTime = body.closeTime ?? existingHour.closeTime;

        if (timeToMinutes(updatedOpenTime) >= timeToMinutes(updatedCloseTime)) {
            return NextResponse.json(
                { error: "Open time must be earlier than close time" },
                { status: 400 }
            );
        }

        const otherHours = await prisma.hour.findMany({
            where: {
                locationDayId: dayId,
                id: {
                    not: hourId,
                },
            },
            select: {
                id: true,
                openTime: true,
                closeTime: true,
            },
        });

        const conflictingHour = otherHours.find((hour) =>
            checkTimeOverlap(
                updatedOpenTime,
                updatedCloseTime,
                hour.openTime,
                hour.closeTime
            )
        );

        if (conflictingHour) {
            return NextResponse.json(
                { error: `The selected time conflicts with the existing hours ${conflictingHour.openTime} - ${conflictingHour.closeTime}` },
                { status: 409 }
            );
        }

        const updatedHour = await prisma.hour.update({
            where: {
                id: hourId,
            },
            data: {
                openTime: updatedOpenTime,
                closeTime: updatedCloseTime,
                title: body.title,
                note: body.note,
                isDisabled: body.isDisabled,
            },
            select: {
                id: true,
                locationDayId: true,
                openTime: true,
                closeTime: true,
                title: true,
                note: true,
                isDisabled: true,
                updatedAt: true,
            }
        });

        return NextResponse.json(updatedHour, { status: 200 });
    } catch (error) {
        console.error("Failed to update location hours:", error);

        return NextResponse.json(
            { error: "Failed to update location hours" },
            { status: 500 }
        );
    }
}

// DELETE /api/admin/locations/[locationId]/days/[dayId]/hours/[hourId]
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ locationId: string; dayId: string; hourId: string }> }
): Promise<NextResponse> {
    try {
        const authResult = await authenticateBusinessAccess(
            request,
            [AccessLevel.owner, AccessLevel.admin]
        );

        if (authResult instanceof NextResponse) return authResult;

        const { businessId } = authResult;
        const { locationId, dayId, hourId } = await params;

        if (!locationId) {
            return NextResponse.json(
                { error: "Missing locationId" },
                { status: 400 }
            );
        }

        if (!dayId) {
            return NextResponse.json(
                { error: "Missing dayId" },
                { status: 400 }
            );
        }

        if (!hourId) {
            return NextResponse.json(
                { error: "Missing hourId" },
                { status: 400 }
            );
        }

        const deletedHour = await prisma.hour.deleteMany({
            where: {
                id: hourId,
                locationDayId: dayId,
                locationDay: {
                    locationId: locationId,
                    location: {
                        businessId: businessId,
                    },
                },
            },
        });

        if (deletedHour.count === 0) {
            return NextResponse.json(
                { error: "This location hour does not exist in our records" },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { message: "Location hour deleted successfully" },
            { status: 200 }
        );
    } catch (error) {
        console.error("Failed to delete location hour:", error);

        return NextResponse.json(
            { error: "Failed to delete location hour" },
            { status: 500 }
        );
    }
}