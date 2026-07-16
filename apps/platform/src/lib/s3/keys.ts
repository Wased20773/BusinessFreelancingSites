const IMAGE_EXTENSION_BY_CONTENT_TYPE = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
} as const;

type ImageExtension = "jpg" | "png" | "webp";

export type SupportedImageContentType = keyof typeof IMAGE_EXTENSION_BY_CONTENT_TYPE;

export function isSupportedImageContentType(
    contentType: string
): contentType is SupportedImageContentType {
    return contentType in IMAGE_EXTENSION_BY_CONTENT_TYPE;
}

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