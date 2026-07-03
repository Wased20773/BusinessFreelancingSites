import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// PATCH /api/admin/categories/[categoryId]/move-up
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ categoryId: string }> }
): Promise<NextResponse> {
    try {
        const authResult = await authenticateBusinessAccess(
            request,
            [AccessLevel.owner, AccessLevel.admin]
        );

        if (authResult instanceof NextResponse) return authResult;

        const { businessId } = authResult;
        const { categoryId } = await params;

        if (!categoryId) {
            return NextResponse.json(
                { error: "Missing categoryId" },
                { status: 400 }
            );
        }

        // Find the category selected
        const currentCategory = await prisma.category.findFirst({
            where: {
                id: categoryId,
                businessId,
            },
            select: {
                id: true,
                order: true,
            },
        });

        if (!currentCategory) {
            return NextResponse.json(
                { error: "This category does not exist in our records" },
                { status: 404 }
            );
        }

        // Find the FIRST category with a lower order value from the selected category
        const aboveCategory = await prisma.category.findFirst({
            where: {
                businessId: businessId,
                order: {
                    lt: currentCategory.order,
                },
            },
            orderBy: {
                order: "desc",
            },
            select: {
                id: true,
                order: true,
            },
        });

        if (!aboveCategory) {
            return NextResponse.json(
                { error: "Category is already at the top" },
                { status: 400 }
            );
        }

        // Temps for order values
        const currentOrder = currentCategory.order;
        const aboveOrder = aboveCategory.order;

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
        const [updatedCategory] = await prisma.$transaction([
            prisma.category.update({
                where: {
                    id: currentCategory.id,
                },
                data: {
                    order: aboveOrder,
                },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    order: true,
                    isVisible: true,
                },
            }),
            prisma.category.update({
                where: {
                    id: aboveCategory.id,
                },
                data: {
                    order: currentOrder,
                },
            }),
        ]);

        return NextResponse.json(updatedCategory, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to connect to servers when moving category up: ${error}` },
            { status: 500 }
        );
    }
}