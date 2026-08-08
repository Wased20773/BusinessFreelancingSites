import "server-only";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3BucketName, s3Client } from "./client";

export async function getObjectUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: s3BucketName,
    Key: key,
  });

  return getSignedUrl(s3Client, command, {
    expiresIn: 3600,
  });
}
