import "server-only";

import { CopyObjectCommand } from "@aws-sdk/client-s3";
import { s3BucketName, s3Client } from "./client";

/**
 * Copies an existing S3 object to a new key.
 */
export async function copyObject(
  oldKey: string,
  newKey: string,
): Promise<void> {
  await s3Client.send(
    new CopyObjectCommand({
      Bucket: s3BucketName,
      CopySource: `${s3BucketName}/${oldKey}`,
      Key: newKey,
    }),
  );
}
