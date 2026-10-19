import { Suspense } from 'react';
import { cookies } from 'next/headers';
import Providers from '@/components/Providers';
import { catalog, db, settings } from '@/server/db.mjs';
import { COOKIE, userFromToken, publicUser } from '@/server/auth.mjs';
import '@/styles/tokens.css';
import '@/styles/base.css';
import '@/styles/ui.css';
import '@/styles/layout.css';
import '@/styles/product.css';
import '@/styles/pages.css';
import '@/styles/dashboard.css';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const metadata={title:{default:'Attira | Everyday style',template:'%s | Attira'},description:'Shop fashion, accessories, beauty and home at Attira.',icons:{icon:'/favicon.svg'}};
export default async function RootLayout({children}){const user=publicUser(userFromToken((await cookies()).get(COOKIE)?.value));const coupons=Object.fromEntries(db().prepare('SELECT * FROM coupons').all().map(r=>[r.code,JSON.parse(r.data)]).filter(([,c])=>c.active));return <html lang="en"><body><Suspense fallback={<p className="container page">Loading Attira…</p>}><Providers products={catalog()} user={user} commerce={{settings:settings(),coupons}}>{children}</Providers></Suspense><div id="overlay-root"/></body></html>;}
