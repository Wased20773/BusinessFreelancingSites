import { NextResponse } from 'next/server';
import { getSlug } from '../../../../route_helper';
import { prisma } from '@/lib/prisma';

// GET /api/business/menu/items/[itemSlug]
export async function GET(
    request: Request,
    { params }: { params: Promise<{ itemSlug: string }> }
): Promise<NextResponse> {
    try {
        const slug: string = getSlug(request);
        const { itemSlug } = await params;
    
        if (!itemSlug) {
            return NextResponse.json(
                { error: "Missing item slug" },
                { status: 400 }
            );
        }

        const item = await prisma.item.findFirst({
            where: {
                slug: itemSlug,
                business: {
                    slug: slug
                },
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
                options: {
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
                },
            },
        });

        if (!item) {
            return NextResponse.json(
                { error: 'Item not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(item, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to connect to servers when fetching for the specified business item: ${error}` },
            { status: 500 }
        );
    }
}