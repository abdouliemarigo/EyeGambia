import { NextResponse } from "next/server";
import { userFromToken } from "../../lib-server";
export const runtime="nodejs";
export async function POST(req:Request){
  const token=req.headers.get("cookie")?.match(/eye_session=([^;]+)/)?.[1];
  const user=userFromToken(token);
  if(!user) return NextResponse.json({error:"Sign in required."},{status:401});
  const body=await req.json().catch(()=>({}));
  if(body.approved!==true) return NextResponse.json({error:"Explicit deployment approval is required."},{status:400});
  if(!process.env.DEPLOY_PROVIDER) return NextResponse.json({error:"Deployment provider is not configured."},{status:503});
  return NextResponse.json({error:"Deployment adapter is not configured for a provider yet."},{status:501});
}