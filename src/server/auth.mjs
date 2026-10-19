import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { getDb, uid } from './db.mjs';

export const COOKIE = 'stylehub_session';
export const digest = s => createHash('sha256').update(s).digest('hex');
export function fail(status, message) { throw Object.assign(new Error(message), { status }); }
export function passwordHash(password) { const salt = randomBytes(16).toString('hex'); return salt + ':' + scryptSync(password, salt, 64).toString('hex'); }
const dummy = passwordHash('dummy-password-not-a-real-user');
export function verifyPassword(password, stored = dummy) { if (!stored || !stored.includes(':')) return false; const [salt, hash] = stored.split(':'); const expected = Buffer.from(hash, 'hex'); return timingSafeEqual(scryptSync(password, salt, 64), expected); }
export function publicUser(row) {
  if (!row) return null;
  const data = typeof row.data === 'string' ? JSON.parse(row.data) : (row.data || {});
  return {
    ...data,
    id: row.id || String(row._id),
    email: row.email,
    name: row.name,
    role: row.role,
    status: row.status,
    createdAt: row.createdAt,
  };
}
export function cookieToken(request) { return request.headers.get('cookie')?.split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1); }
export async function userFromToken(token) {
  if (!token) return null;
  const database = await getDb();
  const s = await database.collection('sessions').findOne({ hash: digest(token), expires: { $gt: Date.now() } });
  if (!s) return null;
  const u = await database.collection('users').findOne({ id: s.userId, status: { $ne: 'suspended' } });
  return u || null;
}
export async function requireUser(request, roles) {
  const u = await userFromToken(cookieToken(request));
  if (!u) fail(401, 'Please sign in to continue.');
  if (roles && (!roles.includes(u.role) || u.status !== 'active')) fail(403, 'You do not have access to this area.');
  return u;
}
export async function session(userId, remember = true) {
  const token = randomBytes(32).toString('hex');
  const database = await getDb();
  const expires = Date.now() + (remember ? 7 : 1) * 86400000;
  await database.collection('sessions').deleteMany({ expires: { $lt: Date.now() } });
  await database.collection('sessions').insertOne({ _id: digest(token), hash: digest(token), userId, expires });
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax${remember ? '; Max-Age=604800' : ''}${(process.env.COOKIE_SECURE === 'true' || (process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false')) ? '; Secure' : ''}`;
}
export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${(process.env.COOKIE_SECURE === 'true' || (process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false')) ? '; Secure' : ''}`;
export async function createUser({ name, email, password, role = 'customer', status = 'active' }) {
  const id = uid();
  const database = await getDb();
  const user = {
    _id: id,
    id,
    email: email.toLowerCase(),
    password: passwordHash(password),
    name,
    role,
    status,
    data: { phone: '', addresses: [], paymentMethods: [], wishlist: [], prefs: { news: false, offers: false } },
    createdAt: new Date().toISOString(),
  };
  await database.collection('users').insertOne(user);
  return user;
}
export async function rateLimit(key, max = 10, period = 900000) {
  const now = Date.now();
  const database = await getDb();
  const hashKey = digest(key);
  await database.collection('rate_limits').deleteMany({ expires: { $lt: now } });
  const doc = await database.collection('rate_limits').findOneAndUpdate(
    { key: hashKey },
    {
      $inc: { count: 1 },
      $setOnInsert: { key: hashKey, expires: now + period },
    },
    { upsert: true, returnDocument: 'after' }
  );
  if ((doc?.count || 1) > max) fail(429, 'Too many attempts. Please try again later.');
}
