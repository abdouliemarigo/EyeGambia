import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const dataDir = path.join(process.cwd(), '.eyegambia-data');
const dbFile = path.join(dataDir, 'db.json');

type DB = { users:any[]; sessions:any[]; memories:any[]; projects:any[]; events:any[] };
const empty:DB={users:[],sessions:[],memories:[],projects:[],events:[]};
function read():DB { fs.mkdirSync(dataDir,{recursive:true}); if(!fs.existsSync(dbFile)) fs.writeFileSync(dbFile,JSON.stringify(empty,null,2)); return JSON.parse(fs.readFileSync(dbFile,'utf8')); }
function write(db:DB){ fs.mkdirSync(dataDir,{recursive:true}); fs.writeFileSync(dbFile,JSON.stringify(db,null,2)); }
export function id(){return crypto.randomUUID()}
export function hashPassword(password:string,salt=crypto.randomBytes(16).toString('hex')){const hash=crypto.scryptSync(password,salt,64).toString('hex');return `${salt}:${hash}`}
export function verifyPassword(password:string,stored:string){const [salt,hash]=stored.split(':');if(!salt||!hash)return false;const candidate=crypto.scryptSync(password,salt,64).toString('hex');return crypto.timingSafeEqual(Buffer.from(candidate,'hex'),Buffer.from(hash,'hex'))}
export function createUser(email:string,password:string){const db=read();if(db.users.some(u=>u.email===email))throw new Error('ACCOUNT_EXISTS');const user={id:id(),email,pass:hashPassword(password),plan:'free',createdAt:new Date().toISOString()};db.users.push(user);write(db);return {id:user.id,email:user.email,plan:user.plan}}
export function loginUser(email:string,password:string){const db=read();const u=db.users.find(x=>x.email===email);if(!u||!verifyPassword(password,u.pass))return null;const token=crypto.randomBytes(32).toString('hex');db.sessions.push({token,userId:u.id,createdAt:Date.now(),expiresAt:Date.now()+60*60*24*30*1000});write(db);return {token,user:{id:u.id,email:u.email,plan:u.plan}}}
export function userFromToken(token?:string|null){if(!token)return null;const db=read();const s=db.sessions.find(x=>x.token===token);if(!s)return null;if(s.expiresAt && s.expiresAt<Date.now()){db.sessions=db.sessions.filter(x=>x.token!==token);write(db);return null;}const u=db.users.find(x=>x.id===s.userId);return u?{id:u.id,email:u.email,plan:u.plan}:null}
export function logout(token?:string|null){if(!token)return;const db=read();db.sessions=db.sessions.filter(x=>x.token!==token);write(db)}
export function addMemory(userId:string,text:string,projectId?:string){const db=read();db.memories.push({id:id(),userId,text,projectId,createdAt:new Date().toISOString()});write(db)}
export function getMemories(userId:string){return read().memories.filter(x=>x.userId===userId).slice(-30)}
export function logEvent(type:string,userId?:string,meta?:any){const db=read();db.events.push({id:id(),type,userId,meta,at:new Date().toISOString()});db.events=db.events.slice(-5000);write(db)}
