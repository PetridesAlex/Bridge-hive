'use client';

import { ArrowRight, Loader2, Plus } from 'lucide-react';
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

  const fieldClass =
    'rounded-xl border-bh-border/80 bg-white shadow-[0_1px_2px_rgba(7,29,48,0.03)] focus-visible:border-bh-teal focus-visible:ring-bh-teal/25';
  const labelClass =
    'text-[11px] font-semibold uppercase tracking-[0.08em] text-bh-text-muted';

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2 space-y-1.5">
        <Label htmlFor={`ward-name-${ward?.id ?? 'new'}`} className={labelClass}>
          Ward name
        </Label>
        <Input
          id={`ward-name-${ward?.id ?? 'new'}`}
          name="name"
          required
          defaultValue={ward?.name ?? ''}
          className={`h-11 ${fieldClass}`}
          placeholder="e.g. ICU, A&E, Paediatric Oncology"
        />
      </div>
      <div className="sm:col-span-2 space-y-1.5">
        <Label
          htmlFor={`ward-instructions-${ward?.id ?? 'new'}`}
          className={labelClass}
        >
          Instructions
        </Label>
        <Textarea
          id={`ward-instructions-${ward?.id ?? 'new'}`}
          name="instructions"
          defaultValue={ward?.instructions ?? ''}
          className={`min-h-[6.5rem] ${fieldClass}`}
          placeholder="Arrival notes, entrance, or unit contact details"
        />
      </div>
      {state.error ? (
        <p className="sm:col-span-2 text-sm text-bh-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="sm:col-span-2 flex justify-end">
        <Button
          type="submit"
          disabled={pending}
          variant="honey"
          size="lg"
          className="group min-h-11 justify-between gap-3 rounded-xl px-5 shadow-[0_10px_24px_rgba(228,179,52,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(228,179,52,0.38)] active:translate-y-0 active:shadow-[0_6px_16px_rgba(228,179,52,0.22)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Saving…
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" aria-hidden />
                {mode === 'create' ? 'Add ward' : 'Save ward'}
              </span>
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden
              />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
