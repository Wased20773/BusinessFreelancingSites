import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { getNextOrder } from "../../route_helper";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// POST /api/admin/categories
export async function POST(request: Request): Promise<NextResponse> {
    try {
        const authResult = await authenticateBusinessAccess(
            request,
            [AccessLevel.owner, AccessLevel.admin]
        );

        if (authResult instanceof NextResponse) return authResult;

        const { businessId } = authResult;
        const body = await request.json();

        if (!body.name) {
            return NextResponse.json(
                { error: "Missing category name" },
                { status: 400 }
            );
        }

        const nextOrder = await getNextOrder(
            prisma.category,
            { businessId: businessId }
        );

        if (nextOrder instanceof NextResponse) return nextOrder;

        const category = await prisma.category.create({
            data: {
                businessId: businessId,
                name: body.name,
                description: body.description,
                order: nextOrder
            },
            select: {
                id: true,
                name: true,
                description: true,
                order: true,
                isVisible: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return NextResponse.json(category, { status: 201 });
    } catch (error) {
        console.error("Failed to create category:", error);
        return NextResponse.json(
            { error: "Failed to create category" },
            { status: 500 }
        );
    }
}