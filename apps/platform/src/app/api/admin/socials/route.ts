import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";
import { createSlug } from "../../route_helper";

// POST /api/admin/socials
export async function POST(request: Request): Promise<NextResponse> {
    try {
        const authResult = await authenticateBusinessAccess(
            request,
            [AccessLevel.owner, AccessLevel.admin]
        );

        if (authResult instanceof NextResponse) return authResult;

        const { businessId } = authResult;
        const body = await request.json();

        if (!body.domain) {
            return NextResponse.json(
                { error: "Missing Domain Name" },
                { status: 400 }
            );
        }

        if (!body.profileName) {
            return NextResponse.json(
                { error: "Missing social profile name" },
                { status: 400 }
            );
        }
        
        const url = `https://${body.domain}/${(createSlug(body.profileName))}`;

        if (!body.icon) {
            return NextResponse.json(
                { error: "Missing social icon" },
                { status: 400 }
            );
        }

        const social = await prisma.social.create({
            data: {
                businessId: businessId,
                domain: body.domain,
                profileName: body.profileName,
                url: url,
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

        return NextResponse.json(social, { status: 201 });
    } catch (error) {
        console.error("Failed to create social:", error);

        return NextResponse.json(
            { error: "Failed to create social" },
            { status: 500 }
        );
    }
}