import Link from 'next/link';
import { notFound } from 'next/navigation';

import { EmptyState } from '@/components/empty-state';
import { PermissionGuard } from '@/components/permission-guard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireOrgMembership } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

import { LocationForm } from '../_components/location-form';
import { WardForm } from '../_components/ward-form';

export default async function LocationDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const ctx = await requireOrgMembership(slug);
  const supabase = await createClient();

  const { data: location } = await supabase
    .from('locations')
    .select('*')
    .eq('id', id)
    .eq('organization_id', ctx.org.id)
    .maybeSingle();

  if (!location) notFound();

  const { data: wards } = await supabase
    .from('wards')
    .select('*')
    .eq('location_id', location.id)
    .order('name');

  return (
    <div className="space-y-8">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
          <Link href={`/org/${slug}/locations`}>← Locations</Link>
        </Button>
        <h2 className="text-2xl font-semibold text-slate-900">{location.name}</h2>
        <p className="text-sm text-slate-600">
          {[location.address_line1, location.city, location.postal_code]
            .filter(Boolean)
            .join(', ') || 'No address set'}
        </p>
      </div>

      <PermissionGuard allowed={ctx.capabilities.canManageLocations}>
        <Card>
          <CardHeader>
            <CardTitle>Edit location</CardTitle>
          </CardHeader>
          <CardContent>
            <LocationForm slug={slug} location={location} mode="edit" />
          </CardContent>
        </Card>
      </PermissionGuard>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Wards</h3>

        {!wards?.length ? (
          <EmptyState
            title="No wards yet"
            description="Add wards or departments for this location."
          />
        ) : (
          <ul className="space-y-3">
            {wards.map((ward) => (
              <li
                key={ward.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="mb-3">
                  <p className="font-medium text-slate-900">{ward.name}</p>
                  {ward.instructions ? (
                    <p className="mt-1 text-sm text-slate-600">{ward.instructions}</p>
                  ) : null}
                </div>
                <PermissionGuard allowed={ctx.capabilities.canManageWards}>
                  <details className="text-sm">
                    <summary className="cursor-pointer text-slate-600">Edit ward</summary>
                    <div className="mt-3">
                      <WardForm
                        slug={slug}
                        locationId={location.id}
                        ward={ward}
                        mode="edit"
                      />
                    </div>
                  </details>
                </PermissionGuard>
              </li>
            ))}
          </ul>
        )}

        <PermissionGuard allowed={ctx.capabilities.canManageWards}>
          <Card>
            <CardHeader>
              <CardTitle>Add ward</CardTitle>
            </CardHeader>
            <CardContent>
              <WardForm slug={slug} locationId={location.id} mode="create" />
            </CardContent>
          </Card>
        </PermissionGuard>
      </section>
    </div>
  );
}
