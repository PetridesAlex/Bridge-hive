import { type NextRequest, NextResponse } from 'next/server';

import { applySafeNext, safeOrgNext } from '@/lib/auth-redirect';
import { updateSession } from '@/lib/supabase/middleware';

const PUBLIC_PATHS = [
  '/',
  '/sign-in',
  '/sign-up',
  '/admin/sign-in',
  '/organization-invitations/accept',
  '/activate-organization-account',
  '/organizations',
  '/professionals',
  '/how-it-works',
  '/about',
  '/contact',
  '/robots.txt',
  '/sitemap.xml',
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith('/auth/')) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (pathname === '/auth/confirm' || pathname.startsWith('/auth/confirm/')) {
    supabaseResponse.headers.set('Cache-Control', 'no-store, max-age=0');
    supabaseResponse.headers.set('Referrer-Policy', 'no-referrer');
    supabaseResponse.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  if (!user && !isPublicPath(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = pathname.startsWith('/admin')
      ? '/admin/sign-in'
      : '/sign-in';
    redirectUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && (pathname === '/sign-in' || pathname === '/sign-up')) {
    const redirectUrl = request.nextUrl.clone();
    const next = safeOrgNext(request.nextUrl.searchParams.get('next'));
    applySafeNext(redirectUrl, next, '/dashboard');
    return NextResponse.redirect(redirectUrl);
  }

  if (user && pathname === '/admin/sign-in') {
    // Leave signed-in non-admins on the form so they can switch accounts.
    // Authenticated platform admins are sent to the console by the page itself.
    return supabaseResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
