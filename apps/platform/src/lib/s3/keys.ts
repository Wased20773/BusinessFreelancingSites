const IMAGE_EXTENSION_BY_CONTENT_TYPE = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
} as const;

type ImageExtension = "jpg" | "png" | "webp";

export type SupportedImageContentType = keyof typeof IMAGE_EXTENSION_BY_CONTENT_TYPE;

/**
 * Narrows an arbitrary MIME type to one supported by the image pipeline.
 */
export function isSupportedImageContentType(
    contentType: string
): contentType is SupportedImageContentType {
    return contentType in IMAGE_EXTENSION_BY_CONTENT_TYPE;
}

/**
 * Builds the stable S3 location for an item's image. Including both IDs prevents 
 * images from different businesses or items from sharing a key.
 */
export function generateItemImageKey({
    businessId,
    itemId,
    extension,
}: {
    businessId: string;
    itemId: string;
    extension: ImageExtension;
}): string {
    return `businesses/${businessId}/items/${itemId}.${extension}`;
}