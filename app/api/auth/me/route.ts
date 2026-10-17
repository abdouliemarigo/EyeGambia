import {NextResponse} from 'next/server'; import {userFromToken} from '../../../lib-server';
export const runtime='nodejs';
export async function GET(req:Request){const token=req.headers.get('cookie')?.match(/eye_session=([^;]+)/)?.[1];return NextResponse.json({user:userFromToken(token)||null})}
