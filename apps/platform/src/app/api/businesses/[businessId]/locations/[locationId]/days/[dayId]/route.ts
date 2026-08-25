import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// PATCH /api/admin/locations/[locationId]/days/[dayId]
export async function PATCH(
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

        const updatedDayResult = await prisma.locationDay.updateMany({
            where: {
                id: dayId,
                locationId: locationId,
                location: {
                    businessId: businessId,
                },
            },
            data: {
                isClosed: body.isClosed,
            },
        });

        if (updatedDayResult.count === 0) {
            return NextResponse.json(
                { error: "This location day does not exist in our records" },
                { status: 404 }
            );
        }

        const updatedDay = await prisma.locationDay.findUnique({
            where: {
                id: dayId,
            },
            select: {
                id: true,
                locationId: true,
                dayOfWeek: true,
                isClosed: true,
                updatedAt: true,
            },
        });

        return NextResponse.json(updatedDay, { status: 200 });
    } catch (error) {
        console.error("Failed to update location day:", error);

        return NextResponse.json(
            { error: "Failed to update location day" },
            { status: 500 }
        );
    }
}

// DELETE /api/admin/locations/[locationId]/days/[dayId]
export async function DELETE(
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

        const deletedDay = await prisma.locationDay.deleteMany({
            where: {
                id: dayId,
                locationId: locationId,
                location: {
                    businessId: businessId,
                },
            },
        });

        if (deletedDay.count === 0) {
            return NextResponse.json(
                { error: "This location day does not exist in our records" },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { message: "Location day deleted successfully" },
            { status: 200 }
        );
    } catch (error) {
        console.error("Failed to delete location day:", error);

        return NextResponse.json(
            { error: "Failed to delete location day" },
            { status: 500 }
        );
    }
}