import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// #2. GET /api/business/menu
export async function GET(request: Request) {
    // Get the URL from the request
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
        return NextResponse.json(
            { error: 'Missing business slug' },
            { status: 400 }
        );
    }

    // Query database to capture business data, categories, items and their options
    const business = await prisma.business.findUnique({
        where: {
            slug: slug,
        },
        select: {
            id: true,
            name: true,
            slug: true,
            categories: {
                include: {
                    items: {
                        include: { options: true },
                    },
                },
            },
        },
    });

    // Check for existence
    if (!business) {
        return NextResponse.json(
            { error: 'Business not found' },
            { status: 404 }
        );
    }

    // Otherwise, return the data result as JSON
    return Response.json(business);
}