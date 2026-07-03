import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextFetchEvent, NextResponse } from "next/server";

// GET /api/admin/account/search?email
export async function GET(request: Request): Promise<NextResponse> {
    try {
        const authResult = await authenticateBusinessAccess(
            request,
            [AccessLevel.owner, AccessLevel.admin]
        );

        if (authResult instanceof NextResponse) return authResult;

        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');

        if (!email) {
            return NextResponse.json(
                { error: 'Missing email' },
                { status: 400 }
            );
        }

        const searchedUser = await prisma.user.findUnique({
            where: { email: email },
            select: {
                id: true,
                name: true,
                username: true,
                email: true,
                emailVerified: true,
                image: true,
                createdAt: true,
            },
        });

        if (!searchedUser) {
            return NextResponse.json(
                { error: `Searched user was not found` },
                { status: 404 }
            );
        }

        return NextResponse.json(searchedUser, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to connect to servers when fetching for the searched account: ${error}` },
            { status: 500 }
        );
    }
}