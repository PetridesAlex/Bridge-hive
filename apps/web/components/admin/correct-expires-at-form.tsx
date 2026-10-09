'use client';

import { useActionState } from 'react';

import {
  correctCredentialExpiresAtAction,
  type AdminActionResult,
} from '@/app/actions/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initial: AdminActionResult = {};

/**
 * Verifier corrects expires_at to match the private document.
 * Does not approve the credential or activate the worker.
 */
export function CorrectExpiresAtForm({
  credentialId,
  currentExpiresAt,
}: {
  credentialId: string;
  currentExpiresAt: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    correctCredentialExpiresAtAction,
    initial,
  );

  const defaultYmd = currentExpiresAt
    ? currentExpiresAt.slice(0, 10)
    : '';

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <input type="hidden" name="credentialId" value={credentialId} />
      <div className="space-y-1.5">
        <Label htmlFor="expiresAtYmd">Correct expiry date (Cyprus)</Label>
        <Input
          id="expiresAtYmd"
          name="expiresAtYmd"
          type="date"
          required
          defaultValue={defaultYmd}
          className="max-w-xs"
        />
        <p className="text-xs text-slate-500">
          Confirm or correct the date against the private document. Stored as
          end of that Europe/Nicosia business day. Does not approve this
          credential.
        </p>
      </div>
      {state.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-emerald-700" role="status">
          Expiry metadata updated.
        </p>
      ) : null}
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? 'Saving…' : 'Save expiry date'}
      </Button>
    </form>
  );
}
