import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
export const runtime="nodejs";
export async function GET(){
  let redis="not configured";
  const url=process.env.UPSTASH_REDIS_REST_URL, token=process.env.UPSTASH_REDIS_REST_TOKEN;
  if(url&&token){ try { await new Redis({url,token}).ping(); redis="healthy"; } catch { redis="unhealthy"; } }
  const ok=redis !== "unhealthy";
  return NextResponse.json({ok,service:"EyeGambia",timestamp:new Date().toISOString(),aiConfigured:Boolean(process.env.OPENAI_API_KEY),redis,rateLimitMode:url&&token?"distributed":"local",monitoring:"enabled"},{status:ok?200:503,headers:{"Cache-Control":"no-store"}});
}