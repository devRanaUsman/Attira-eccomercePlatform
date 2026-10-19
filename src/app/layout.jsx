import { Suspense } from 'react';
import { cookies } from 'next/headers';
import Providers from '@/components/Providers';
import { catalog, getCoupons, settings } from '@/server/db.mjs';
import { COOKIE, userFromToken, publicUser } from '@/server/auth.mjs';
import '@/styles/tokens.css';
import '@/styles/base.css';
import '@/styles/ui.css';
import '@/styles/layout.css';
import '@/styles/product.css';
import '@/styles/pages.css';
import '@/styles/dashboard.css';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: { default: 'Attira | Everyday style', template: '%s | Attira' },
  description: 'Shop fashion, accessories, beauty and home at Attira.',
  icons: { icon: '/favicon.svg' },
};

export default async function RootLayout({ children }) {
  const token = (await cookies()).get(COOKIE)?.value;
  const rawUser = await userFromToken(token);
  const user = publicUser(rawUser);
  const [products, config, coupons] = await Promise.all([
    catalog(),
    settings(),
    getCoupons(),
  ]);

  return (
    <html lang="en">
      <body>
        <Suspense fallback={<p className="container page">Loading Attira…</p>}>
          <Providers products={products} user={user} commerce={{ settings: config, coupons }}>
            {children}
          </Providers>
        </Suspense>
        <div id="overlay-root" />
      </body>
    </html>
  );
}
