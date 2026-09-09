import Link from 'next/link';

import { EmptyState } from '@/components/empty-state';
import { PermissionGuard } from '@/components/permission-guard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireOrgMembership } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { LocationForm } from './_components/location-form';

export default async function LocationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { slug } = await params;
  const { new: showNew } = await searchParams;
  const ctx = await requireOrgMembership(slug);
  const supabase = await createClient();

  const { data: locations } = await supabase
    .from('locations')
    .select('*, wards(count)')
    .eq('organization_id', ctx.org.id)
    .order('name');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Locations</h2>
          <p className="text-sm text-slate-600">
            Facilities and sites where shifts take place.
          </p>
        </div>
        <PermissionGuard allowed={ctx.capabilities.canManageLocations}>
          <Button asChild>
            <Link href={`/org/${slug}/locations?new=1`}>Add location</Link>
          </Button>
        </PermissionGuard>
      </div>

      <PermissionGuard allowed={ctx.capabilities.canManageLocations && showNew === '1'}>
        <Card>
          <CardHeader>
            <CardTitle>New location</CardTitle>
          </CardHeader>
          <CardContent>
            <LocationForm slug={slug} mode="create" />
          </CardContent>
        </Card>
      </PermissionGuard>

      {!locations?.length ? (
        <EmptyState
          title="No locations yet"
          description="Create a location before posting shifts."
          action={
            ctx.capabilities.canManageLocations ? (
              <Button asChild>
                <Link href={`/org/${slug}/locations?new=1`}>Add location</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="grid gap-3">
          {locations.map((location) => {
            const wardCount = Array.isArray(location.wards)
              ? (location.wards[0] as { count?: number })?.count ?? 0
              : 0;
            return (
              <li key={location.id}>
                <Link
                  href={`/org/${slug}/locations/${location.id}`}
                  className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{location.name}</p>
                      <p className="text-sm text-slate-500">
                        {[location.city, location.country_code].filter(Boolean).join(', ') ||
                          'No address'}
                        {' · '}
                        {wardCount} ward{wardCount === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
