import { auth } from "@/auth";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// PATCH /api/admin/business-users/[businessUserId]
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ businessUserId: string }> }
): Promise<NextResponse> {
    try {
        const authResult = await authenticateBusinessAccess(
            request,
            [AccessLevel.owner, AccessLevel.admin]
        );

        if (authResult instanceof NextResponse) return authResult;

        const { businessId } = authResult;
        const { businessUserId } = await params;
        const body = await request.json();

        // Verify everything has been passed in
        if (!businessUserId) {
            return NextResponse.json(
                { error: "Missing businessUserId" },
                { status: 400 }
            );
        }

        if (!body.accessLevel) {
            return NextResponse.json(
                { error: "Missing access level" },
                { status: 400 }
            );
        }

        // Grab the role from the body
        const role = await prisma.role.findFirst({
            where: {
                accessLevel: body.accessLevel,
            },
            select: {
                id: true,
            },
        });

        if (!role) {
            return NextResponse.json(
                { error: "Invalid access level selection" },
                { status: 400 }
            );
        }

        // 1. Verify this BusinessUser belongs to the authenticated business
        const businessUser = await prisma.businessUser.findFirst({
            where: {
                id: businessUserId,
                businessId,
            },
            select: {
                id: true,
            },
        });

        if (!businessUser) {
            return NextResponse.json(
                { error: "This business user does not exist in our records" },
                { status: 404 }
            );
        }

        // 2. Update by unique ID and return the updated contents
        const updatedBusinessUser = await prisma.businessUser.update({
            where: {
                id: businessUser.id,
            },
            data: {
                role: {
                    connect: {
                        id: role.id,
                    },
                },
            },
            select: {
                id: true,
                role: {
                    select: {
                        accessLevel: true,
                        description: true,
                    },
                },
            },
        });

        return NextResponse.json(updatedBusinessUser, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to update linked user's access level: ${error}` },
            { status: 500 }
        );
    }
}
// DELETE /api/admin/business-users/[businessUserId]
export async function DELETE(
    request: Request,
    { params }: { params: { businessUserId: string }}
): Promise<NextResponse> {
    try {
        const authResult = await authenticateBusinessAccess(
            request,
            [AccessLevel.owner, AccessLevel.admin]
        );

        if (authResult instanceof NextResponse) return authResult;

        const { businessId } = authResult
        const { businessUserId } = await params;

        if (!businessUserId) return NextResponse.json(
            { error: 'Missing businessUserId' },
            { status: 400 }
        );

        // Using 'deleteMany()' to get a count rather than a thrown error from prisma 'delete()'
        const deletedBusinessUser = await prisma.businessUser.deleteMany({
            where: {
                id: businessUserId,
                businessId: businessId,
            },
        });

        if (deletedBusinessUser.count === 0) {
            return NextResponse.json(
                { error: 'This business user does not exist in our records' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { message: 'Business user deleted successfully' },
            { status: 200 }
        );
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to connect to servers when deleting a business user: ${error}` },
            { status: 500 }
        );
    }
}
