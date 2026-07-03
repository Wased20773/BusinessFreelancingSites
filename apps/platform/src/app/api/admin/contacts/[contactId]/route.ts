import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// PATCH /api/admin/contacts/[contactId]
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ contactId: string }> }
): Promise<NextResponse> {
    try {
        const authResult = await authenticateBusinessAccess(
            request,
            [AccessLevel.owner, AccessLevel.admin]
        );

        if (authResult instanceof NextResponse) return authResult;

        const { businessId } = authResult;
        const { contactId } = await params;
        const body = await request.json();

        if (!contactId) {
            return NextResponse.json(
                { error: "Missing contactId" },
                { status: 400 }
            );
        }

        const contact = await prisma.contact.findFirst({
            where: {
                id: contactId,
                businessId,
            },
            select: {
                id: true,
            },
        });

        if (!contact) {
            return NextResponse.json(
                { error: "This contact does not exist in our records" },
                { status: 404 }
            );
        }

        const updatedContact = await prisma.contact.update({
            where: {
                id: contact.id,
            },
            data: {
                phoneNumber: body.phoneNumber,
                email: body.email,
                isPersonal: body.isPersonal,
            },
            select: {
                id: true,
                phoneNumber: true,
                email: true,
                isPersonal: true,
                updatedAt: true,
            },
        });

        return NextResponse.json(updatedContact, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to update contact: ${error}` },
            { status: 500 }
        );
    }
}

// DELETE /api/admin/contacts/[contactId]
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ contactId: string }> }
): Promise<NextResponse> {
    try {
        const authResult = await authenticateBusinessAccess(
            request,
            [AccessLevel.owner, AccessLevel.admin]
        );

        if (authResult instanceof NextResponse) return authResult;

        const { businessId } = authResult;
        const { contactId } = await params;

        if (!contactId) {
            return NextResponse.json(
                { error: "Missing contactId" },
                { status: 400 }
            );
        }

        const deletedContact = await prisma.contact.deleteMany({
            where: {
                id: contactId,
                businessId,
            },
        });

        if (deletedContact.count === 0) {
            return NextResponse.json(
                { error: "This contact does not exist in our records" },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { message: "Contact deleted successfully" },
            { status: 200 }
        );
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to delete contact: ${error}` },
            { status: 500 }
        );
    }
}