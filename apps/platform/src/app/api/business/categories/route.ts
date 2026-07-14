import { NextResponse } from 'next/server';
import { getBusinessResponse, getSlug } from '../../route_helper';

// GET /api/business/categories
export async function GET(request: Request): Promise<NextResponse> {
    try {
        const slug: string = getSlug(request);
    
        return await getBusinessResponse(
            slug,
            {
                categories: {
                    where: { parentId: null },
                    orderBy: {
                        order: 'asc',
                    },
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        order: true,
                        isVisible: true,
                        createdAt: true,
                        updatedAt: true,
                        subcategories: true,
                    },
                },
            },
        );
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to fetch business menu categories: ${error}` },
            { status: 400 }
        );
    }
}