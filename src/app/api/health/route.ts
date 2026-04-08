// src/app/api/health/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cache } from "@/lib/redis";
import logger from "@/lib/logger";

const startTime = Date.now();

interface DependencyStatus {
  status: "ok" | "error";
  latency_ms?: number;
  error?: string;
}

export async function GET() {
  const checks: Record<string, DependencyStatus> = {};
  let healthy = true;

  // Check database
  const dbStart = Date.now();
  try {
    await db.$queryRawUnsafe("SELECT 1");
    checks.database = {
      status: "ok",
      latency_ms: Date.now() - dbStart,
    };
  } catch (error) {
    healthy = false;
    checks.database = {
      status: "error",
      latency_ms: Date.now() - dbStart,
      error: error instanceof Error ? error.message : "Unknown error",
    };
    logger.error(
      { event: "health_check_failed", dependency: "database", error },
      "Database health check failed"
    );
  }

  // Check cache (write/read/delete cycle since CacheStore has no ping)
  const cacheStart = Date.now();
  try {
    const healthKey = "health:check";
    await cache.set(healthKey, "ok", 10);
    const value = await cache.get(healthKey);
    await cache.del(healthKey);
    checks.cache = {
      status: value === "ok" ? "ok" : "error",
      latency_ms: Date.now() - cacheStart,
    };
    if (value !== "ok") {
      healthy = false;
    }
  } catch (error) {
    healthy = false;
    checks.cache = {
      status: "error",
      latency_ms: Date.now() - cacheStart,
      error: error instanceof Error ? error.message : "Unknown error",
    };
    logger.error(
      { event: "health_check_failed", dependency: "cache", error },
      "Cache health check failed"
    );
  }

  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  const response = {
    status: healthy ? "healthy" : "unhealthy",
    version: process.env.APP_VERSION || "0.1.0",
    uptime_seconds: uptimeSeconds,
    timestamp: new Date().toISOString(),
    checks,
  };

  if (!healthy) {
    logger.warn(
      { event: "health_check_unhealthy", checks },
      "Health check returned unhealthy"
    );
  }

  return NextResponse.json(response, {
    status: healthy ? 200 : 503,
  });
}
