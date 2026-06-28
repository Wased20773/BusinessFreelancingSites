import { NextResponse } from 'next/server';
import { getBusinessResponse, getSlug } from '../../route_helper';

// GET /api/business/menu
export async function GET(request: Request) {
    try {
        const slug: string = getSlug(request);

        return await getBusinessResponse(
            slug,
            {
                categories: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        order: true,
                        isVisible: true,
                        items: {
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
                                        name: true,
                                        price: true,
                                        order: true,
                                        isAvailable: true
                                    },
                                },
                            },
                        },
                    },
                },
            },
        )
    } catch (error) {
        return NextResponse.json(
            { error: `Missing business slug parameter: ${error}` },
            { status: 400 }
        )
    }
}