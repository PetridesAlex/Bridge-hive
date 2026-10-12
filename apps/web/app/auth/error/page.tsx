import Link from 'next/link';

import { friendlyAuthLinkError } from '@bridge-hive/domain';

import {
  OrganizationActivationShell,
  OrganizationActivationSignInFooter,
} from '@/components/auth/organization-activation-shell';
import { Button } from '@/components/ui/button';

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const errorCode =
    first(params.error_code) ?? first(params.error) ?? undefined;
  const { title, body } = friendlyAuthLinkError(errorCode);

  return (
    <OrganizationActivationShell
      step="status"
      title={title}
      description={body}
      showOrgChrome={false}
      footer={<OrganizationActivationSignInFooter />}
    >
      <Button asChild className="w-full min-h-11">
        <Link href="/sign-in">Back to sign in</Link>
      </Button>
    </OrganizationActivationShell>
  );
}

function first(
  value: string | string[] | undefined,
): string | null {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return null;
}
