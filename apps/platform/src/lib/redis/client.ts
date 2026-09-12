import "server-only";

import { createClient } from "redis";

const redis = createClient({
  url: process.env.REDIS_URL,
});

redis.on("error", (error) => {
  console.error("Redis Client Error:", error);
});

if (!redis.isOpen) {
  await redis.connect();
}

export default redis;
