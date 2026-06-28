import { NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';
import type { Prisma } from "../../../../../packages/database/generated/prisma/client";

/*
*   Gets the slug of the HTTP request
**/
export function getSlug(request: Request): string {
    // Get the URL from the request
    const { searchParams }: URL = new URL(request.url);
    const slug: string | null = searchParams.get('slug');

    if (!slug) {
        throw new Error('Missing business slug');
    }

    return slug;
}

/*
*   Gets the response of a businesses data where <T> is the object of
*   Corresponding select "items" in the query
**/
export async function getBusinessResponse<T extends Prisma.BusinessSelect>(
    slug: string,
    select: T
): Promise<NextResponse> {
    const business = await prisma.business.findUnique({
        where: { slug: slug },
        select,
    });

    if (!business) {
        return NextResponse.json(
            { error: 'Business not found' },
            { status: 404 }
        );
    }

    return NextResponse.json(business);
}