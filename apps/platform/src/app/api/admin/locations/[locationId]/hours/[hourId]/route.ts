import { normalizeDayOfWeek } from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel, DayOfWeek } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// PATCH /api/admin/locations/[locationId]/hours/[hourId]
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ locationId: string; hourId: string }> }
): Promise<NextResponse> {
    try {
        const authResult = await authenticateBusinessAccess(
            request,
            [AccessLevel.owner, AccessLevel.admin]
        );

        if (authResult instanceof NextResponse) return authResult;

        const { businessId } = authResult;
        const { locationId, hourId } = await params;
        const body = await request.json();

        if (!locationId) {
            return NextResponse.json(
                { error: "Missing locationId" },
                { status: 400 }
            );
        }

        if (!hourId) {
            return NextResponse.json(
                { error: "Missing hourId" },
                { status: 400 }
            );
        }
        
        let dayOfWeek: DayOfWeek | undefined = undefined;

        if (body.dayOfWeek !== undefined){
            const normalizedDay = normalizeDayOfWeek(body.dayOfWeek);

            if (!normalizedDay) {
                return NextResponse.json(
                    { error: "Invalid dayOfWeek" },
                    { status: 400 }
                );
            }

            dayOfWeek = normalizedDay;
        }

        const hour = await prisma.locationHour.findFirst({
            where: {
                id: hourId,
                locationId: locationId,
                location: {
                    businessId: businessId,
                },
            },
            select: {
                id: true,
            },
        });

        if (!hour) {
            return NextResponse.json(
                { error: "This location hour does not exist in our records" },
                { status: 404 }
            );
        }

        const updatedHour = await prisma.locationHour.update({
            where: {
                id: hour.id,
            },
            data: {
                dayOfWeek: dayOfWeek,
                openTime: body.openTime,
                closeTime: body.closeTime,
                isClosed: body.isClosed,
            },
            select: {
                id: true,
                locationId: true,
                dayOfWeek: true,
                openTime: true,
                closeTime: true,
                isClosed: true,
            },
        });

        return NextResponse.json(updatedHour, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to update location hour: ${error}` },
            { status: 500 }
        );
    }
}

// DELETE /api/admin/locations/[locationId]/hours/[hourId]
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ locationId: string; hourId: string }> }
): Promise<NextResponse> {
    try {
        const authResult = await authenticateBusinessAccess(
            request,
            [AccessLevel.owner, AccessLevel.admin]
        );

        if (authResult instanceof NextResponse) return authResult;

        const { businessId } = authResult;
        const { locationId, hourId } = await params;

        if (!locationId) {
            return NextResponse.json(
                { error: "Missing locationId" },
                { status: 400 }
            );
        }

        if (!hourId) {
            return NextResponse.json(
                { error: "Missing hourId" },
                { status: 400 }
            );
        }

        const deletedHour = await prisma.locationHour.deleteMany({
            where: {
                id: hourId,
                locationId: locationId,
                location: {
                    businessId: businessId,
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