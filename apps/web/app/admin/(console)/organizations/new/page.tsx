import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { CreateOrganizationForm } from '@/components/admin/create-organization-form';
import { EmptyState } from '@/components/empty-state';
import { requirePlatformAdmin } from '@/lib/admin/auth';

export default async function NewOrganizationPage() {
  const ctx = await requirePlatformAdmin('platform_super_admin');
  if (!ctx.capabilities.canManageOrganizations) {
    return (
      <EmptyState
        title="Permission denied"
        description="Your role cannot manage organizations."
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/admin/organizations"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-bh-text-secondary transition hover:text-bh-text"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to organizations
        </Link>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-bh-honey-strong">
          Provisioning
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-bh-text">
          Create organization
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-bh-text-secondary">
          Organization will be created in pending status. The admin invitation will
          be sent immediately.
        </p>
      </div>
      <CreateOrganizationForm />
    </div>
  );
}
