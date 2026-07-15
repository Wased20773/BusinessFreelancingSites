import { createSlug } from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// PATCH /api/admin/socials/[socialId]
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ socialId: string }> }
): Promise<NextResponse> {
    try {
        const authResult = await authenticateBusinessAccess(
            request,
            [AccessLevel.owner, AccessLevel.admin]
        );

        if (authResult instanceof NextResponse) return authResult;

        const { businessId } = authResult;
        const { socialId } = await params;
        const body = await request.json();

        if (!socialId) {
            return NextResponse.json(
                { error: "Missing socialId" },
                { status: 400 }
            );
        }

        const social = await prisma.social.findFirst({
            where: {
                id: socialId,
                businessId: businessId,
            },
            select: {
                id: true,
                domain: true,
                profileName: true,
            },
        });

        if (!social) {
            return NextResponse.json(
                { error: "This social does not exist in our records" },
                { status: 404 }
            );
        }

        // Temps to help with assignment
        const domain = body.domain ?? social.domain;
        const profileName = body.profileName ?? social.profileName;

        const updatedSocial = await prisma.social.update({
            where: {
                id: social.id,
            },
            data: {
                domain: body.domain,
                profileName: body.profileName,
                url: `${domain}/${createSlug(profileName)}`,
                icon: body.icon,
            },
            select: {
                id: true,
                domain: true,
                profileName: true,
                url: true,
                icon: true,
            },
        });

        return NextResponse.json(updatedSocial, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to update social: ${error}` },
            { status: 500 }
        );
    }
}

// DELETE /api/admin/socials/[socialId]
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ socialId: string }> }
): Promise<NextResponse> {
    try {
        const authResult = await authenticateBusinessAccess(
            request,
            [AccessLevel.owner, AccessLevel.admin]
        );

        if (authResult instanceof NextResponse) return authResult;

        const { businessId } = authResult;
        const { socialId } = await params;

        if (!socialId) {
            return NextResponse.json(
                { error: "Missing socialId" },
                { status: 400 }
            );
        }

        const deletedSocial = await prisma.social.deleteMany({
            where: {
                id: socialId,
                businessId: businessId,
            },
        });

        if (deletedSocial.count === 0) {
            return NextResponse.json(
                { error: "This social does not exist in our records" },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { message: "Social deleted successfully" },
            { status: 200 }
        );
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to delete social: ${error}` },
            { status: 500 }
        );
    }
}