// src/lib/redis.ts
import logger from "./logger";

// Cache interface — same API whether backed by Redis or in-memory Map
interface CacheStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl: number): Promise<void>;
  del(key: string): Promise<void>;
}

// In-memory cache with TTL support
class MemoryCache implements CacheStore {
  private store = new Map<string, { value: string; expiresAt: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttl: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttl * 1000,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
}

// Redis-backed cache
async function createRedisCache(): Promise<CacheStore | null> {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  try {
    const { default: Redis } = await import("ioredis");
    const client = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) {
          logger.error(`Redis retry limit reached after ${times} attempts`);
          return null;
        }
        return Math.min(times * 200, 2000);
      },
      connectTimeout: 5000,
    });

    client.on("connect", () => logger.info("Redis connected"));
    client.on("error", (err) => logger.error({ err }, "Redis connection error"));

    return {
      async get(key) {
        return client.get(key);
      },
      async set(key, value, ttl) {
        await client.setex(key, ttl, value);
      },
      async del(key) {
        await client.del(key);
      },
    };
  } catch {
    return null;
  }
}

// Singleton setup
const globalForCache = globalThis as unknown as {
  cache: CacheStore | undefined;
};

function createCache(): CacheStore {
  if (process.env.REDIS_URL) {
    // Attempt Redis — but start with MemoryCache and swap once Redis connects
    const memoryFallback = new MemoryCache();
    createRedisCache().then((redisCache) => {
      if (redisCache) {
        globalForCache.cache = redisCache;
        logger.info("Cache: upgraded to Redis");
      }
    });
    logger.info("Cache: starting with in-memory (Redis connecting...)");
    return memoryFallback;
  }

  logger.info("Cache: using in-memory Map (no REDIS_URL set)");
  return new MemoryCache();
}

export const cache = globalForCache.cache ?? createCache();

if (process.env.NODE_ENV !== "production") {
  globalForCache.cache = cache;
}

// Cache key constants
export const CACHE_KEYS = {
  ALL_FEEDBACK: "feedback:all",
} as const;

export const CACHE_TTL = 60; // seconds
