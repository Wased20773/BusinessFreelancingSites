import { NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';
import type { Prisma } from "../../../../../packages/database/generated/prisma/client";
import { DayOfWeek } from "@business-freelancer/database";

type OrderModel = {
    findFirst: (args: {
        where: Record<string, unknown>;
        orderBy: { order: 'desc' };
        select: { order: true };
    }) => Promise<{ order: number } | null>;
}

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
*   Gets the response of a businesses data where <T> is the object of the
*   Corresponding select "items" in the query
**/
export async function getBusinessResponse<T extends Prisma.BusinessSelect>(
    slug: string,
    select: T
): Promise<NextResponse> {
    try {
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

        return NextResponse.json(business, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to connect to servers when getting business: ${error}` },
            { status: 500 }
        );
    }
}

export async function getNextOrder(
    model: OrderModel,
    where: Record<string, unknown>
): Promise<NextResponse | number> {
    try {
        const lastRecord = await model.findFirst({
            where: where,
            orderBy: {
                order: 'desc',
            },
            select: {
                order: true,
            },
        });

        return (lastRecord?.order?? 0) + 1;
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to connect to servers when determining the order of the model: ${error}` },
            { status: 500 }
        )
    }
}

export function createSlug(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
}

export function normalizeDayOfWeek(value: string): DayOfWeek | null {
    const normalized = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

    if (!Object.values(DayOfWeek).includes(normalized as DayOfWeek)) {
        return null;
    }

    return normalized as DayOfWeek;
}

export function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map(Number);

    return hours * 60 + minutes;
}

export function checkTimeOverlap(
    newOpenTime: string,
    newCloseTime: string,
    existingOpenTime: string,
    existingCloseTime: string
): boolean {
    const newOpen = timeToMinutes(newOpenTime);
    const newClose = timeToMinutes(newCloseTime);
    const existingOpen = timeToMinutes(existingOpenTime);
    const existingClose = timeToMinutes(existingCloseTime);

    return newOpen < existingClose && newClose > existingOpen;
}