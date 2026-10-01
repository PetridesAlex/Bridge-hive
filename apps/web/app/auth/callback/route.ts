import { NextResponse } from 'next/server';

import {
  ORG_INVITATION_COOKIE,
  ORG_INVITATION_COOKIE_MAX_AGE_SEC,
  readInvitationIdFromAuthMeta,
  safeAppPath,
} from '@bridge-hive/domain';

import { createClient } from '@/lib/supabase/server';

/**
 * PKCE / OAuth code exchange. Organization activation emails must use
 * /auth/confirm + verifyOtp instead — ConfirmationURL GET consumes OTPs.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const errorCode = searchParams.get('error_code') ?? searchParams.get('error');
  const next = safeAppPath(
    searchParams.get('next'),
    '/activate-organization-account',
  );

  if (errorCode) {
    const target = new URL('/auth/error', origin);
    target.searchParams.set('error_code', errorCode);
    return NextResponse.redirect(target);
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/auth/error?error_code=access_denied', origin),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL('/auth/error?error_code=otp_expired', origin),
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const invitationId = user ? readInvitationIdFromAuthMeta(user) : null;
  const response = NextResponse.redirect(new URL(next, origin));

  if (invitationId) {
    response.cookies.set(ORG_INVITATION_COOKIE, invitationId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: ORG_INVITATION_COOKIE_MAX_AGE_SEC,
    });
  }

  return response;
}
