import { NextResponse } from 'next/server';
import { getBusinessResponse, getSlug } from '../../route_helper';

// GET /api/business/socials
export async function GET(request: Request): Promise<NextResponse> {
    try {
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
                        icon: true
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