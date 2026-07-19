import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// POST /api/admin/locations
export async function POST(request: Request): Promise<NextResponse> {
    try {
        const authResult = await authenticateBusinessAccess(
            request,
            [AccessLevel.owner, AccessLevel.admin]
        );

        if (authResult instanceof NextResponse) return authResult;

        const { businessId } = authResult;
        const body = await request.json();

        if (!body.address) {
            return NextResponse.json(
                { error: "Missing location address" },
                { status: 400 }
            );
        }

        const location = await prisma.location.create({
            data: {
                businessId: businessId,
                address: body.address,
                zip: body.zip,
                country: body.country,
                state: body.state,
                city: body.city,
                parking: body.parking
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
                enableHours: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return NextResponse.json(location, { status: 201 });
    } catch (error) {
        console.error("Failed to create location", error);

        return NextResponse.json(
            { error: "Failed to create location" },
            { status: 500 }
        );
    }
}