import { seed, db } from '../src/server/db.mjs';
seed();
console.log(`Database ready: ${db().prepare('SELECT count(*) n FROM products').get().n} products. No default passwords were created.`);
