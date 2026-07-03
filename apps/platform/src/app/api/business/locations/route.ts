import { NextResponse } from 'next/server';
import { getBusinessResponse, getSlug } from '../../route_helper';

// GET /api/business/locations
export async function GET(request: Request): Promise<NextResponse> {
    try {
        const slug: string = getSlug(request);
    
        return await getBusinessResponse(
            slug,
            {
                locations: {
                    select: {
                        id: true,
                        address: true,
                        zip: true,
                        country: true,
                        state: true,
                        city: true,
                        parking: true,
                        isActive: true,
                        hours: {
                            select: {
                                id: true,
                                locationId: true,
                                dayOfWeek: true,
                                openTime: true,
                                closeTime: true,
                                isClosed: true,
                            },
                        },
                    },
                },
            },
        );
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to fetch business locations: ${error}` },
            { status: 400 }
        );
    }
}