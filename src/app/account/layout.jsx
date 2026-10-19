import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { COOKIE, userFromToken } from '@/server/auth.mjs';

export const metadata = { title: 'Your account', robots: { index: false, follow: false } };

export default async function Layout({ children }) {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!(await userFromToken(token))) redirect('/login?next=/account');
  return children;
}
