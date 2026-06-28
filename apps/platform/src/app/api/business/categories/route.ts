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
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        order: true,
                        isVisible: true
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