import { NextResponse } from 'next/server';
import { getBusinessResponse, getSlug } from '../route_helper';

// GET /api/business
export async function GET(request: Request): Promise<NextResponse> {
    const slug: string = getSlug(request);

    return await getBusinessResponse(
        slug,
        {
            id: true,
            name: true,
            slug: true, 
            domain: true,
            createdAt: true,
            updatedAt: true,
        },
    );
}