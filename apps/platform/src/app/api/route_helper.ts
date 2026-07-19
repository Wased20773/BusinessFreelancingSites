import { NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';
import { DayOfWeek, Prisma } from "@business-freelancer/database";
import { isSupportedImageContentType } from "@/lib/s3/keys";

type OrderModel = {
    findFirst: (args: {
        where: Record<string, unknown>;
        orderBy: { order: 'desc' };
        select: { order: true };
    }) => Promise<{ order: number } | null>;
}

type BusinessResourceName =
    | "business"
    | "category"
    | "contact"
    | "location"
    | "menu"
    | "social"

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2 MB

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
    select: T,
    resourceName: BusinessResourceName,
): Promise<NextResponse> {
    try {
        const business = await prisma.business.findUnique({
            where: { slug: slug },
            select,
        });

        if (!business) {
            return NextResponse.json(
                { error: `Business not found while fetching ${resourceName} data` },
                { status: 404 }
            );
        }

        return NextResponse.json(business, { status: 200 });
    } catch (error) {
        console.error(`Failed to fetch ${resourceName} data:`, error);

        return NextResponse.json(
            { error: `Failed to fetch ${resourceName} data` },
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
        console.error("Failed to determine the next order:", error);
        return NextResponse.json(
            { error: "Failed to determine the next order" },
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

export async function imageRequestValidation(request: Request): Promise<NextResponse | File> {
    try {
        // Get the image from form-data
        const formData = await request.formData();
        const image = formData.get("image");
    
        // Check if an image was sent
        if (!(image instanceof File)) {
            return NextResponse.json(
                { error: 'Missing image file. Please submit the file using the "image" form-data field' },
                { status: 400 }
            );
        }

        // Check if the image size exist
        if (image.size === 0) {
            return NextResponse.json(
                { error: "The uploaded image is empty" },
                { status: 400 }
            );
        }

        // Check if image payload exceeds max image size
        if (image.size > MAX_IMAGE_SIZE) {
            return NextResponse.json(
                { error: "The image cannot be larger than 2 MB" },
                { status: 413 }
            );
        }

        // Check for image type support
        if (!isSupportedImageContentType(image.type)) {
            return NextResponse.json(
                { error: "Unsupported image type. Only JPEG, PNG, and WebP images are allowed." },
                { status: 415 }
            );
        }

        return image;
    } catch (error) {
        console.error("Failed to parse the image form data:", error);
        
        return NextResponse.json(
            { error: "Failed to get form data from request"},
            { status: 400 }
        );
    }
}