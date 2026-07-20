import "server-only"; 
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3BucketName, s3Client } from "./client";

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