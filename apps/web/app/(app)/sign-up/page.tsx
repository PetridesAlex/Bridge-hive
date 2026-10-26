import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = params.next ?? '';
  const hasInvitationContext =
    next.includes('/organization-invitations/accept') ||
    next.includes('/activate-organization-account');

  if (!hasInvitationContext) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 py-12">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-honey-strong">
            Bridge Hive
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-bh-text">
            Organization invitation required
          </h1>
          <p className="mt-2 text-sm text-bh-text-secondary">
            Hospital accounts are created by Bridge Hive. Use the secure activation
            email sent to your organization administrator.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="honey">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Return to home</Link>
          </Button>
        </div>
      </main>
    );
  }

  // Legacy invitation accept path may still land here before Auth invite emails.
  const { SignUpForm } = await import('@/components/sign-up-form');

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold text-bh-text">Create your account</h1>
        <p className="mt-1 text-sm text-bh-text-secondary">
          Create your account to accept an organization invitation.
        </p>
      </div>
      <SignUpForm next={params.next} />
      <p className="text-center text-sm text-bh-text-secondary">
        Already have an account?{' '}
        <Link
          href={params.next ? `/sign-in?next=${encodeURIComponent(params.next)}` : '/sign-in'}
          className="font-medium text-bh-text underline"
        >
          Sign in
        </Link>
      </p>
    </main>
  );
}
