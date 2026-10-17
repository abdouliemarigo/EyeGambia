import { enforceRateLimit, getClientIdentifier } from "../../../rate-limit";
import {NextResponse} from 'next/server'; import {loginUser,logEvent} from '../../../lib-server';
export const runtime='nodejs';
export async function POST(req:Request){
const rl=await enforceRateLimit(getClientIdentifier(req), 8);
if(!rl.allowed)return NextResponse.json({error:"Too many requests. Please wait a moment."},{status:429,headers:{"Retry-After":String(Math.max(1,Math.ceil((rl.reset-Date.now())/1000)))}});const {email,password}=await req.json();const s=loginUser(String(email).trim().toLowerCase(),String(password));if(!s)return NextResponse.json({error:'Invalid email or password.'},{status:401});logEvent('login',s.user.id);const r=NextResponse.json({user:s.user});r.cookies.set('eye_session',s.token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',maxAge:60*60*24*30,path:'/'});return r}
