import { Redis } from "@upstash/redis";
import crypto from "node:crypto";

export type TraceEvent = {
  traceId: string;
  requestId: string;
  route: string;
  event: "request" | "response" | "error" | "ai_usage";
  method?: string;
  status?: number;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd?: number;
  latencyMs?: number;
  userType?: "guest" | "authenticated" | "system";
  errorCode?: string;
  timestamp: string;
};

const memoryEvents: TraceEvent[] = [];
const MAX_EVENTS = 2000;
let redis: Redis | null | undefined;

function getRedis() {
  if (redis !== undefined) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  redis = url && token ? new Redis({ url, token }) : null;
  return redis;
}

export function createTraceId() { return crypto.randomUUID(); }

export function estimateOpenAICost(model: string, inputTokens = 0, outputTokens = 0) {
  const key = model.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
  const inputPer1M = Number(process.env[`${key}_INPUT_USD_PER_1M`] ?? 0);
  const outputPer1M = Number(process.env[`${key}_OUTPUT_USD_PER_1M`] ?? 0);
  return (inputTokens / 1_000_000) * inputPer1M + (outputTokens / 1_000_000) * outputPer1M;
}

export async function recordEvent(event: TraceEvent) {
  memoryEvents.push(event);
  if (memoryEvents.length > MAX_EVENTS) memoryEvents.splice(0, memoryEvents.length - MAX_EVENTS);
  const r = getRedis();
  if (!r) return;
  try {
    await r.lpush("eyegambia:observability:events", JSON.stringify(event));
    await r.ltrim("eyegambia:observability:events", 0, 4999);
    await r.expire("eyegambia:observability:events", 60 * 60 * 24 * 30);
    if (event.event === "request") await r.incr("eyegambia:observability:requests");
    if (event.event === "error") await r.incr("eyegambia:observability:errors");
    if (event.event === "ai_usage") {
      await r.incrby("eyegambia:observability:input_tokens", event.inputTokens ?? 0);
      await r.incrby("eyegambia:observability:output_tokens", event.outputTokens ?? 0);
      if (event.estimatedCostUsd) await r.incrbyfloat("eyegambia:observability:estimated_cost_usd", event.estimatedCostUsd);
    }
  } catch (error) {
    console.error(JSON.stringify({ service: "eyegambia", type: "monitoring_error", error: String(error) }));
  }
}

export function getMemoryEvents() { return [...memoryEvents].reverse(); }

export function summarize(events: TraceEvent[]) {
  const requests = events.filter(e => e.event === "request");
  const responses = events.filter(e => e.event === "response");
  const errors = events.filter(e => e.event === "error");
  const usage = events.filter(e => e.event === "ai_usage");
  const latency = responses.map(e => e.latencyMs ?? 0).filter(Boolean);
  const sorted = [...latency].sort((a,b)=>a-b);
  const totalCost = usage.reduce((sum,e)=>sum+(e.estimatedCostUsd ?? 0),0);
  return {
    requests: requests.length,
    responses: responses.length,
    errors: errors.length,
    errorRate: requests.length ? errors.length / requests.length : 0,
    avgLatencyMs: latency.length ? Math.round(latency.reduce((a,b)=>a+b,0)/latency.length) : 0,
    p95LatencyMs: sorted.length ? Math.round(sorted[Math.max(0,Math.ceil(sorted.length*.95)-1)]) : 0,
    inputTokens: usage.reduce((sum,e)=>sum+(e.inputTokens ?? 0),0),
    outputTokens: usage.reduce((sum,e)=>sum+(e.outputTokens ?? 0),0),
    estimatedCostUsd: Number(totalCost.toFixed(6)),
    models: {} as any,
  };
}

export async function getMonitoringSnapshot() {
  const r=getRedis();
  if(!r) return {mode:"memory",configured:false,requests:0,errors:0,recent:getMemoryEvents()};
  try {
    const [requests,errors,inputTokens,outputTokens,cost,recent]=await Promise.all([
      r.get<number>("eyegambia:observability:requests"),
      r.get<number>("eyegambia:observability:errors"),
      r.get<number>("eyegambia:observability:input_tokens"),
      r.get<number>("eyegambia:observability:output_tokens"),
      r.get<number>("eyegambia:observability:estimated_cost_usd"),
      r.lrange<string>("eyegambia:observability:events",0,49)
    ]);
    return {mode:"upstash",configured:true,requests:requests??0,errors:errors??0,inputTokens:inputTokens??0,outputTokens:outputTokens??0,estimatedCostUsd:cost??0,recent:recent.map(x=>{try{return JSON.parse(x)}catch{return {raw:x}}})};
  } catch {
    return {mode:"upstash-error",configured:true,requests:0,errors:0,inputTokens:0,outputTokens:0,estimatedCostUsd:0,recent:[]};
  }
}