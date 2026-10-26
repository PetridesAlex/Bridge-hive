import {
  Building2,
  MapPin,
  PencilLine,
  Plus,
} from 'lucide-react';
import { notFound } from 'next/navigation';

import { BackLink } from '@/components/org/back-link';
import { EmptyState } from '@/components/empty-state';
import { PermissionGuard } from '@/components/permission-guard';
import { requireOrgMembership } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/server';

import { LocationForm } from '../_components/location-form';
import { WardForm } from '../_components/ward-form';
import { WardLibraryPanel } from '../_components/ward-library-panel';

function DetailPanel({
  eyebrow,
  title,
  description,
  icon: Icon,
  children,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  icon: typeof MapPin;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-bh-border/70 bg-bh-surface shadow-[0_8px_28px_rgba(7,29,48,0.05)]">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-bh-border/60 bg-[linear-gradient(180deg,#f7fafc_0%,#ffffff_100%)] px-5 py-5 sm:px-6">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#16384f] shadow-sm ring-1 ring-bh-border/80">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-bh-teal-strong">
                {eyebrow}
              </p>
            ) : null}
            <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-[#071d30]">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 max-w-xl text-sm leading-6 text-bh-text-secondary">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      <div className="px-5 py-5 sm:px-6 sm:py-6">{children}</div>
    </section>
  );
}

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

  const addressLine =
    [location.address_line1, location.city, location.postal_code]
      .filter(Boolean)
      .join(', ') || 'No address set';
  const metaBits = [
    location.country_code,
    location.timezone,
    location.contact_name,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-bh-border/70 bg-bh-surface shadow-[0_8px_28px_rgba(7,29,48,0.05)]">
        <div
          className={cn(
            'relative px-5 py-5 sm:px-6 sm:py-6',
            existingImageUrl
              ? 'min-h-[11rem] bg-[#071d30]'
              : 'bg-[linear-gradient(145deg,#f7fafc_0%,#ffffff_48%,#f3f8fa_100%)]',
          )}
        >
          {existingImageUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={existingImageUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-55"
              />
              <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(7,29,48,0.88)_0%,rgba(7,29,48,0.55)_55%,rgba(12,58,66,0.45)_100%)]" />
            </>
          ) : null}
          <div className="relative">
            <BackLink
              href={`/org/${slug}/locations`}
              label="Locations"
              className={cn(
                'mb-4',
                existingImageUrl &&
                  'border-white/25 bg-white/12 text-white shadow-none hover:border-white/40 hover:bg-white/20 hover:text-white',
              )}
            />
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0 max-w-2xl">
                <p
                  className={cn(
                    'text-[11px] font-semibold uppercase tracking-[0.18em]',
                    existingImageUrl ? 'text-bh-honey' : 'text-bh-teal-strong',
                  )}
                >
                  Location
                </p>
                <h1
                  className={cn(
                    'mt-2 text-2xl font-extrabold tracking-[-0.03em] sm:text-[1.75rem]',
                    existingImageUrl ? 'text-white' : 'text-[#071d30]',
                  )}
                >
                  {location.name}
                </h1>
                <p
                  className={cn(
                    'mt-2 flex items-start gap-2 text-sm leading-6',
                    existingImageUrl
                      ? 'text-white/75'
                      : 'text-bh-text-secondary',
                  )}
                >
                  <MapPin
                    className={cn(
                      'mt-0.5 h-4 w-4 shrink-0',
                      existingImageUrl ? 'text-bh-honey' : 'text-bh-teal-strong',
                    )}
                    aria-hidden
                  />
                  <span>{addressLine}</span>
                </p>
                {metaBits.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {metaBits.map((bit) => (
                      <span
                        key={String(bit)}
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold',
                          existingImageUrl
                            ? 'bg-white/12 text-white/85 ring-1 ring-white/15'
                            : 'border border-bh-border bg-white text-bh-text-secondary',
                        )}
                      >
                        {bit}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div
                className={cn(
                  'rounded-2xl px-4 py-3 text-sm',
                  existingImageUrl
                    ? 'bg-white/10 text-white/80 ring-1 ring-white/15 backdrop-blur'
                    : 'border border-bh-border bg-white text-bh-text-secondary shadow-sm',
                )}
              >
                <p
                  className={cn(
                    'text-[11px] font-semibold uppercase tracking-[0.14em]',
                    existingImageUrl ? 'text-white/55' : 'text-bh-text-muted',
                  )}
                >
                  Wards
                </p>
                <p
                  className={cn(
                    'mt-1 text-2xl font-semibold tracking-tight',
                    existingImageUrl ? 'text-white' : 'text-[#071d30]',
                  )}
                >
                  {wards?.length ?? 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PermissionGuard allowed={ctx.capabilities.canManageLocations}>
        <DetailPanel
          eyebrow="Details"
          title="Edit location"
          description="Facility photo, address, and on-site contact for this site."
          icon={Building2}
        >
          <LocationForm
            slug={slug}
            organizationId={ctx.org.id}
            location={location}
            mode="edit"
            existingImageUrl={existingImageUrl}
          />
        </DetailPanel>
      </PermissionGuard>

      <WardLibraryPanel
        slug={slug}
        locations={[{ id: location.id, name: location.name }]}
        wards={(wards ?? []).map((ward) => ({
          id: ward.id,
          name: ward.name,
          locationId: location.id,
        }))}
        defaultLocationId={location.id}
        canManageWards={ctx.capabilities.canManageWards}
      />

      <DetailPanel
        eyebrow="Structure"
        title="Wards at this location"
        description="Departments and units used when creating shifts here."
        icon={PencilLine}
      >
        {!wards?.length ? (
          <EmptyState
            title="No wards yet"
            description="Add a ward below, or use the ward library for standard healthcare units."
          />
        ) : (
          <ul className="space-y-3">
            {wards.map((ward) => (
              <li
                key={ward.id}
                className="rounded-2xl border border-bh-border/70 bg-[linear-gradient(180deg,#ffffff_0%,#f7fafc_100%)] p-4 shadow-[0_1px_2px_rgba(7,29,48,0.03)] transition-shadow hover:shadow-[0_8px_20px_rgba(7,29,48,0.06)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold tracking-tight text-[#071d30]">
                      {ward.name}
                    </p>
                    {ward.instructions ? (
                      <p className="mt-1 max-w-2xl text-sm leading-6 text-bh-text-secondary">
                        {ward.instructions}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-bh-text-muted">
                        No arrival instructions yet.
                      </p>
                    )}
                  </div>
                </div>
                <PermissionGuard allowed={ctx.capabilities.canManageWards}>
                  <details className="group mt-4 border-t border-bh-border/60 pt-3">
                    <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-bh-teal-strong transition-colors hover:text-[#071d30]">
                      <PencilLine className="h-3.5 w-3.5" aria-hidden />
                      Edit ward
                    </summary>
                    <div className="mt-3 rounded-xl border border-bh-border/70 bg-white p-4">
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
      </DetailPanel>

      <PermissionGuard allowed={ctx.capabilities.canManageWards}>
        <DetailPanel
          eyebrow="Add"
          title="New ward"
          description="Create a custom ward name for this location only."
          icon={Plus}
        >
          <WardForm slug={slug} locationId={location.id} mode="create" />
        </DetailPanel>
      </PermissionGuard>
    </div>
  );
}
