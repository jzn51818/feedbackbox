// src/lib/request-logger.ts
import { NextRequest, NextResponse } from "next/server";
import logger from "./logger";

export interface RequestContext {
  requestId: string;
  startTime: number;
}

export function createRequestContext(): RequestContext {
  return {
    requestId: crypto.randomUUID(),
    startTime: Date.now(),
  };
}

export function logRequest(
  req: NextRequest,
  res: NextResponse,
  ctx: RequestContext
) {
  const durationMs = Date.now() - ctx.startTime;
  const url = new URL(req.url);

  logger.info(
    {
      event: "http_request",
      request_id: ctx.requestId,
      method: req.method,
      path: url.pathname,
      status: res.status,
      duration_ms: durationMs,
      user_agent: req.headers.get("user-agent") || "unknown",
    },
    `${req.method} ${url.pathname} ${res.status} ${durationMs}ms`
  );
}

/**
 * Wraps an API route handler with automatic request logging.
 * Usage:
 *   export const GET = withRequestLogging(async (req, ctx) => {
 *     // ctx.requestId is available here
 *     return NextResponse.json({ ok: true });
 *   });
 */
export function withRequestLogging(
  handler: (
    req: NextRequest,
    ctx: RequestContext
  ) => Promise<NextResponse>
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest) => {
    const ctx = createRequestContext();

    logger.debug(
      {
        event: "http_request_start",
        request_id: ctx.requestId,
        method: req.method,
        path: new URL(req.url).pathname,
      },
      `-> ${req.method} ${new URL(req.url).pathname}`
    );

    try {
      const res = await handler(req, ctx);
      logRequest(req, res, ctx);
      // Attach request ID to response headers for tracing
      res.headers.set("x-request-id", ctx.requestId);
      return res;
    } catch (error) {
      const durationMs = Date.now() - ctx.startTime;
      logger.error(
        {
          event: "http_request_error",
          request_id: ctx.requestId,
          method: req.method,
          path: new URL(req.url).pathname,
          duration_ms: durationMs,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
        `${req.method} ${new URL(req.url).pathname} ERROR`
      );

      return NextResponse.json(
        { error: "Internal server error", request_id: ctx.requestId },
        { status: 500 }
      );
    }
  };
}
