import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { db, uid } from './db.mjs';
export const COOKIE='stylehub_session';
export const digest=s=>createHash('sha256').update(s).digest('hex');
export function fail(status,message){throw Object.assign(new Error(message),{status});}
export function passwordHash(password){const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(password,salt,64).toString('hex');}
const dummy=passwordHash('dummy-password-not-a-real-user');
export function verifyPassword(password,stored=dummy){const [salt,hash]=stored.split(':');const expected=Buffer.from(hash,'hex');return timingSafeEqual(scryptSync(password,salt,64),expected);}
export function publicUser(row){if(!row)return null;return {...JSON.parse(row.data),id:row.id,email:row.email,name:row.name,role:row.role,status:row.status,createdAt:row.createdAt};}
export function cookieToken(request){return request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);}
export function userFromToken(token){if(!token)return null;return db().prepare('SELECT u.* FROM users u JOIN sessions s ON s.userId=u.id WHERE s.hash=? AND s.expires>? AND u.status!=?').get(digest(token),Date.now(),'suspended') || null;}
export function requireUser(request,roles){const u=userFromToken(cookieToken(request));if(!u)fail(401,'Please sign in to continue.');if(roles && (!roles.includes(u.role)||u.status!=='active')) fail(403,'You do not have access to this area.');return u;}
export function session(userId,remember=true){const token=randomBytes(32).toString('hex');db().prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());db().prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token),userId,Date.now()+(remember?7:1)*86400000);return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax${remember?'; Max-Age=604800':''}${(process.env.COOKIE_SECURE==='true'||(process.env.NODE_ENV==='production'&&process.env.COOKIE_SECURE!=='false'))?'; Secure':''}`;}
export const clearCookie=()=>`${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${(process.env.COOKIE_SECURE==='true'||(process.env.NODE_ENV==='production'&&process.env.COOKIE_SECURE!=='false'))?'; Secure':''}`;
export function createUser({name,email,password,role='customer',status='active'}){const id=uid();db().prepare('INSERT INTO users(id,email,password,name,role,status,data,createdAt) VALUES(?,?,?,?,?,?,?,?)').run(id,email.toLowerCase(),passwordHash(password),name,role,status,JSON.stringify({phone:'',addresses:[],paymentMethods:[],wishlist:[],prefs:{news:false,offers:false}}),new Date().toISOString());return db().prepare('SELECT * FROM users WHERE id=?').get(id);}
export function rateLimit(key,max=10,period=900000){const now=Date.now();db().prepare('DELETE FROM rate_limits WHERE expires<?').run(now);db().prepare('INSERT INTO rate_limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').run(digest(key),now+period);if(db().prepare('SELECT count FROM rate_limits WHERE key=?').get(digest(key)).count>max)fail(429,'Too many attempts. Please try again later.');}
