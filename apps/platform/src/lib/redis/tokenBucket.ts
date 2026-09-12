import redis from "@/lib/redis/client";

type TokenBucketOptions = {
  key: string;
  capacity: number;
  tokensPerMinute: number;
  cost?: number;
};

export type TokenBucketResult = {
  allowed: boolean;
  remainingTokens: number;
  retryAfterMs: number;
};

const TOKEN_BUCKET_SCRIPT = `
  local key = KEYS[1]

  local capacity = tonumber(ARGV[1])
  local tokensPerMinute = tonumber(ARGV[2])
  local cost = tonumber(ARGV[3])
  local now = tonumber(ARGV[4])
  local ttl = tonumber(ARGV[5])

  local bucket = redis.call("HMGET", key, "tokens", "lastRefill")

  local tokens = tonumber(bucket[1])
  local lastRefill = tonumber(bucket[2])

  -- A bucket that does not exist starts completely full.
  if tokens == nil then
    tokens = capacity
  end

  if lastRefill == nil then
    lastRefill = now
  end

  -- Refill continuously based on how much time has passed.
  local elapsedMs = math.max(0, now - lastRefill)

  local refillAmount =
    (elapsedMs / 60000) * tokensPerMinute

  tokens = math.min(
    capacity,
    tokens + refillAmount
  )

  local allowed = 0
  local retryAfterMs = 0

  if tokens >= cost then
    tokens = tokens - cost
    allowed = 1
  else
    local missingTokens = cost - tokens

    retryAfterMs = math.ceil(
      (missingTokens / tokensPerMinute) * 60000
    )
  end

  -- Store the bucket's new state.
  redis.call(
    "HSET",
    key,
    "tokens",
    tokens,
    "lastRefill",
    now
  )

  -- Remove abandoned buckets eventually.
  redis.call("PEXPIRE", key, ttl)

  return {
    allowed,
    tostring(tokens),
    retryAfterMs
  }
`;

export const consumeToken = async ({
  key,
  capacity,
  tokensPerMinute,
  cost = 1,
}: TokenBucketOptions): Promise<TokenBucketResult> => {
  if (capacity <= 0) {
    throw new Error("Token bucket capacity must be greater than 0.");
  }

  if (tokensPerMinute <= 0) {
    throw new Error("Token bucket refill rate must be greater than 0.");
  }

  if (cost <= 0) {
    throw new Error("Token bucket cost must be greater than 0.");
  }

  if (cost > capacity) {
    throw new Error("Token bucket cost cannot be greater than its capacity.");
  }

  const now = Date.now();

  /*
   * Keep an unused bucket around long enough for it to refill completely,
   * plus one additional minute.
   *
   * Redis can safely delete the bucket after that because recreating it as
   * full would produce the exact same effective state.
   */
  const fullRefillTimeMs = (capacity / tokensPerMinute) * 60_000;

  const ttlMs = Math.ceil(fullRefillTimeMs + 60_000);

  const result = await redis.eval(TOKEN_BUCKET_SCRIPT, {
    keys: [key],
    arguments: [
      capacity.toString(),
      tokensPerMinute.toString(),
      cost.toString(),
      now.toString(),
      ttlMs.toString(),
    ],
  });

  if (!Array.isArray(result) || result.length !== 3) {
    throw new Error("Redis returned an invalid token bucket result.");
  }

  const allowed = Number(result[0]) === 1;
  const remainingTokens = Number(result[1]);
  const retryAfterMs = Number(result[2]);

  return {
    allowed,
    remainingTokens,
    retryAfterMs,
  };
};
