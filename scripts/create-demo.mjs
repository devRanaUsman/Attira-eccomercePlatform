import { randomBytes } from 'node:crypto';
import { createUser } from '../src/server/auth.mjs';
import { db, seed, transaction } from '../src/server/db.mjs';
import { placeOrder } from '../src/server/commerce.mjs';

if (!process.argv.includes('--local-demo')) throw new Error('Use --local-demo to create local testing accounts.');
seed();
const credentials=[];
transaction(()=>{
  const accounts={};
  for (const role of ['admin','seller','customer']) {
    const email=`${role}.demo@attira.test`;
    if(db().prepare('SELECT id FROM users WHERE email=?').get(email))throw new Error(`${email} already exists; no accounts were changed.`);
    const password=`At9!${randomBytes(10).toString('base64url')}`;
    accounts[role]=createUser({name:`Demo ${role[0].toUpperCase()+role.slice(1)}`,email,password,role,status:'active'});
    credentials.push({role,email,password,path:role==='customer'?'/login':`/${role}/login`});
  }
  const sample=JSON.parse(db().prepare('SELECT data FROM products ORDER BY id LIMIT 1').get().data);
  const {product_id, ...base}=sample;
  const insert=db().prepare('INSERT INTO products(sellerId,slug,status,data) VALUES(?,?,?,?)');
  for(const [name,slug,price,status] of [['Demo Linen Dress','demo-linen-dress',49,'active'],['Demo Everyday Dress','demo-everyday-dress',35,'draft']]) {
    const p={...base,product_name:name,slug,SKU:'AT-DEMO-'+slug,brand:'Attira',regular_price:price,sale_price:null,sale_status:false,discount_percentage:0,short_description:'A demonstration product for testing the seller and customer experience.',full_description:'This local demo product lets you test editing, inventory, checkout and fulfilment.',variants:[{color:'Black',size:'M',stock:20}],colors:[{name:'Black',hex:'#1B1B1B'}],sizes:['M'],stock_quantity:20,availability:'in_stock',rating:0,review_count:0,reviews:[],featured:false,best_seller:false,new_arrival:true,created_date:new Date().toISOString()};
    insert.run(accounts.seller.id,slug,status,JSON.stringify(p));
  }
  const address={id:'demo-home',label:'Demo home',firstName:'Demo',lastName:'Customer',address1:'123 Demo Lane',city:'Demo City',state:'Test State',postal:'10001',country:'United States',phone:'2025550100',isDefault:true};
  const data=JSON.parse(accounts.customer.data);data.addresses=[address];
  db().prepare('UPDATE users SET data=? WHERE id=?').run(JSON.stringify(data),accounts.customer.id);
});
const customer=db().prepare('SELECT * FROM users WHERE email=?').get('customer.demo@attira.test');
const p=db().prepare('SELECT id FROM products WHERE slug=?').get('demo-linen-dress');
const address=JSON.parse(customer.data).addresses[0];
const order=placeOrder(customer,{idempotencyKey:crypto.randomUUID(),items:[{productId:p.id,color:'Black',size:'M',qty:1}],shipping:address,contact:{email:customer.email,phone:address.phone},method:{id:'standard'},payment:{type:'cod'}});
console.log(JSON.stringify({credentials,demoOrder:order.number},null,2));
