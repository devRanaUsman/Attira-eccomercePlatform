import { MongoClient } from 'mongodb';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const DEFAULT_URI = 'mongodb://thetonyst:ironman7@ac-thpbanu-shard-00-00.prexbjw.mongodb.net:27017,ac-thpbanu-shard-00-01.prexbjw.mongodb.net:27017,ac-thpbanu-shard-00-02.prexbjw.mongodb.net:27017/attira?authSource=admin&replicaSet=atlas-915uel-shard-0&ssl=true&retryWrites=true&w=majority';

export const uid = () => randomUUID();

export function getClientPromise() {
  const uri = process.env.MONGODB_URI || DEFAULT_URI;
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 15000,
    });
    global._mongoClientPromise = client.connect();
  }
  return global._mongoClientPromise;
}

export async function getClient() {
  return await getClientPromise();
}

let initialized = false;

async function ensureIndexes(db) {
  try {
    await Promise.allSettled([
      db.collection('users').createIndex({ email: 1 }, { unique: true }),
      db.collection('users').createIndex({ id: 1 }, { unique: true }),
      db.collection('sessions').createIndex({ hash: 1 }, { unique: true }),
      db.collection('sessions').createIndex({ expires: 1 }, { expireAfterSeconds: 0 }),
      db.collection('products').createIndex({ slug: 1 }, { unique: true }),
      db.collection('products').createIndex({ product_id: 1 }, { unique: true }),
      db.collection('products').createIndex({ sellerId: 1 }),
      db.collection('orders').createIndex({ idempotency: 1 }, { unique: true }),
      db.collection('orders').createIndex({ id: 1 }, { unique: true }),
      db.collection('orders').createIndex({ userId: 1 }),
      db.collection('orders').createIndex({ createdAt: -1 }),
      db.collection('coupons').createIndex({ code: 1 }, { unique: true }),
      db.collection('records').createIndex({ kind: 1 }),
      db.collection('records').createIndex({ createdAt: -1 }),
      db.collection('rate_limits').createIndex({ key: 1 }, { unique: true }),
      db.collection('rate_limits').createIndex({ expires: 1 }, { expireAfterSeconds: 0 }),
      db.collection('resets').createIndex({ hash: 1 }, { unique: true }),
      db.collection('resets').createIndex({ expires: 1 }, { expireAfterSeconds: 0 }),
    ]);
  } catch {}
}

export async function getDb() {
  const client = await getClient();
  const dbName = process.env.MONGODB_DB_NAME || 'attira';
  const dbInstance = client.db(dbName);
  if (!initialized) {
    initialized = true;
    await ensureIndexes(dbInstance);
    await autoSeedIfEmpty(dbInstance);
  }
  return dbInstance;
}

export async function db() {
  return await getDb();
}

export async function closeDb() {
  if (global._mongoClientPromise) {
    try {
      const client = await global._mongoClientPromise;
      await client.close();
    } catch {}
    global._mongoClientPromise = null;
    initialized = false;
  }
}

const defaultSettings = {
  storeName: 'Attira',
  taxRate: 0.08,
  standardShipping: 5.95,
  expressShipping: 14.95,
  freeShipping: 50,
  acceptOrders: true,
};

export async function settings() {
  const database = await getDb();
  const row = await database.collection('settings').findOne({ _id: 1 });
  if (!row) {
    await database.collection('settings').updateOne({ _id: 1 }, { $set: defaultSettings }, { upsert: true });
    return { ...defaultSettings };
  }
  const { _id, ...rest } = row;
  if (typeof rest.data === 'string') {
    try { return JSON.parse(rest.data); } catch {}
  }
  return { ...defaultSettings, ...rest };
}

export async function saveSettings(data) {
  const database = await getDb();
  await database.collection('settings').updateOne({ _id: 1 }, { $set: data }, { upsert: true });
  return data;
}

export function product(row) {
  if (!row) return null;
  const { _id, ...rest } = row;
  let p = rest;
  if (typeof rest.data === 'string') {
    try { p = { ...rest, ...JSON.parse(rest.data) }; } catch {}
  } else if (rest.data && typeof rest.data === 'object') {
    p = { ...rest, ...rest.data };
  }
  const pid = Number(p.product_id ?? p.id ?? _id);
  return {
    ...p,
    id: pid,
    product_id: pid,
    sellerId: p.sellerId ?? null,
    status: p.status || 'active',
  };
}

export async function getProduct(id) {
  const database = await getDb();
  const numId = Number(id);
  const query = Number.isInteger(numId) && !Number.isNaN(numId)
    ? { $or: [{ product_id: numId }, { _id: numId }, { id: numId }, { id: String(id) }] }
    : { id: String(id) };
  const doc = await database.collection('products').findOne(query);
  return product(doc);
}

export async function getNextProductId() {
  const database = await getDb();
  const highest = await database.collection('products').find({}, { projection: { product_id: 1 } }).sort({ product_id: -1 }).limit(1).toArray();
  return highest.length && typeof highest[0].product_id === 'number' ? highest[0].product_id + 1 : 1;
}

