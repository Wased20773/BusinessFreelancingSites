import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { createSlug, getNextOrder } from '../../../../route_helper'
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// POST /api/admin/categories/[categoryId]/items
export async function POST(
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
        const body = await request.json();

        if (!categoryId) {
            return NextResponse.json(
                { error: "Missing categoryId" },
                { status: 400 }
            );
        }

        if (!body.name) {
            return NextResponse.json(
                { error: "Missing item name" },
                { status: 400 }
            );
        }

        if (body.price === undefined || body.price === null) {
            return NextResponse.json(
                { error: "Missing item price" },
                { status: 400 }
            );
        }

        const category = await prisma.category.findFirst({
            where: {
                id: categoryId,
                businessId: businessId,
            },
            select: {
                id: true,
            },
        });

        if (!category) {
            return NextResponse.json(
                { error: "This category does not exist in our records" },
                { status: 404 }
            );
        }

        const nextOrder = await getNextOrder(
            prisma.item,
            { categoryId: category.id }
        );

        if (nextOrder instanceof NextResponse) return nextOrder;

        const item = await prisma.item.create({
            data: {
                businessId: businessId,
                categoryId: category.id,
                name: body.name,
                description: body.description,
                containsList: body.containsList ?? [],
                calories: body.calories,
                price: body.price,
                order: nextOrder,
                isAvailable: body.isAvailable ?? true,
                slug: createSlug(body.name),
                imageKey: body.imageKey,
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
                createdAt: true,
                updatedAt: true,
            },
        });

        return NextResponse.json(item, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to create category item: ${error}` },
            { status: 500 }
        );
    }
}
