import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// PATCH /api/admin/items/[itemId]
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ itemId: string }> }
): Promise<NextResponse> {
    try {
        const authResult = await authenticateBusinessAccess(
            request,
            [AccessLevel.owner, AccessLevel.admin]
        );

        if (authResult instanceof NextResponse) return authResult;

        const { businessId } = authResult;
        const { itemId } = await params;
        const body = await request.json();

        if (!itemId) {
            return NextResponse.json(
                { error: "Missing itemId" },
                { status: 400 }
            );
        }

        // Find the item selected
        const item = await prisma.item.findFirst({
            where: {
                id: itemId,
                businessId,
            },
            select: {
                id: true,
            },
        });

        if (!item) {
            return NextResponse.json(
                { error: "This item does not exist in our records" },
                { status: 404 }
            );
        }

        // Update the item after validation
        const updatedItem = await prisma.item.update({
            where: {
                id: item.id,
            },
            data: {
                name: body.name,
                description: body.description,
                containsList: body.containsList,
                calories: body.calories,
                price: body.price,
                isAvailable: body.isAvailable,
            },
            select: {
                id: true,
                categoryId: true,
                name: true,
                description: true,
                containsList: true,
                calories: true,
                price: true,
                isAvailable: true,
                updatedAt: true,
            },
        });

        return NextResponse.json(updatedItem, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to update item: ${error}` },
            { status: 500 }
        );
    }
}

// DELETE /api/admin/items/[itemId]
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ itemId: string }> }
): Promise<NextResponse> {
    try {
        const authResult = await authenticateBusinessAccess(
            request,
            [AccessLevel.owner, AccessLevel.admin]
        );

        if (authResult instanceof NextResponse) return authResult;

        const { businessId } = authResult;
        const { itemId } = await params;

        if (!itemId) {
            return NextResponse.json(
                { error: "Missing itemId" },
                { status: 400 }
            );
        }

        // Find the item selected
        const item = await prisma.item.findFirst({
            where: {
                id: itemId,
                businessId,
            },
            select: {
                id: true,
                categoryId: true,
            },
        });

        if (!item) {
            return NextResponse.json(
                { error: "This item does not exist in our records" },
                { status: 404 }
            );
        }

        // Delete item after validation
        await prisma.item.delete({
            where: {
                id: item.id,
            },
        });

        // Reorganize the remaining items order values
        const remainingItems = await prisma.item.findMany({
            where: {
                businessId,
                categoryId: item.categoryId,
            },
            orderBy: {
                order: "asc",
            },
            select: {
                id: true,
            },
        });

        // Reset order values for all remaining items starting at 1
        await prisma.$transaction(
            remainingItems.map((item, index) =>
                prisma.item.update({
                    where: {
                        id: item.id,
                    },
                    data: {
                        order: index + 1,
                    },
                })
            )
        );

        return NextResponse.json(
            { message: "Item deleted successfully" },
            { status: 200 }
        );
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to delete item: ${error}` },
            { status: 500 }
        );
    }
}