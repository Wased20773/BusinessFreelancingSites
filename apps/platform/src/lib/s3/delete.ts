import "server-only";
import { DeleteObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { s3BucketName, s3Client } from "./client";

// S3 accepts at most 1000 keys per DeleteObjects request
const MAX_KEYS_PER_DELETE = 1000;

/**
 * Deletes the object stored at the exact S3 key provided.
 */
export async function deleteObject(key: string): Promise<void> {
    await s3Client.send(
        new DeleteObjectCommand({
            Bucket: s3BucketName,
            Key: key,
        })
    );
}

/**
 * Deletes many objects by their exact keys, in batches of 1000. Keys that do
 * not exist count as deleted. Returns the keys S3 reported it could not delete
 * so the caller can log them; it does not throw for those.
 */
export async function deleteObjects(keys: string[]): Promise<string[]> {
    const uniqueKeys = [...new Set(keys)];
    const failedKeys: string[] = [];

    for (let start = 0; start < uniqueKeys.length; start += MAX_KEYS_PER_DELETE) {
        const batch = uniqueKeys.slice(start, start + MAX_KEYS_PER_DELETE);

        const result = await s3Client.send(
            new DeleteObjectsCommand({
                Bucket: s3BucketName,
                Delete: {
                    Objects: batch.map((key) => ({ Key: key })),
                    Quiet: true,
                },
            })
        );

        for (const error of result.Errors ?? []) {
            if (error.Key) failedKeys.push(error.Key);
        }
    }

    return failedKeys;
}
