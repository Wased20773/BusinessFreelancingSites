import { NextResponse } from 'next/server';
import { getBusinessResponse, getSlug } from '../../../route_helper';
import { prisma } from '@/lib/prisma';

// GET /api/business/menu/items/[itemSlug]
export async function GET(request: Request): Promise<NextResponse> {
    try {
        const slug: string = getSlug(request);
        const { searchParams } = new URL(request.url);
        const itemSlug = searchParams.get('itemSlug');
    
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
                options: {
                    select: {
                        id: true,
                        itemId: true,
                        name: true,
                        price: true,
                        order: true,
                        isAvailable: true
                    },
                },
            },
        });

        if (!item) {
            return NextResponse.json(
                { error: 'Item not found' },
                { status: 404 }
            )
        }

        return NextResponse.json(item);
    } catch (error) {
        return NextResponse.json(
            { error: `Missing business slug parameter: ${error}` },
            { status: 400 }
        )
    }
}