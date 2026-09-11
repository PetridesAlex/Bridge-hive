'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { useActionState, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export type ConfirmActionResult = {
  error?: string;
  success?: boolean;
};

type ConfirmDialogProps = {
  title: string;
  description: string;
  confirmLabel: string;
  requireReason?: boolean;
  reasonLabel?: string;
  destructive?: boolean;
  hiddenFields?: Record<string, string>;
  action: (
    prev: ConfirmActionResult,
    formData: FormData,
  ) => Promise<ConfirmActionResult>;
  triggerLabel: string;
  triggerVariant?: 'default' | 'destructive' | 'outline' | 'secondary';
  disabled?: boolean;
};

const initialState: ConfirmActionResult = {};

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  requireReason = false,
  reasonLabel = 'Reason',
  destructive = false,
  hiddenFields,
  action,
  triggerLabel,
  triggerVariant = 'default',
  disabled = false,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: ConfirmActionResult, formData: FormData) => {
      const result = await action(prev, formData);
      if (!result.error) {
        setOpen(false);
      }
      return result;
    },
    initialState,
  );

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button
          type="button"
          variant={triggerVariant}
          size="sm"
          disabled={disabled}
        >
          {triggerLabel}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(100%-2rem,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-6 shadow-xl focus:outline-none">
          <Dialog.Title className="text-lg font-semibold text-slate-900">
            {title}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-slate-600">
            {description}
          </Dialog.Description>
          <form action={formAction} className="mt-4 flex flex-col gap-4">
            {hiddenFields
              ? Object.entries(hiddenFields).map(([name, value]) => (
                  <input key={name} type="hidden" name={name} value={value} />
                ))
              : null}
            {requireReason ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reason">{reasonLabel}</Label>
                <Textarea
                  id="reason"
                  name="reason"
                  required
                  rows={3}
                  placeholder="Provide a clear reason for the audit trail"
                />
              </div>
            ) : null}
            {state.error ? (
              <p
                className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
                role="alert"
              >
                {state.error}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button type="button" variant="outline" size="sm">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button
                type="submit"
                size="sm"
                variant={destructive ? 'destructive' : 'default'}
                disabled={pending}
              >
                {pending ? 'Working…' : confirmLabel}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
