'use client';

import { useActionState, useEffect } from 'react';
import { toast } from 'sonner';

import {
  createWardAction,
  updateWardAction,
  type ActionResult,
} from '@/app/actions/locations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Tables } from '@bridge-hive/supabase-types';

type Ward = Tables<'wards'>;

const initial: ActionResult = {};

export function WardForm({
  slug,
  locationId,
  ward,
  mode,
  onDone,
}: {
  slug: string;
  locationId: string;
  ward?: Ward;
  mode: 'create' | 'edit';
  onDone?: () => void;
}) {
  const action =
    mode === 'create'
      ? createWardAction.bind(null, slug, locationId)
      : updateWardAction.bind(null, slug, locationId, ward!.id);

  const [state, formAction, pending] = useActionState(action, initial);

  useEffect(() => {
    if (state.success) {
      toast.success(mode === 'create' ? 'Ward created' : 'Ward updated');
      onDone?.();
    }
    if (state.error) toast.error(state.error);
  }, [state, mode, onDone]);

  return (
    <form action={formAction} className="grid gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="ward-name">Ward name</Label>
        <Input id="ward-name" name="name" required defaultValue={ward?.name ?? ''} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="instructions">Instructions</Label>
        <Textarea
          id="instructions"
          name="instructions"
          defaultValue={ward?.instructions ?? ''}
        />
      </div>
      {state.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} size="sm">
        {pending ? 'Saving…' : mode === 'create' ? 'Add ward' : 'Save ward'}
      </Button>
    </form>
  );
}
