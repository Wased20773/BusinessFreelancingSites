import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { AccessLevel } from "@business-freelancer/database";

// GET /api/admin/account
export async function GET(request: Request): Promise<NextResponse> {
    try {
        const authResult = await authenticateBusinessAccess(
            request,
            [AccessLevel.owner, AccessLevel.admin, AccessLevel.staff]
        );

        if (authResult instanceof NextResponse) return authResult;

        const { userId, businessId } = authResult;

        const businessUser = await prisma.businessUser.findFirst({
            where: {
                businessId: businessId,
                userId: userId,
            },
            select: {
                id: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        email: true,
                        image: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                },
                role: {
                    select: {
                        accessLevel: true,
                        description: true,
                    },
                }
            }
        });

        return NextResponse.json(businessUser);
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to connect to servers when fetching for your account details: ${error}` },
            { status: 500 }
        )
    }
}

// PATCH /api/admin/account
export async function PATCH(request: Request): Promise<NextResponse> {
    try {
        const authResult = await authenticateBusinessAccess(
            request,
            [AccessLevel.owner, AccessLevel.admin, AccessLevel.staff]
        )

        if (authResult instanceof NextResponse) return authResult;

        const { userId } = authResult;
        const body = await request.json();

        const updatedUser = await prisma.user.update({
            where: {
                id: userId,
            },
            data: {
                name: body.name,
                username: body.username,
            },
            select: {
                id: true,
                name: true,
                username: true,
                updatedAt: true,
            }
        });

        return NextResponse.json(updatedUser);
    } catch(error) {
        return NextResponse.json(
            { error:  `Failed to connect to servers when updating your user profile: ${error}`},
            { status: 500 }
        )
    }
}
