import {NextResponse} from 'next/server'; import {addMemory,getMemories,userFromToken} from '../../lib-server';
export const runtime='nodejs';
function auth(req:Request){return userFromToken(req.headers.get('cookie')?.match(/eye_session=([^;]+)/)?.[1])}
export async function GET(req:Request){const u=auth(req);if(!u)return NextResponse.json({error:'Login required.'},{status:401});return NextResponse.json({memories:getMemories(u.id)})}
export async function POST(req:Request){const u=auth(req);if(!u)return NextResponse.json({error:'Login required.'},{status:401});const {memory,projectId}=await req.json();if(typeof memory!=='string'||memory.trim().length<2||memory.length>4000)return NextResponse.json({error:'Invalid memory.'},{status:400});addMemory(u.id,memory.trim(),projectId);return NextResponse.json({ok:true})}
