import { imageRequestValidation } from "@/app/api/route_helper";
import { authenticateBusinessAccess } from "@/lib/auth/authenticateBusinessAccess";
import { processImage } from "@/lib/images/process";
import { prisma } from "@/lib/prisma";
import { deleteObject } from "@/lib/s3/delete";
import { generateItemImageKey} from "@/lib/s3/keys";
import { uploadImage } from "@/lib/s3/upload";
import { AccessLevel } from "@business-freelancer/database";
import { NextResponse } from "next/server";

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
                { error: "You cannot add to an item with an existing imageKey. Please use replace instead" },
                { status: 409 }
            );
        }

        // Validate the image
        const image = await imageRequestValidation(request);

        if (image instanceof NextResponse) return image;

        // Process image
        const processedImage = await processImage(image);

        // Generate the imageKey for the item
        const imageKey = generateItemImageKey({
            businessId: item.businessId,
            itemId: item.id,
            extension: processedImage.extension,
        });

        // Attempt to upload the image first before adding it to the database
        await uploadImage({
            key: imageKey,
            body: processedImage.buffer,
            contentType: processedImage.contentType,
        });

        let updatedItem;

        try {
            // Now update the items imageKey after image upload
            updatedItem = await prisma.item.update({
                where: { id: item.id },
                data: { imageKey: imageKey },
                select: {
                    id: true,
                    imageKey: true,
                    updatedAt: true,
                },
            });
    
            return NextResponse.json(
                { message: "Item image uploaded", item: updatedItem},
                { status: 201 }
            );
        } catch (error) {
            try {
                await deleteObject(imageKey);
            } catch (cleanupError) {
                console.error("Failed to clean up uploaded image after database failure:", cleanupError);
            }

            throw error;
        }
    } catch (error) {
        console.error("Failed to add image to item:", error);

        return NextResponse.json(
            { error: "Failed to upload image to the item" },
            { status: 500 }
        );
    }
}

// PATCH /api/admin/items/[itemId]/image
export async function PATCH(
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

        // imageKey must exist first to do a PATCH request
        if (!item.imageKey) {
            return NextResponse.json(
                { error: "This item does not currently have an image in our records. Please upload an image to this item first" },
                { status: 409 }
            );
        }

        // Validate the image
        const image = await imageRequestValidation(request);

        if (image instanceof NextResponse) return image;

        // Process image
        const processedImage = await processImage(image);

        // Attempt to upload the image
        await uploadImage({
            key: item.imageKey,
            body: processedImage.buffer,
            contentType: processedImage.contentType,
        });

        // Make sure the item gets "updated"
        const updatedItem = await prisma.item.update({
            where: { id: item.id },
            data: { updatedAt: new Date() },
            select: {
                id: true,
                imageKey: true,
                updatedAt: true,
            },
        });

        // Return success, no need to retrieve the item
        return NextResponse.json(
            { message: "Item image replaced successfully", item: updatedItem },
            { status: 200 }
        );
    } catch (error) {
        console.error("Failed to update image to item:", error);

        return NextResponse.json(
            { error: "Failed to replace the image to the item" },
            { status: 500 }
        );
    }
}

// DELETE /api/admin/items/[itemId]/image
export async function DELETE(
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
                imageKey: true,
            },
        });

        if (!item) {
            return NextResponse.json(
                { error: "Item was not found" },
                { status: 404 }
            );
        }

        if (!item.imageKey) {
            return NextResponse.json(
                { error: "This item does not have an image" },
                { status: 404 }
            );
        }

        // Create rollback to imageKey
        const oldImageKey = item.imageKey;
        
        // Update item's imageKey to null
        const updatedItem = await prisma.item.update({
            where: { id: itemId },
            data: { imageKey: null },
            select: {
                id: true,
                imageKey: true,
                updatedAt: true,
            },
        });

        try {
            // Delete the image from s3 storage
            await deleteObject(oldImageKey);
        } catch (error) {
            try {
                await prisma.item.update({
                    where: { id: itemId },
                    data: { imageKey: oldImageKey },
                });
            } catch (rollbackError) {
                console.error(
                    "Failed to restore imageKey after S3 deletion failure:",
                    rollbackError
                );
            }

            throw error;
        }

        return NextResponse.json(
            { message: "Item image deleted successfully", item: updatedItem },
            { status: 200 }
        );
    } catch (error) {
        console.error("Failed to delete image from item:", error);

        return NextResponse.json(
            { error: "Failed to delete the image from the item" },
            { status: 500 }
        );
    }
}