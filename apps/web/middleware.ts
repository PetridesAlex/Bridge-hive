import { type NextRequest, NextResponse } from 'next/server';

import { updateSession } from '@/lib/supabase/middleware';

const PUBLIC_PATHS = [
  '/',
  '/sign-in',
  '/sign-up',
  '/admin/sign-in',
  '/organization-invitations/accept',
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith('/auth/')) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

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
    const next = request.nextUrl.searchParams.get('next');
    if (next && next.startsWith('/')) {
      redirectUrl.pathname = next.split('?')[0];
      const nextParams = next.split('?')[1];
      if (nextParams) {
        redirectUrl.search = `?${nextParams}`;
      } else {
        redirectUrl.search = '';
      }
    } else {
      redirectUrl.pathname = '/dashboard';
      redirectUrl.search = '';
    }
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
