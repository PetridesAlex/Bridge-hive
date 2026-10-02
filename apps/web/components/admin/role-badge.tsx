import { Badge } from '@/components/ui/badge';
import { platformRoleLabel } from '@/lib/admin/labels';

const VARIANT: Record<
  string,
  'default' | 'success' | 'warning' | 'danger' | 'muted'
> = {
  platform_support: 'muted',
  platform_verifier: 'default',
  platform_finance: 'warning',
  platform_super_admin: 'success',
};

export function RoleBadge({ role }: { role: string }) {
  return (
    <Badge variant={VARIANT[role] ?? 'muted'}>{platformRoleLabel(role)}</Badge>
  );
}
