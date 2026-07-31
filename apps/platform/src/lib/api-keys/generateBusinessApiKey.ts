import { createHash, randomBytes } from "node:crypto";

const API_KEY_PREFIX = "bp_";

export function generateBusinessApiKey() {
  const secret = randomBytes(32).toString("hex");
  const apiKey = `${API_KEY_PREFIX}${secret}`;

  const keyHash = hashBusinessApiKey(apiKey);
  const keyPrefix = apiKey.slice(0, 10);

  return {
    apiKey,
    keyHash,
    keyPrefix,
  };
}

export function hashBusinessApiKey(apiKey: string) {
  return createHash("sha256").update(apiKey).digest("hex");
}
