import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const limiters = new Map<number, Ratelimit>();
const local = new Map<string, { started: number; count: number }>();

function getLimiter(limit: number) {
  const existing = limiters.get(limit);
  if (existing) return existing;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const created = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(limit, "60 s"),
    prefix: `eyegambia:ratelimit:${limit}`
  });
  limiters.set(limit, created);
  return created;
}

export async function enforceRateLimit(identifier: string, limit = 20) {
  const remote = getLimiter(limit);
  if (remote) {
    const result = await remote.limit(identifier);
    return { allowed: result.success, remaining: result.remaining, reset: result.reset, distributed: true };
  }

  const now = Date.now();
  const current = local.get(identifier);
  if (!current || now - current.started >= 60_000) {
    local.set(identifier, { started: now, count: 1 });
    return { allowed: true, remaining: limit - 1, reset: now + 60_000, distributed: false };
  }
  current.count += 1;
  return { allowed: current.count <= limit, remaining: Math.max(0, limit - current.count), reset: current.started + 60_000, distributed: false };
}

export function getClientIdentifier(req: Request, userId?: string | null) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  return userId ? `user:${userId}` : `ip:${ip}`;
}
