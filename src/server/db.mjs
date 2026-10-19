import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { migrateAttiraBrand } from './rebrand.mjs';
let connection;
export const uid = () => randomUUID();
export function db(){
 if(connection) return connection;
 const file=resolve(/* turbopackIgnore: true */ process.env.DATABASE_PATH || 'data/stylehub.sqlite'); mkdirSync(dirname(file),{recursive:true});
 connection=new DatabaseSync(file); connection.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE COLLATE NOCASE,password TEXT NOT NULL,name TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('customer','seller','admin')),status TEXT NOT NULL DEFAULT 'active',data TEXT NOT NULL DEFAULT '{}',createdAt TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY AUTOINCREMENT,sellerId TEXT REFERENCES users(id),slug TEXT NOT NULL UNIQUE,status TEXT NOT NULL DEFAULT 'active',data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,userId TEXT NOT NULL REFERENCES users(id),idempotency TEXT NOT NULL UNIQUE,data TEXT NOT NULL,createdAt TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS coupons(code TEXT PRIMARY KEY,data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY,kind TEXT NOT NULL,userId TEXT,data TEXT NOT NULL,createdAt TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS settings(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS resets(hash TEXT PRIMARY KEY,userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS orders_user ON orders(userId);
 CREATE INDEX IF NOT EXISTS products_seller ON products(sellerId);
 CREATE INDEX IF NOT EXISTS records_kind ON records(kind);
 `);
 connection.prepare('INSERT OR IGNORE INTO settings VALUES(1,?)').run(JSON.stringify({storeName:'Attira',taxRate:0.08,standardShipping:5.95,expressShipping:14.95,freeShipping:50,acceptOrders:true}));
 migrateAttiraBrand(connection);
 return connection;
}
export function transaction(fn){db().exec('BEGIN IMMEDIATE');try{const result=fn();db().exec('COMMIT');return result;}catch(e){db().exec('ROLLBACK');throw e;}}
export function settings(){return JSON.parse(db().prepare('SELECT data FROM settings WHERE id=1').get().data);}
export function product(row){return row?{...JSON.parse(row.data),product_id:row.id,sellerId:row.sellerId,status:row.status}:null;}
export function catalog(){const reviews=db().prepare("SELECT r.*,u.name FROM records r LEFT JOIN users u ON r.userId=u.id WHERE r.kind='reviews'").all().map(r=>({...JSON.parse(r.data),id:r.id,author:r.name||'Customer',date:r.createdAt})).filter(r=>r.status==='approved');return db().prepare("SELECT p.* FROM products p LEFT JOIN users u ON p.sellerId=u.id WHERE p.status='active' AND (p.sellerId IS NULL OR (u.status='active' AND u.role IN ('seller','admin')))").all().map(row=>{const p=product(row);const added=reviews.filter(r=>r.productId===p.product_id).map(r=>({id:r.id,author:r.author,date:r.date,title:r.title,text:r.body,rating:r.rating,verified:false}));if(added.length){p.rating=Math.round(((p.rating*p.review_count)+added.reduce((n,r)=>n+r.rating,0))/(p.review_count+added.length)*10)/10;p.review_count+=added.length;p.reviews=[...added,...(p.reviews||[])];}return p;});}
export function saveProduct(p){const {product_id,sellerId,status,...data}=p; db().prepare('UPDATE products SET sellerId=?,slug=?,status=?,data=? WHERE id=?').run(sellerId??null,p.slug,status||'active',JSON.stringify(data),product_id);}
export function record(kind,data,userId=null){const id=uid();db().prepare('INSERT INTO records VALUES(?,?,?,?,?)').run(id,kind,userId,JSON.stringify(data),new Date().toISOString());return id;}
export function audit(actor,action,target){record('audit',{action,target},actor.id);}
export function seed(){
 if(db().prepare('SELECT count(*) n FROM products').get().n) return;
 const products=JSON.parse(readFileSync(new URL('../data/products.json',import.meta.url),'utf8'));
 transaction(()=>{const insert=db().prepare('INSERT INTO products(id,slug,data) VALUES(?,?,?)');for(const p of products) insert.run(p.product_id,p.slug,JSON.stringify(p));
 for(const [code,data] of Object.entries({WELCOME10:{type:'percent',value:10,label:'10% off',active:true},STYLE15:{type:'percent',value:15,label:'15% off',active:true},FREESHIP:{type:'shipping',value:0,label:'Free standard shipping',active:true}})) db().prepare('INSERT OR IGNORE INTO coupons VALUES(?,?)').run(code,JSON.stringify(data)); });
}