export async function saveProduct(p) {
  const database = await getDb();
  const pid = Number(p.product_id ?? p.id);
  const { product_id, id, _id, sellerId, status, ...data } = p;
  await database.collection('products').updateOne(
    { $or: [{ product_id: pid }, { _id: pid }] },
    {
      $set: {
        product_id: pid,
        sellerId: sellerId ?? null,
        slug: p.slug,
        status: status || 'active',
        ...data,
      },
    },
    { upsert: true }
  );
}

export async function catalog() {
  const database = await getDb();
  const [rawReviews, rawUsers, rawProducts] = await Promise.all([
    database.collection('records').find({ kind: 'reviews' }).toArray(),
    database.collection('users').find({}).toArray(),
    database.collection('products').find({ status: 'active' }).toArray(),
  ]);

  const usersById = new Map(rawUsers.map(u => [u.id, u]));

  const reviews = rawReviews
    .map(r => {
      const data = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
      const author = usersById.get(r.userId)?.name || 'Customer';
      return { ...data, id: r.id || String(r._id), author, date: r.createdAt };
    })
    .filter(r => r.status === 'approved');

  return rawProducts
    .filter(row => {
      if (!row.sellerId) return true;
      const seller = usersById.get(row.sellerId);
      return seller?.status === 'active' && ['seller', 'admin'].includes(seller?.role);
    })
    .map(row => {
      const p = product(row);
      const added = reviews.filter(r => r.productId === p.product_id).map(r => ({
        id: r.id,
        author: r.author,
        date: r.date,
        title: r.title,
        text: r.body,
        rating: r.rating,
        verified: false,
      }));
      if (added.length) {
        p.rating = Math.round(((p.rating * p.review_count) + added.reduce((n, r) => n + r.rating, 0)) / (p.review_count + added.length) * 10) / 10;
        p.review_count += added.length;
        p.reviews = [...added, ...(p.reviews || [])];
      }
      return p;
    });
}

export async function getCoupons() {
  const database = await getDb();
  const rows = await database.collection('coupons').find({}).toArray();
  return Object.fromEntries(
    rows
      .map(r => [
        r.code,
        typeof r.data === 'string' ? JSON.parse(r.data) : { type: r.type, value: r.value, label: r.label, active: r.active, expires: r.expires, minSubtotal: r.minSubtotal }
      ])
      .filter(([, c]) => c.active && (!c.expires || Date.parse(c.expires) > Date.now()))
  );
}

export async function record(kind, data, userId = null) {
  const database = await getDb();
  const id = uid();
  const doc = {
    _id: id,
    id,
    kind,
    userId,
    data: typeof data === 'string' ? JSON.parse(data) : data,
    createdAt: new Date().toISOString(),
  };
  await database.collection('records').insertOne(doc);
  return id;
}

export async function audit(actor, action, target) {
  return await record('audit', { action, target }, actor?.id || null);
}

export function readOrder(r) {
  if (!r) return null;
  if (typeof r.data === 'string') {
    try { return JSON.parse(r.data); } catch {}
  }
  return r.data || r;
}

export async function transaction(fn) {
  const client = await getClient();
  const session = client.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } catch (err) {
    if (err.message && (err.message.includes('Transaction numbers are only allowed') || err.message.includes('replica set') || err.message.includes('standalone'))) {
      return await fn();
    }
    throw err;
  } finally {
    await session.endSession();
  }
}

async function autoSeedIfEmpty(database) {
  const count = await database.collection('products').countDocuments();
  if (count === 0) {
    await seed(database);
  }
}

export async function seed(dbInstance) {
  const database = dbInstance || (await getDb());
  const count = await database.collection('products').countDocuments();
  if (count > 0) return;

  const products = JSON.parse(readFileSync(new URL('../data/products.json', import.meta.url), 'utf8'));
  const docs = products.map(p => ({
    _id: p.product_id,
    product_id: p.product_id,
    sellerId: p.sellerId || null,
    slug: p.slug,
    status: p.status || 'active',
    ...p,
  }));
  if (docs.length > 0) {
    await database.collection('products').insertMany(docs);
  }

  const defaultCoupons = [
    { _id: 'WELCOME10', code: 'WELCOME10', type: 'percent', value: 10, label: '10% off', active: true },
    { _id: 'STYLE15', code: 'STYLE15', type: 'percent', value: 15, label: '15% off', active: true },
    { _id: 'FREESHIP', code: 'FREESHIP', type: 'shipping', value: 0, label: 'Free standard shipping', active: true },
  ];
  for (const c of defaultCoupons) {
    await database.collection('coupons').updateOne({ _id: c._id }, { $set: c }, { upsert: true });
  }

  await database.collection('settings').updateOne({ _id: 1 }, { $set: defaultSettings }, { upsert: true });
}
