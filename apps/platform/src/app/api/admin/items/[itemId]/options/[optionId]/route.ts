import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// PATCH /api/admin/items/[itemId]/options/[optionId]
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ itemId: string; optionId: string }> }
): Promise<NextResponse> {
    try {
        const authResult = await authenticateBusinessAccess(
            request,
            [AccessLevel.owner, AccessLevel.admin]
        );

        if (authResult instanceof NextResponse) return authResult;

        const { businessId } = authResult;
        const { itemId, optionId } = await params;
        const body = await request.json();

        if (!itemId) {
            return NextResponse.json(
                { error: "Missing itemId" },
                { status: 400 }
            );
        }

        if (!optionId) {
            return NextResponse.json(
                { error: "Missing optionId" },
                { status: 400 }
            );
        }

        const option = await prisma.itemOption.findFirst({
            where: {
                id: optionId,
                itemId: itemId,
                item: {
                    businessId: businessId,
                },
            },
            select: {
                id: true,
            },
        });

        if (!option) {
            return NextResponse.json(
                { error: "This item option does not exist in our records" },
                { status: 404 }
            );
        }

        const updatedOption = await prisma.itemOption.update({
            where: {
                id: option.id,
            },
            data: {
                name: body.name,
                price: body.price,
                isAvailable: body.isAvailable,
            },
            select: {
                id: true,
                itemId: true,
                name: true,
                price: true,
                order: true,
                isAvailable: true,
                updatedAt: true,
            },
        });

        return NextResponse.json(updatedOption, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to update item option: ${error}` },
            { status: 500 }
        );
    }
}

// DELETE /api/admin/items/[itemId]/options/[optionId]
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ itemId: string; optionId: string }> }
): Promise<NextResponse> {
    try {
        const authResult = await authenticateBusinessAccess(
            request,
            [AccessLevel.owner, AccessLevel.admin]
        );

        if (authResult instanceof NextResponse) return authResult;

        const { businessId } = authResult;
        const { itemId, optionId } = await params;

        if (!itemId) {
            return NextResponse.json(
                { error: "Missing itemId" },
                { status: 400 }
            );
        }

        if (!optionId) {
            return NextResponse.json(
                { error: "Missing optionId" },
                { status: 400 }
            );
        }

        const option = await prisma.itemOption.findFirst({
            where: {
                id: optionId,
                itemId: itemId,
                item: {
                    businessId: businessId,
                },
            },
            select: {
                id: true,
                itemId: true,
            },
        });

        if (!option) {
            return NextResponse.json(
                { error: "This item option does not exist in our records" },
                { status: 404 }
            );
        }

        await prisma.itemOption.delete({
            where: {
                id: option.id,
            },
        });

        const remainingOptions = await prisma.itemOption.findMany({
            where: {
                itemId: option.itemId,
            },
            orderBy: {
                order: "asc",
            },
            select: {
                id: true,
            },
        });

        await prisma.$transaction(
            remainingOptions.map((option, index) =>
                prisma.itemOption.update({
                    where: {
                        id: option.id,
                    },
                    data: {
                        order: index + 1,
                    },
                })
            )
        );

        return NextResponse.json(
            { message: "Item option deleted successfully" },
            { status: 200 }
        );
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to delete item option: ${error}` },
            { status: 500 }
        );
    }
}
