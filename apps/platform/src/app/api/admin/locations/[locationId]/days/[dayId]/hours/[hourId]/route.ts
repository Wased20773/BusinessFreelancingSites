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

        const updatedHourResult = await prisma.hour.updateMany({
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
            data: {
                openTime: body.openTime,
                closeTime: body.closeTime,
                title: body.title,
                note: body.note,
                isDisabled: body.isDisabled,
            },
        });

        if (updatedHourResult.count === 0) {
            return NextResponse.json(
                { error: "This location hour does not exist in our records" },
                { status: 404 }
            );
        }

        const updatedHour = await prisma.hour.findUnique({
            where: {
                id: hourId,
            },
            select: {
                id: true,
                openTime: true,
                closeTime: true,
                title: true,
                note: true,
                isDisabled: true,
            },
        });

        return NextResponse.json(updatedHour, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to update location hours: ${error}` },
            { status: 500 }
        )
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
        return NextResponse.json(
            { error: `Failed to delete location hour: ${error}` },
            { status: 500 }
        );
    }
}