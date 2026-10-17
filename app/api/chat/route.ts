import { NextResponse } from "next/server";
import OpenAI from "openai";
import { withTrace } from "@/lib/trace";
import { estimateOpenAICost, recordEvent } from "@/lib/observability";
import { enforceRateLimit, getClientIdentifier } from "../../rate-limit";
import { addMemory, userFromToken } from "../../lib-server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return withTrace(req, "/api/chat", async ({ traceId }) => {
    const token = req.headers.get("cookie")?.match(/eye_session=([^;]+)/)?.[1];
    const user = userFromToken(token);
    const rl = await enforceRateLimit(getClientIdentifier(req, user?.id), user ? 30 : 12);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests. Please wait a moment.", traceId }, { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000))) } });

    const raw = await req.text();
    if (raw.length > 120_000) return NextResponse.json({ error: "Request is too large.", traceId }, { status: 413 });
    const body = JSON.parse(raw || "{}");
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const mode = typeof body?.mode === "string" ? body.mode : "Eye Mode";
    const attachment = typeof body?.attachment === "string" ? body.attachment.slice(0, 80_000) : "";
    const history = Array.isArray(body?.history) ? body.history.slice(-10).filter((m:any)=>m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string").map((m:any)=>({role:m.role,content:m.content.slice(0,12000)})) : [];

    if (!message && !attachment) return NextResponse.json({ error: "Message or attachment is required.", traceId }, { status: 400 });
    if (message.length > 20_000) return NextResponse.json({ error: "Message must be under 20,000 characters.", traceId }, { status: 400 });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ reply: `EyeGambia demo mode received your ${mode} mission: "${message || "Analyze the attached file."}"`, traceId });

    const client = new OpenAI({ apiKey });
    const model = process.env.OPENAI_MODEL || "gpt-5";
    const input = [
      ...history,
      { role: "user", content: [message, attachment ? `\nAttached file content:\n${attachment}` : ""].filter(Boolean).join("\n") }
    ];
    const response = await client.responses.create({
      model,
      instructions: `You are EyeGambia, a mission-first AI platform. Be useful, concise and honest. Current mode: ${mode}. Never claim a tool action occurred unless it actually did.`,
      input,
      max_output_tokens: Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 1600)
    });

    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;
    const estimatedCostUsd = estimateOpenAICost(model, inputTokens, outputTokens);
    await recordEvent({ traceId, requestId: traceId, route: "/api/chat", event: "ai_usage", model, inputTokens, outputTokens, estimatedCostUsd, timestamp: new Date().toISOString() });
    if (user && message) addMemory(user.id, message.slice(0, 4000));

    return NextResponse.json({ reply: response.output_text || "The model returned no text.", traceId, usage: { inputTokens, outputTokens, estimatedCostUsd } });
  });
}