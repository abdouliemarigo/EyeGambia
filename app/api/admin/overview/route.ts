import { NextResponse } from "next/server";
import { getMemoryEvents, getMonitoringSnapshot, summarize } from "@/lib/observability";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const expected = process.env.EYEGAMBIA_METRICS_TOKEN;
  const supplied = req.headers.get("x-eyegambia-admin-token") || "";
  if (!expected || supplied !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const redisConfigured = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  const remote = await getMonitoringSnapshot();
  return NextResponse.json({
    health: {
      ok: true,
      aiConfigured: Boolean(process.env.OPENAI_API_KEY),
      redis: redisConfigured ? "connected/configured" : "local fallback",
      rateLimitMode: redisConfigured ? "distributed" : "local"
    },
    metrics: { ...summarize(getMemoryEvents()), remote },
    events: getMemoryEvents()
  }, { headers: { "Cache-Control": "no-store" } });
}