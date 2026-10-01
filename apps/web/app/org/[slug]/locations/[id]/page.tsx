import { notFound } from 'next/navigation';

import { BackLink } from '@/components/org/back-link';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/org/page-header';
import { PermissionGuard } from '@/components/permission-guard';
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

  let existingImageUrl: string | null = null;
  const imagePath =
    location && 'image_path' in location
      ? (location.image_path as string | null)
      : null;
  if (imagePath) {
    const { data: signed } = await supabase.storage
      .from('location-images')
      .createSignedUrl(imagePath, 60 * 15);
    existingImageUrl = signed?.signedUrl ?? null;
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <BackLink href={`/org/${slug}/locations`} label="Locations" />
        <div className="flex flex-wrap items-start gap-4">
          {existingImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={existingImageUrl}
              alt=""
              className="h-20 w-28 shrink-0 rounded-2xl object-cover shadow-sm ring-1 ring-bh-border"
            />
          ) : null}
          <PageHeader
            title={location.name}
            subtitle={
              [location.address_line1, location.city, location.postal_code]
                .filter(Boolean)
                .join(', ') || 'No address set'
            }
          />
        </div>
      </div>

      <PermissionGuard allowed={ctx.capabilities.canManageLocations}>
        <Card>
          <CardHeader>
            <CardTitle>Edit location</CardTitle>
          </CardHeader>
          <CardContent>
            <LocationForm
              slug={slug}
              organizationId={ctx.org.id}
              location={location}
              mode="edit"
              existingImageUrl={existingImageUrl}
            />
          </CardContent>
        </Card>
      </PermissionGuard>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-bh-text">Wards</h3>

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
                className="rounded-xl border border-bh-border bg-bh-surface p-4"
              >
                <div className="mb-3">
                  <p className="font-medium text-bh-text">{ward.name}</p>
                  {ward.instructions ? (
                    <p className="mt-1 text-sm text-bh-text-muted">
                      {ward.instructions}
                    </p>
                  ) : null}
                </div>
                <PermissionGuard allowed={ctx.capabilities.canManageWards}>
                  <details className="text-sm">
                    <summary className="cursor-pointer text-bh-text-muted">
                      Edit ward
                    </summary>
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
