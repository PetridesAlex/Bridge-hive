import { EmptyState } from '@/components/empty-state';
import { requirePlatformAdmin } from '@/lib/admin/auth';

export default async function AdminFinancePlaceholderPage() {
  const ctx = await requirePlatformAdmin();

  if (!ctx.capabilities.canViewFinancePlaceholder) {
    return (
      <EmptyState
        title="Permission denied"
        description="Finance tools are limited to platform finance and super admin roles."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Finance</h2>
        <p className="mt-1 text-sm text-slate-600">
          Payment reconciliation and commission tooling are deferred. Existing finance
          RPCs remain available to authorized roles, but this console does not expose
          them yet.
        </p>
      </div>
      <EmptyState
        title="Finance dashboard coming later"
        description="Use SQL or a future Phase for payout reconciliation. Credential verification powers are not granted by finance role alone."
      />
    </div>
  );
}
