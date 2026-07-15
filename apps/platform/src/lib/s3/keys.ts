const IMAGE_EXTENSION_BY_CONTENT_TYPE = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
} as const;

export type SupportedImageContentType = keyof typeof IMAGE_EXTENSION_BY_CONTENT_TYPE;

export function isSupportedImageContentType(
    contentType: string
): contentType is SupportedImageContentType {
    return contentType in IMAGE_EXTENSION_BY_CONTENT_TYPE;
}

export function createItemImageKey({
    businessId,
    itemId,
    contentType
}: {
    businessId: string;
    itemId: string;
    contentType: SupportedImageContentType;
}): string {
    const extension = IMAGE_EXTENSION_BY_CONTENT_TYPE[contentType];
    return `businesses/${businessId}/items/${itemId}.${extension}`;
}