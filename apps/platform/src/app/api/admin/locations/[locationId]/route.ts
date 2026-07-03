import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// PATCH /api/admin/locations/[locationId]
export async function PATCH(
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

        const updatedLocation = await prisma.location.update({
            where: {
                id: location.id,
            },
            data: {
                address: body.address,
                zip: body.zip,
                country: body.country,
                state: body.state,
                city: body.city,
                parking: body.parking,
                isActive: body.isActive,
            },
            select: {
                id: true,
                address: true,
                zip: true,
                country: true,
                state: true,
                city: true,
                parking: true,
                isActive: true,
                updatedAt: true,
            },
        });

        return NextResponse.json(updatedLocation, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to update location: ${error}` },
            { status: 500 }
        );
    }
}

// DELETE /api/admin/locations/[locationId]
export async function DELETE(
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

        if (!locationId) {
            return NextResponse.json(
                { error: "Missing locationId" },
                { status: 400 }
            );
        }

        const deletedLocation = await prisma.location.deleteMany({
            where: {
                id: locationId,
                businessId: businessId,
            },
        });

        if (deletedLocation.count === 0) {
            return NextResponse.json(
                { error: "This location does not exist in our records" },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { message: "Location deleted successfully" },
            { status: 200 }
        );
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to delete location: ${error}` },
            { status: 500 }
        );
    }
}