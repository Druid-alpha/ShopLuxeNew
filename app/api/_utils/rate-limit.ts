import { NextResponse, type NextRequest } from "next/server";

type RateLimitConfig = {
  keyPrefix: string;
  windowMs: number;
  max: number;
  message: string;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var rateLimitStore: Map<string, RateLimitEntry> | undefined;
}

const store = global.rateLimitStore || new Map<string, RateLimitEntry>();
global.rateLimitStore = store;

const getClientIp = (request: NextRequest) => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  const anyRequest = request as unknown as { ip?: string };
  return anyRequest.ip || "unknown";
};

export function enforceRateLimit(request: NextRequest, config: RateLimitConfig) {
  const now = Date.now();
  const ip = getClientIp(request);
  const key = `${config.keyPrefix}:${ip}`;

  const existing = store.get(key);
  const entry =
    existing && now < existing.resetAt
      ? existing
      : { count: 0, resetAt: now + config.windowMs };

  entry.count += 1;
  store.set(key, entry);

  if (entry.count > config.max) {
    const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return NextResponse.json(
      { message: config.message, retryAfterSeconds },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds) },
      }
    );
  }

  return null;
}
