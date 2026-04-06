// src/lib/redis.ts
import Redis from "ioredis";
import { logger } from "./logger";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL;

  if (!url) {
    logger.warn("REDIS_URL not set — Redis caching is disabled");
    // Return a client that will fail gracefully
    return new Redis({ lazyConnect: true, maxRetriesPerRequest: 0 });
  }

  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) {
        logger.error(`Redis retry limit reached after ${times} attempts`);
        return null; // Stop retrying
      }
      return Math.min(times * 200, 2000); // Exponential backoff, max 2s
    },
    connectTimeout: 5000,
  });

  client.on("connect", () => {
    logger.info("Redis connected");
  });

  client.on("error", (err) => {
    logger.error({ err }, "Redis connection error");
  });

  return client;
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

// Cache key constants
export const CACHE_KEYS = {
  ALL_FEEDBACK: "feedback:all",
} as const;

export const CACHE_TTL = 60; // seconds
