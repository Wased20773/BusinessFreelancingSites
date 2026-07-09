import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// POST /api/admin/locations/[locationId]/days/[dayId]/hours
export async function POST(
    request: Request,
    { params }: { params: Promise<{ locationId: string; dayId: string }> }
): Promise<NextResponse> {
    try {
        const authResult = await authenticateBusinessAccess(
            request,
            [AccessLevel.owner, AccessLevel.admin]
        );

        if (authResult instanceof NextResponse) return authResult;

        const { businessId } = authResult;
        const { locationId, dayId } = await params;
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

        if (!body.openTime || !body.closeTime) {
            return NextResponse.json(
                { error: "Both open and close time must be provided" },
                { status: 400 }
            );
        }
        
        const day = await prisma.locationDay.findFirst({
            where: {
                id: dayId,
                locationId: locationId,
                location: {
                    businessId: businessId,
                },
            },
            select: {
                id: true,
            },
        });

        if (!day) {
            return NextResponse.json(
                { error: "This location day does not exist in our records" },
                { status: 404 }
            );
        }

        const hour = await prisma.hour.create({
            data: {
                locationDayId: day.id,
                openTime: body.openTime,
                closeTime: body.closeTime,
                title: body.title,
                note: body.note,
            },
            select: {
                id: true,
                locationDayId: true,
                openTime: true,
                closeTime: true,
                title: true,
                note: true,
                isDisabled: true,
            },
        });

        return NextResponse.json(hour, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to create location hours: ${error}` },
            { status: 500 }
        );
    }
}
