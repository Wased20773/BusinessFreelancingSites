import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/business
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

    // Query database to capture business data, contacts, socials, locations and hours
    const business = await prisma.business.findUnique({
        where: { slug: slug },
        select: {
            id: true,
            name: true,
            slug: true,
            domain: true,
            contacts: true,
            socials: true,
            locations: {
                include: { hours: true },
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

    // Otherwise, return the database result as JSON
    return NextResponse.json(business);
}