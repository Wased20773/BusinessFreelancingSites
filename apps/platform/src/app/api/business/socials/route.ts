import { NextResponse } from 'next/server';
import { getBusinessResponse, getSlug } from '../../route_helper';

// GET /api/business/socials
export async function GET(request: Request): Promise<NextResponse> {
    const slug: string = getSlug(request);

    return getBusinessResponse(
        slug,
        {
            socials: {
                select: {
                    id: true,
                    name: true,
                    profileName: true,
                    url: true,
                    icon: true,
                },
            },
        },
    );
}