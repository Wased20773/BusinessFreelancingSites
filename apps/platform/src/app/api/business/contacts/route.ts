import { NextResponse } from 'next/server';
import { getBusinessResponse, getSlug } from '../../route_helper';

// GET /api/business/contacts
export async function GET(request: Request): Promise<NextResponse> {
    try {
        const slug: string = getSlug(request);

        return await getBusinessResponse(
            slug,
            {
                contacts: {
                    select: {
                        id: true,
                        phoneNumber: true,
                        email: true,
                        isPersonal: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                },
            },
            "contact"
        );
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to fetch business contacts: ${error}` },
            { status: 400 }
        );
    }
}