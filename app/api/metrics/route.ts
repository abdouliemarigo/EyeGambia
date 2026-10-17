import { NextResponse } from "next/server";
import { getMonitoringSnapshot } from "../../../lib/observability";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const expected = process.env.EYEGAMBIA_METRICS_TOKEN;
  if (!expected) return NextResponse.json({ error: "Metrics endpoint is not configured." }, { status: 503 });
  const supplied = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!supplied || supplied !== expected) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await getMonitoringSnapshot(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Monitoring backend unavailable." }, { status: 503 });
  }
}
