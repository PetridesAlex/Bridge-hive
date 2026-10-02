'use client';

import { useActionState } from 'react';

import { signUpAction } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function SignUpForm({ next }: { next?: string }) {
  const [state, formAction, isPending] = useActionState(signUpAction, {});

  return (
    <form action={formAction}>
      <Card>
        <CardContent className="space-y-4 pt-6">
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">
              Email <span className="text-red-500">*</span>
            </span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              placeholder="you@example.com"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">
              Password <span className="text-red-500">*</span>
            </span>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              placeholder="At least 8 characters"
            />
          </label>
          {state.error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              {state.error}
            </div>
          ) : null}
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? 'Creating account...' : 'Create account'}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
