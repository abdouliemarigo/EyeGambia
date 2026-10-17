import { enforceRateLimit, getClientIdentifier } from "../../rate-limit";
import { NextResponse } from "next/server";
import OpenAI from "openai";
export const runtime = "nodejs";
export async function POST(req: Request) {
  const rl=await enforceRateLimit(getClientIdentifier(req), 15);
  if(!rl.allowed)return NextResponse.json({error:"Too many requests. Please wait a moment."},{status:429,headers:{"Retry-After":String(Math.max(1,Math.ceil((rl.reset-Date.now())/1000)))}});
  try {
    const { instruction, code } = await req.json();
    if (typeof instruction !== "string" || typeof code !== "string") return NextResponse.json({ error: "Instruction and code are required." }, { status: 400 });
    if (code.length > 120_000) return NextResponse.json({ error: "Code input is too large." }, { status: 413 });
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ result: "EyeCode demo mode: connect OPENAI_API_KEY for live code analysis." });
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const r = await client.responses.create({ model: process.env.OPENAI_MODEL || "gpt-5", instructions: "You are EyeCode. Review code carefully. Identify bugs, security issues and improvements, then provide corrected code when appropriate. Do not claim execution unless tools are actually available.", input: `Instruction:\n${instruction}\n\nCode:\n${code}`, max_output_tokens: 3500 });
    return NextResponse.json({ result: r.output_text });
  } catch (error) { console.error("[EyeCode]", error); return NextResponse.json({ error: "EyeCode could not analyze the code." }, { status: 500 }); }
}
