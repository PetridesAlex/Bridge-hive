'use client';

import { usePathname } from 'next/navigation';

import { Breadcrumbs } from '@/components/org/page-header';

function breadcrumbsForPath(slug: string, pathname: string, orgName: string) {
  const base = `/org/${slug}`;
  const crumbs: Array<{ label: string; href?: string }> = [
    { label: orgName, href: `${base}/dashboard` },
  ];

  if (pathname.includes('/shifts/new/bulk')) {
    crumbs.push({ label: 'Shifts', href: `${base}/shifts` });
    crumbs.push({ label: 'Create multiple shifts' });
  } else if (pathname.includes('/shifts/new')) {
    crumbs.push({ label: 'Shifts', href: `${base}/shifts` });
    crumbs.push({ label: 'Create shift' });
  } else if (/\/shifts\/[^/]+$/.test(pathname)) {
    crumbs.push({ label: 'Shifts', href: `${base}/shifts` });
    crumbs.push({ label: 'Shift detail' });
  } else if (pathname.includes('/shifts')) {
    crumbs.push({ label: 'Shifts' });
  } else if (pathname.includes('/timesheets')) {
    crumbs.push({ label: 'Timesheets' });
  } else if (pathname.includes('/payments')) {
    crumbs.push({ label: 'Worker payments' });
  } else if (/\/locations\/[^/]+$/.test(pathname)) {
    crumbs.push({ label: 'Locations & wards', href: `${base}/locations` });
    crumbs.push({ label: 'Location detail' });
  } else if (pathname.includes('/locations')) {
    crumbs.push({ label: 'Locations & wards' });
  } else if (pathname.includes('/settings')) {
    crumbs.push({ label: 'Settings' });
  } else {
    crumbs.push({ label: 'Dashboard' });
  }

  return crumbs;
}

export function OrgBreadcrumbBar({
  slug,
  orgName,
}: {
  slug: string;
  orgName: string;
}) {
  const pathname = usePathname();
  return <Breadcrumbs items={breadcrumbsForPath(slug, pathname, orgName)} />;
}
