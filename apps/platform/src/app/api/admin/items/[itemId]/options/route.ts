import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { getNextOrder } from "../../../../route_helper";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// POST /api/admin/items/[itemId]/options
export async function POST(
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

        if (!body.name) {
            return NextResponse.json(
                { error: "Missing option name" },
                { status: 400 }
            );
        }

        if (body.price === undefined || body.price === null) {
            return NextResponse.json(
                { error: "Missing option price" },
                { status: 400 }
            );
        }

        // Get the selected item
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

        // Get the next order value for this item's options
        const nextOrder = await getNextOrder(
            prisma.itemOption,
            { itemId: item.id }
        );

        if (nextOrder instanceof NextResponse) return nextOrder;

        const option = await prisma.itemOption.create({
            data: {
                itemId: item.id,
                name: body.name,
                price: body.price,
                order: nextOrder,
            },
            select: {
                id: true,
                itemId: true,
                name: true,
                price: true,
                order: true,
                isAvailable: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return NextResponse.json(option, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to create item option: ${error}` },
            { status: 500 }
        );
    }
}
