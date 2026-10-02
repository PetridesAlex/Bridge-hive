import Link from 'next/link';

import { friendlyAuthLinkError } from '@bridge-hive/domain';

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
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-honey-strong">
        Bridge Hive
      </p>
      <h1 className="text-2xl font-semibold text-bh-text">{title}</h1>
      <p className="text-sm text-bh-text-secondary">{body}</p>
      <Button asChild className="mt-2">
        <Link href="/sign-in">Back to sign in</Link>
      </Button>
    </main>
  );
}

function first(
  value: string | string[] | undefined,
): string | null {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return null;
}
