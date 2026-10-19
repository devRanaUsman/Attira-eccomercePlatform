import { seed, getDb, closeDb } from '../src/server/db.mjs';

await seed();
const db = await getDb();
const count = await db.collection('products').countDocuments();
console.log(`Database ready: ${count} products in MongoDB Atlas. No default passwords were created.`);
await closeDb();
