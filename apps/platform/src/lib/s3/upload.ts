import "server-only";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3BucketName, s3Client } from "./client";

type UploadImageParameters = {
    key: string;
    body: Buffer;
    contentType: string;
};

export async function uploadImage({
    key,
    body,
    contentType,
}: UploadImageParameters): Promise<void> {
    await s3Client.send(
        new PutObjectCommand({
            Bucket: s3BucketName,
            Key: key,
            Body: body,
            ContentType: contentType,
            CacheControl: "public, max-age=31536000, immutable",
        })
    )
}
