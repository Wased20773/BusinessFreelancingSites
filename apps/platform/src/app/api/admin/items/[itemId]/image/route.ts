import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { prisma } from "@/lib/prisma";
import { createItemImageKey, isSupportedImageContentType } from "@/lib/s3/keys";
import { uploadImage } from "@/lib/s3/upload";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2 MB

// POST /api/admin/items/[itemId]/image
export async function POST(
    request: Request,
    { params }: { params: Promise<{ itemId: string }> }
): Promise<NextResponse> {
    try {
        const authResult = await authenticateBusinessAccess(
            request,
            [AccessLevel.owner, AccessLevel.admin]
        );

        if (authResult instanceof NextResponse) return authResult;

        const { businessId } = authResult;
        const { itemId } = await params;

        if (!itemId) {
            return NextResponse.json(
                { error: "Missing itemId" },
                { status: 400 }
            );
        }

        const item = await prisma.item.findFirst({
            where: {
                id: itemId,
                businessId: businessId,
            },
            select: {
                id: true,
                businessId: true,
                imageKey: true,
            },
        });

        if (!item) {
            return NextResponse.json(
                { error: "Item not found" },
                { status: 404 }
            );
        }

        // POST the image (not replace)
        if (item.imageKey) {
            return NextResponse.json(
                { error: "Please use the image replacement instead" },
                { status: 409 }
            );
        }

        const formData = await request.formData();
        const image = formData.get("image");

        if (!(image instanceof File)) {
            return NextResponse.json(
                { error: 'Missing image file. Submit the file using "image" form-data field' },
                { status: 400 }
            );
        }

        if (image.size === 0) {
            return NextResponse.json(
                { error: "The uploaded image is empty" },
                { status: 400 }
            );
        }

        if (image.size > MAX_IMAGE_SIZE) {
            return NextResponse.json(
                { error: "The image cannot be larger than 2 MB" },
                { status: 413}
            );
        }

        if (!isSupportedImageContentType(image.type)) {
            return NextResponse.json(
                { error: "Unsupported image type. Only JPEG, PNG, and WebP images are allowed." },
                { status: 415 }
            );
        }

        const imageKey = createItemImageKey({
            businessId: item.businessId,
            itemId: item.id,
            contentType: image.type,
        });

        const imageBuffer = Buffer.from(
            await image.arrayBuffer()
        );

        // Attempt to upload the image first before adding it to the database
        await uploadImage({
            key: imageKey,
            body: imageBuffer,
            contentType: image.type,
        });

        // Now update the items imageKey after image upload
        const updatedItem = await prisma.item.update({
            where: { id: item.id },
            data: { imageKey: imageKey },
            select: {
                id: true,
                imageKey: true,
            },
        });

        return NextResponse.json(
            { message: "Item image uploaded ", item: updatedItem},
            { status: 201 }
        );
    } catch (error) {
        return NextResponse.json(
            { error: `Failed to upload item image: ${error}` },
            { status: 500 }
        );
    }
}

// PATCH /api/admin/items/[itemId]/image
// export async function PATCH(
//     request: Request,
//     { params }: { params: Promise<{ itemId: string }> }
// ): Promise<NextResponse> {
//     try {

//     } catch (error) {
//         return NextResponse.json(
//             { error: "Failed to replace item image" },
//             { status: 500 }
//         );
//     }
// }