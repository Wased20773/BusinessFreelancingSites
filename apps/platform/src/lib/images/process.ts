import "server-only";
import sharp from "sharp";

type ImageExtension = "jpg" | "png" | "webp";

type ProcessedImage = {
    buffer: Buffer;
    contentType: string;
    extension: ImageExtension;
};

/**
 * Converts an uploaded image to WebP and keeps that version only when it is
 * smaller than the original. Sharp's rotation also applies EXIF orientation.
 */
export async function processImage(image: File): Promise<ProcessedImage> {
    const originalBuffer = Buffer.from(
        await image.arrayBuffer()
    );

    const webpBuffer = await sharp(originalBuffer).rotate().webp({quality: 80, alphaQuality: 100}).toBuffer();

    // Is Sharp's processed image lower than the original?
    if (webpBuffer.length < originalBuffer.length) {
        return {
            buffer: webpBuffer,
            contentType: "image/webp",
            extension: "webp",
        }
    }

    // Return the original processed image as it is smaller
    return {
        buffer: originalBuffer,
        contentType: image.type,
        extension: getImageExtension(image.type),
    }
}

/** 
 *  Maps a supported image MIME type to the extension used in its S3 key.
 */
function getImageExtension(
    contentType: string
): ImageExtension {
    switch (contentType) {
        case "image/jpeg":
            return "jpg";

        case "image/png":
            return "png";

        case "image/webp":
            return "webp";

        default:
            throw new Error("Unsupported image content type");
    }
}