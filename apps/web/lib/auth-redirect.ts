import { safeAppPath } from '@bridge-hive/domain';

/** Same-origin relative path for organization portal redirects. */
export function safeOrgNext(raw: string | null | undefined): string {
  return safeAppPath(raw, '/dashboard');
}

/** Admin destinations must remain under /admin after safeAppPath. */
export function safeAdminNext(raw: string | null | undefined): string {
  const path = safeAppPath(raw, '/admin');
  const pathname = path.split('?')[0] ?? path;
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return path;
  }
  return '/admin';
}

/** Apply a validated next path onto a URL (pathname + optional query). */
export function applySafeNext(
  redirectUrl: URL,
  next: string,
  fallbackPathname: string,
): void {
  const [pathnamePart, searchPart] = next.split('?');
  redirectUrl.pathname = pathnamePart || fallbackPathname;
  redirectUrl.search = searchPart ? `?${searchPart}` : '';
}
