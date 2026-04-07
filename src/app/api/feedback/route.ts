// src/app/api/feedback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cache, CACHE_KEYS, CACHE_TTL } from "@/lib/redis";
import { feedbackSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";

// POST /api/feedback — Submit new feedback
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId, method: "POST", path: "/api/feedback" });

  try {
    const body = await request.json();

    // Validate input
    const parsed = feedbackSchema.safeParse(body);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      log.warn({ errors }, "Validation failed");
      return NextResponse.json(
        { error: "Validation failed", details: errors },
        { status: 400 }
      );
    }

    // Save to database
    const feedback = await db.feedback.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        message: parsed.data.message,
        category: parsed.data.category,
      },
    });

    log.info({ feedbackId: feedback.id }, "Feedback created");

    // Invalidate cache so the admin page shows fresh data
    try {
      await cache.del(CACHE_KEYS.ALL_FEEDBACK);
      log.info("Cache invalidated");
    } catch (cacheErr) {
      // Cache invalidation failure is not fatal — the cache will expire on its own
      log.warn({ err: cacheErr }, "Failed to invalidate cache");
    }

    return NextResponse.json(
      {
        message: "Feedback submitted successfully",
        id: feedback.id,
      },
      { status: 201 }
    );
  } catch (err) {
    log.error({ err }, "Failed to create feedback");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/feedback — List all feedback (with caching)
export async function GET() {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId, method: "GET", path: "/api/feedback" });

  try {
    // Try cache first
    try {
      const cached = await cache.get(CACHE_KEYS.ALL_FEEDBACK);
      if (cached) {
        log.info("Cache hit");
        const data = JSON.parse(cached);
        return NextResponse.json(
          { data, meta: { cacheHit: true, count: data.length } },
          {
            status: 200,
            headers: { "X-Cache": "HIT" },
          }
        );
      }
    } catch (cacheErr) {
      log.warn({ err: cacheErr }, "Cache read failed, falling back to database");
    }

    // Cache miss — query database
    log.info("Cache miss, querying database");
    const feedback = await db.feedback.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Store in cache
    try {
      await cache.set(
        CACHE_KEYS.ALL_FEEDBACK,
        JSON.stringify(feedback),
        CACHE_TTL
      );
      log.info({ ttl: CACHE_TTL }, "Cache populated");
    } catch (cacheErr) {
      log.warn({ err: cacheErr }, "Failed to populate cache");
    }

    return NextResponse.json(
      { data: feedback, meta: { cacheHit: false, count: feedback.length } },
      {
        status: 200,
        headers: { "X-Cache": "MISS" },
      }
    );
  } catch (err) {
    log.error({ err }, "Failed to fetch feedback");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
