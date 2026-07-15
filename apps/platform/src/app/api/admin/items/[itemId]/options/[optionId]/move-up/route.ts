import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// PATCH /api/admin/items/[itemId]/options/[optionId]/move-up
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

        const currentOption = await prisma.itemOption.findFirst({
            where: {
                id: optionId,
                itemId: itemId,
                item: {
                    businessId: businessId,
                },
            },
            select: {
                id: true,
                order: true,
            },
        });

        if (!currentOption) {
            return NextResponse.json(
                { error: "This item option does not exist in our records" },
                { status: 404 }
            );
        }

        const aboveOption = await prisma.itemOption.findFirst({
            where: {
                itemId: itemId,
                order: {
                    lt: currentOption.order,
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

        if (!aboveOption) {
            return NextResponse.json(
                { error: "Item option is already at the top" },
                { status: 400 }
            );
        }

        const currentOrder = currentOption.order;
        const aboveOrder = aboveOption.order;

        const [updatedOption] = await prisma.$transaction([
            prisma.itemOption.update({
                where: {
                    id: currentOption.id,
                },
                data: {
                    order: aboveOrder,
                },
                select: {
                    id: true,
                    itemId: true,
                    order: true,
                    updatedAt: true,
                },
            }),
            prisma.itemOption.update({
                where: {
                    id: aboveOption.id,
                },
                data: {
                    order: currentOrder,
                },
            }),
        ]);

        return NextResponse.json(updatedOption, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to move item option up: ${error}` },
            { status: 500 }
        );
    }
}