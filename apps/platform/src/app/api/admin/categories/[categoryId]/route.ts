import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

// PATCH /api/admin/categories/[categoryId]
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
        const body = await request.json();

        if (!categoryId) {
            return NextResponse.json(
                { error: "Missing categoryId" },
                { status: 400 }
            );
        }

        // Get the category selected from categoryId route param
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

        const updatedCategory = await prisma.category.update({
            where: {
                id: category.id,
            },
            data: {
                name: body.name,
                description: body.description,
                isVisible: body.isVisible,
            },
            select: {
                id: true,
                name: true,
                description: true,
                order: true,
                isVisible: true,
                updatedAt: true,
            },
        });

        return NextResponse.json(updatedCategory, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to update category: ${error}` },
            { status: 500 }
        );
    }
}

// DELETE /api/admin/categories/[categoryId]
export async function DELETE(
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

        // Get the category selected by the categoryId route param
        const category = await prisma.category.findFirst({
            where: {
                id: categoryId,
                businessId,
            },
            select: {
                id: true,
                items: {
                    select: {
                        id: true,
                    },
                },
            },
        });

        // Check for existence
        if (!category) {
            return NextResponse.json(
                { error: "This category does not exist in our records" },
                { status: 404 }
            );
        }

        // Check for items (if there is any, disallow deletion)
        if (category.items.length > 0) {
            return NextResponse.json(
                { error: "This category cannot be deleted because it still has items attached to it" },
                { status: 409 }
            );
        }

        // Delete the category
        await prisma.category.delete({
            where: {
                id: category.id,
            },
        });

        // Reorganize the remaining categories order values
        const remainingCategories = await prisma.category.findMany({
            where: {
                businessId,
            },
            orderBy: {
                order: "asc",
            },
            select: {
                id: true,
            },
        });

        // Reset order values for all remaining categories starting at 1
        await prisma.$transaction(
            remainingCategories.map((category, index) =>
                prisma.category.update({
                    where: {
                        id: category.id,
                    },
                    data: {
                        order: index + 1,
                    },
                })
            )
        );

        return NextResponse.json(
            { message: "Category deleted successfully" },
            { status: 200 }
        );
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to delete category: ${error}` },
            { status: 500 }
        );
    }
}