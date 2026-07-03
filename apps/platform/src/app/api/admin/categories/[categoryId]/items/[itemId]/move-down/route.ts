import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// PATCH /api/admin/categories/[categoryId]/items/[itemId]/move-down
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ categoryId: string; itemId: string }> }
): Promise<NextResponse> {
    try {
        const authResult = await authenticateBusinessAccess(
            request,
            [AccessLevel.owner, AccessLevel.admin]
        );

        if (authResult instanceof NextResponse) return authResult;

        const { businessId } = authResult;
        const { categoryId, itemId } = await params;

        if (!categoryId) {
            return NextResponse.json(
                { error: "Missing categoryId" },
                { status: 400 }
            );
        }

        if (!itemId) {
            return NextResponse.json(
                { error: "Missing itemId" },
                { status: 400 }
            );
        }

        // Find the current item selected
        const currentItem = await prisma.item.findFirst({
            where: {
                id: itemId,
                categoryId: categoryId,
                businessId: businessId,
            },
            select: {
                id: true,
                order: true,
            },
        });

        if (!currentItem) {
            return NextResponse.json(
                { error: "This item does not exist in our records" },
                { status: 404 }
            );
        }

        // Find the FIRST item with a higher order value from the selected category
        const belowItem = await prisma.item.findFirst({
            where: {
                categoryId: categoryId,
                businessId: businessId,
                order: {
                    gt: currentItem.order,
                },
            },
            orderBy: {
                order: "asc",
            },
            select: {
                id: true,
                order: true,
            },
        });

        if (!belowItem) {
            return NextResponse.json(
                { error: "Item is already at the bottom" },
                { status: 400 }
            );
        }

        // Temps for order values
        const currentOrder = currentItem.order;
        const belowOrder = belowItem.order;

        // Swap order values from the two categories using a transaction.
        // $transaction returns an array of results in the same order as the queries.
        //
        // Example:
        // const results = await prisma.$transaction([
        //     prisma.category.update(...), // result at index 0
        //     prisma.category.update(...), // result at index 1
        // ]);
        //
        // const [resultOne] grabs only index 0.
        // const [resultOne, resultTwo] grabs index 0 and index 1.
        const [updatedItem] = await prisma.$transaction([
            prisma.item.update({
                where: {
                    id: currentItem.id,
                },
                data: {
                    order: belowOrder,
                },
                select: {
                    id: true,
                    categoryId: true,
                    name: true,
                    description: true,
                    containsList: true,
                    calories: true,
                    price: true,
                    order: true,
                    isAvailable: true,
                    slug: true,
                    imageKey: true,
                    updatedAt: true,
                },
            }),
            prisma.item.update({
                where: {
                    id: belowItem.id,
                },
                data: {
                    order: currentOrder,
                },
            }),
        ]);

        return NextResponse.json(updatedItem, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to move item down: ${error}` },
            { status: 500 }
        );
    }
}