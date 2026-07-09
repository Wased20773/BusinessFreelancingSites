import { normalizeDayOfWeek } from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// POST /api/admin/locations/[locationId]/days
export async function POST(
    request: Request,
    { params }: { params: Promise<{ locationId: string }> }
): Promise<NextResponse> {
    try {
        const authResult = await authenticateBusinessAccess(
            request,
            [AccessLevel.owner, AccessLevel.admin]
        );

        if (authResult instanceof NextResponse) return authResult;

        const { businessId } = authResult;
        const { locationId } = await params;
        const body = await request.json();

        if (!locationId) {
            return NextResponse.json(
                { error: "Missing locationId" },
                { status: 400 }
            );
        }

        if (!body.dayOfWeek) {
            return NextResponse.json(
                { error: "Missing dayOfWeek" },
                { status: 400 }
            );
        }

        // Check if the supplied dayOfWeek is in DayOfWeek enum
        const dayOfWeek = normalizeDayOfWeek(body.dayOfWeek);
        if (!dayOfWeek) return NextResponse.json(
            { error: "Invalid dayOfWeek" },
            { status: 400 }
        );

        const location = await prisma.location.findFirst({
            where: {
                id: locationId,
                businessId: businessId,
            },
            select: {
                id: true,
            },
        });

        if (!location) {
            return NextResponse.json(
                { error: "This location does not exist in our records" },
                { status: 404 }
            );
        }

        const day = await prisma.locationDay.create({
            data: {
                locationId: location.id,
                dayOfWeek: dayOfWeek,
                isClosed: body.isClosed,
            },
            select: {
                id: true,
                locationId: true,
                dayOfWeek: true,
                isClosed: true,
            },
        });

        return NextResponse.json(day, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to create location day: ${error}` },
            { status: 500 }
        );
    }
}