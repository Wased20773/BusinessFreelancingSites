import "server-only";
import { S3Client } from "@aws-sdk/client-s3";

// Set region
const region = process.env.AWS_REGION;
if (!region) {
    throw new Error("Missing AWS_REGION environment variable");
}
export const s3Client = new S3Client({ region });

// Set bucket
export const s3BucketName = process.env.AWS_S3_BUCKET_NAME;
if (!s3BucketName) {
    throw new Error("Missing AWS_S3_BUCKET_NAME environment variable");
}
