import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// POST /api/admin/contacts
export async function POST(request: Request): Promise<NextResponse> {
    try {
        const authResult = await authenticateBusinessAccess(
            request,
            [AccessLevel.owner, AccessLevel.admin]
        );

        if (authResult instanceof NextResponse) return authResult;

        const { businessId } = authResult;
        const body = await request.json();

        if (!body.phoneNumber && !body.email) {
            return NextResponse.json(
                { error: "A contact must include either a phone number or an email" },
                { status: 400 }
            );
        }

        const contact = await prisma.contact.create({
            data: {
                businessId: businessId,
                phoneNumber: body.phoneNumber,
                email: body.email,
                isPersonal: body.isPersonal ?? false,
            },
            select: {
                id: true,
                phoneNumber: true,
                email: true,
                isPersonal: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return NextResponse.json(contact, { status: 201 });
    } catch (error) {
        console.error("Failed to create contact:", error);

        return NextResponse.json(
            { error: "Failed to create contact" },
            { status: 500 }
        );
    }
}