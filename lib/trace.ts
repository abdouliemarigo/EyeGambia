import { NextResponse } from "next/server";
import { createTraceId, recordEvent } from "./observability";

export async function withTrace(
  req: Request,
  route: string,
  handler: (ctx: { traceId: string; started: number }) => Promise<Response>
) {
  const traceId = createTraceId();
  const started = Date.now();
  const method = req.method;
  await recordEvent({
    traceId, requestId: traceId, route, event: "request", method,
    timestamp: new Date().toISOString(),
  });

  try {
    const response = await handler({ traceId, started });
    const latencyMs = Date.now() - started;
    response.headers.set("x-eyegambia-trace-id", traceId);
    await recordEvent({
      traceId, requestId: traceId, route, event: "response", method,
      status: response.status, latencyMs, timestamp: new Date().toISOString()
    });
    return response;
  } catch (error) {
    const latencyMs = Date.now() - started;
    await recordEvent({
      traceId, requestId: traceId, route, event: "error", method,
      status: 500, latencyMs, errorCode: error instanceof Error ? error.name : "UNKNOWN",
      timestamp: new Date().toISOString()
    });
    console.error(`[EyeGambia:${traceId}]`, error);
    return NextResponse.json(
      { error: "Internal server error", traceId },
      { status: 500, headers: { "x-eyegambia-trace-id": traceId } }
    );
  }
}