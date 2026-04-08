// src/app/api/feedback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withRequestLogging, RequestContext } from "@/lib/request-logger";
import logger from "@/lib/logger";
import { db } from "@/lib/db";
import { cache, CACHE_KEYS, CACHE_TTL } from "@/lib/redis";
import { feedbackSchema } from "@/lib/validation";

// ---- POST /api/feedback ----
export const POST = withRequestLogging(
  async (req: NextRequest, ctx: RequestContext) => {
    const body = await req.json();

    // Validate input
    const parsed = feedbackSchema.safeParse(body);
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      logger.warn(
        {
          event: "feedback_validation_failed",
          request_id: ctx.requestId,
          errors,
        },
        "Feedback validation failed"
      );
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

    logger.info(
      {
        event: "feedback_created",
        request_id: ctx.requestId,
        feedback_id: feedback.id,
        category: feedback.category,
      },
      `Feedback created: ${feedback.id}`
    );

    // Invalidate cache so the admin page shows fresh data
    try {
      await cache.del(CACHE_KEYS.ALL_FEEDBACK);
      logger.debug(
        {
          event: "cache_invalidated",
          request_id: ctx.requestId,
          key: CACHE_KEYS.ALL_FEEDBACK,
        },
        `Cache invalidated: ${CACHE_KEYS.ALL_FEEDBACK}`
      );
    } catch (cacheErr) {
      logger.warn(
        {
          event: "cache_invalidation_failed",
          request_id: ctx.requestId,
          key: CACHE_KEYS.ALL_FEEDBACK,
          error: cacheErr instanceof Error ? cacheErr.message : String(cacheErr),
        },
        "Failed to invalidate cache"
      );
    }

    return NextResponse.json(
      { message: "Feedback submitted successfully", id: feedback.id },
      { status: 201 }
    );
  }
);

// ---- GET /api/feedback ----
export const GET = withRequestLogging(
  async (req: NextRequest, ctx: RequestContext) => {
    // Check cache
    try {
      const cached = await cache.get(CACHE_KEYS.ALL_FEEDBACK);
      if (cached) {
        logger.info(
          {
            event: "cache_hit",
            request_id: ctx.requestId,
            key: CACHE_KEYS.ALL_FEEDBACK,
          },
          `Cache hit: ${CACHE_KEYS.ALL_FEEDBACK}`
        );
        const data = JSON.parse(cached);
        return NextResponse.json(
          { data, meta: { cacheHit: true, count: data.length } },
          { status: 200, headers: { "X-Cache": "HIT" } }
        );
      }
    } catch (cacheErr) {
      logger.warn(
        {
          event: "cache_read_failed",
          request_id: ctx.requestId,
          key: CACHE_KEYS.ALL_FEEDBACK,
          error: cacheErr instanceof Error ? cacheErr.message : String(cacheErr),
        },
        "Cache read failed, falling back to database"
      );
    }

    // Cache miss — query database
    logger.info(
      {
        event: "cache_miss",
        request_id: ctx.requestId,
        key: CACHE_KEYS.ALL_FEEDBACK,
      },
      `Cache miss: ${CACHE_KEYS.ALL_FEEDBACK}`
    );

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
      logger.debug(
        {
          event: "cache_populated",
          request_id: ctx.requestId,
          key: CACHE_KEYS.ALL_FEEDBACK,
          ttl: CACHE_TTL,
        },
        `Cache populated: ${CACHE_KEYS.ALL_FEEDBACK}`
      );
    } catch (cacheErr) {
      logger.warn(
        {
          event: "cache_write_failed",
          request_id: ctx.requestId,
          key: CACHE_KEYS.ALL_FEEDBACK,
          error: cacheErr instanceof Error ? cacheErr.message : String(cacheErr),
        },
        "Failed to populate cache"
      );
    }

    return NextResponse.json(
      { data: feedback, meta: { cacheHit: false, count: feedback.length } },
      { status: 200, headers: { "X-Cache": "MISS" } }
    );
  }
);
