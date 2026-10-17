import { enforceRateLimit, getClientIdentifier } from "../../rate-limit";
import { NextResponse } from "next/server";
import OpenAI from "openai";
export const runtime = "nodejs";
export async function POST(req: Request) {
  const rl=await enforceRateLimit(getClientIdentifier(req), 8);
  if(!rl.allowed)return NextResponse.json({error:"Too many requests. Please wait a moment."},{status:429,headers:{"Retry-After":String(Math.max(1,Math.ceil((rl.reset-Date.now())/1000)))}});
  try {
    const { prompt } = await req.json();
    if (typeof prompt !== "string" || !prompt.trim()) return NextResponse.json({ error: "Describe the app you want to build." }, { status: 400 });
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ blueprint: `EyeBuild plan for: ${prompt}\n\n1. Product goal\n2. Pages and navigation\n3. Components\n4. Data model\n5. API layer\n6. Security\n7. Tests\n8. Deployment` });
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const r = await client.responses.create({ model: process.env.OPENAI_MODEL || "gpt-5", instructions: "You are EyeBuild. Turn the user's app idea into an implementation-ready blueprint. Include stack, pages, components, data model, API routes, security, tests and a phased build plan. Do not claim files were created.", input: prompt, max_output_tokens: 3000 });
    return NextResponse.json({ blueprint: r.output_text });
  } catch (error) { console.error("[EyeBuild]", error); return NextResponse.json({ error: "EyeBuild could not generate the blueprint." }, { status: 500 }); }
}
