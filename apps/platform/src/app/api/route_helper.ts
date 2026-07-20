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
*   Gets the slug from the HTTP request via the search param.
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
*   Corresponding select "items" in the query.
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

/*
*   Checks the model's current order value and returns the incremented
*   value of it. If there were no records for that model then automatically
*   return 1.
**/
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

/*
*   Generates the slug from a given value string. It removes whitespace, converts 
*   everything to lowercase, removes everything except letters, numbers, spaces, and 
*   hyphens, converts one or more spaces into a single hyphen, and collapse multiple
*   hyphens into one.
* 
*   Example:
*       Example Street -> example-street
*       The #1 Store -> the-1-store
*       Menu (Lunch) -> menu-lunch
*       Rice & Beans -> rice-beans
**/
export function createSlug(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
}

/*
*   Normalizes string to DayOfWeek string value and returns value when its included
*   in the DayOfWeek type.
**/
export function normalizeDayOfWeek(value: string): DayOfWeek | null {
    const normalized = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

    if (!Object.values(DayOfWeek).includes(normalized as DayOfWeek)) {
        return null;
    }

    return normalized as DayOfWeek;
}

/*
*   Converts a string time to minutes by spliting the time formate, HH:MM, by the colon.
*   
*   Example:
*       12:00 -> 12 * 60 + 0 -> 720
*       15:30 -> 15 * 60 + 30 -> 930
*       23:59 -> 23 * 60 + 59 -> 1439
**/
export function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map(Number);

    return hours * 60 + minutes;
}

/*
*   Checks if the new time provided is overlapping from the existing time. Uses timeToMinutes()
*   helper function to calculate minutes. Uses calculated value to determine ranges of existing and 
*   newly provided times.
* 
*   Example:
*       (newOpen = 720, newClose = 900), (existingOpen = 780, existingClose = 960)
*           -> returns False -> Reason: newClose overlaps with existingOpen time
**/
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

/*
*   Validates an images existence, size, and type.
**/
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