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
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/organizations"
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          ← Back to organizations
        </Link>
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">
          Create organization
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Organization will be created in pending status. The admin invitation will
          be sent immediately.
        </p>
      </div>
      <CreateOrganizationForm />
    </div>
  );
}
