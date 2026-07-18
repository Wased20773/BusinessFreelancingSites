import { getNextOrder } from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";


// POST /api/admin/categories/[categoryId]/subcategory
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
                { error: "Missing category name" },
                { status: 400 }
            );
        }

        const parentCategory = await prisma.category.findFirst({
            where: {
                id: categoryId,
                businessId: businessId,
                parentId: null,
            },
            select: { id: true },
        });

        if (!parentCategory) {
            return NextResponse.json(
                { error: "Either the category does not exists in our records or the selected category is already a subcategory" },
                { status: 404 }
            );
        }
        
        const nextOrder = await getNextOrder(
            prisma.category,
            { businessId: businessId, parentId: parentCategory.id }
        );

        if (nextOrder instanceof NextResponse) return nextOrder;

        const subCategory = await prisma.category.create({
            data: {
                businessId: businessId,
                parentId: parentCategory.id,
                name: body.name,
                description: body.description,
                order: nextOrder,
            },
            select: {
                id: true,
                parentId: true,
                name: true,
                description: true,
                order: true,
                isVisible: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return NextResponse.json(subCategory, { status: 201 });
    } catch (error) {
        console.error("Failed to add a subcategory:", error);

        return NextResponse.json(
            { error: "Failed to add a subcategory" },
            { status: 500 }
        );
}
}