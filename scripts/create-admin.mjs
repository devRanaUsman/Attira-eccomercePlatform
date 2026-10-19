import { createUser } from '../src/server/auth.mjs';
import { db, seed } from '../src/server/db.mjs';
const {ADMIN_EMAIL:email,ADMIN_PASSWORD:password,ADMIN_NAME:name='Store Administrator'}=process.env;
if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length<12) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters) in .env.');
seed();
if(db().prepare('SELECT id FROM users WHERE email=?').get(email)) throw new Error('Email already exists; no account was changed.');
createUser({name,email,password,role:'admin'});
console.log('Administrator created. Sign in at /admin/login. Remove ADMIN_PASSWORD from .env after setup.');
