import {NextResponse} from 'next/server'; import {logout} from '../../../lib-server';
export const runtime='nodejs';
export async function POST(req:Request){logout(req.headers.get('cookie')?.match(/eye_session=([^;]+)/)?.[1]);const r=NextResponse.json({ok:true});r.cookies.set('eye_session','',{maxAge:0,path:'/'});return r}
