'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, ShieldCheck, X } from 'lucide-react';
import { useActionState, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

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
  triggerClassName?: string;
  triggerSize?: 'default' | 'sm' | 'lg' | 'icon';
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
  triggerClassName,
  triggerSize = 'sm',
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

  const Icon = destructive ? AlertTriangle : ShieldCheck;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button
          type="button"
          variant={triggerVariant}
          size={triggerSize}
          className={triggerClassName}
          disabled={disabled}
        >
          {triggerLabel}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#071A2F]/45 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[min(100%-2rem,28rem)] -translate-x-1/2 -translate-y-1/2',
            'bh-admin-glass overflow-hidden rounded-[1.25rem] border border-bh-border/80',
            'shadow-[0_24px_64px_rgba(7,29,48,0.22)] focus:outline-none',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
            'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
          )}
        >
          <div
            aria-hidden
            className={cn(
              'h-1.5 bg-gradient-to-r',
              destructive
                ? 'from-[#B42318] via-bh-honey to-[#B42318]'
                : 'from-bh-sidebar via-bh-teal to-bh-honey',
            )}
          />

          <div className="relative p-5 sm:p-6">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(420px_180px_at_0%_0%,rgba(22,166,182,0.08),transparent_55%),radial-gradient(360px_160px_at_100%_0%,rgba(224,170,24,0.08),transparent_50%)]"
            />

            <Dialog.Close asChild>
              <button
                type="button"
                className="absolute right-4 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-bh-border/80 bg-white text-bh-text-muted shadow-sm transition hover:border-bh-teal/40 hover:bg-bh-teal-soft/40 hover:text-bh-teal-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bh-teal"
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </Dialog.Close>

            <div className="relative flex items-start gap-3.5 pr-8">
              <span
                className={cn(
                  'mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]',
                  destructive
                    ? 'bg-[#B42318] text-white'
                    : 'bg-bh-sidebar text-white',
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p
                  className={cn(
                    'text-[10px] font-bold uppercase tracking-[0.16em]',
                    destructive ? 'text-bh-danger' : 'text-bh-teal-strong',
                  )}
                >
                  {destructive ? 'Confirm action' : 'Administrative approval'}
                </p>
                <Dialog.Title className="mt-1 text-xl font-semibold tracking-tight text-bh-text">
                  {title}
                </Dialog.Title>
              </div>
            </div>

            <Dialog.Description className="relative mt-4 rounded-2xl border border-bh-border/70 bg-gradient-to-b from-bh-subtle/80 to-white px-3.5 py-3 text-sm leading-6 text-bh-text-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              {description}
            </Dialog.Description>

            <form action={formAction} className="relative mt-5 flex flex-col gap-4">
              {hiddenFields
                ? Object.entries(hiddenFields).map(([name, value]) => (
                    <input key={name} type="hidden" name={name} value={value} />
                  ))
                : null}
              {requireReason ? (
                <div className="flex flex-col gap-1.5">
                  <Label
                    htmlFor="reason"
                    className="text-[11px] font-semibold uppercase tracking-[0.12em] text-bh-text-muted"
                  >
                    {reasonLabel}
                  </Label>
                  <Textarea
                    id="reason"
                    name="reason"
                    required
                    rows={3}
                    placeholder="Provide a clear reason for the audit trail"
                    className="rounded-xl border-bh-border/80 bg-white shadow-sm focus-visible:ring-bh-teal"
                  />
                </div>
              ) : null}
              {state.error ? (
                <p
                  className="rounded-xl border border-bh-danger/25 bg-bh-danger-soft px-3.5 py-2.5 text-sm font-medium text-bh-danger"
                  role="alert"
                >
                  {state.error}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-bh-border/70 pt-4">
                <Dialog.Close asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 rounded-full border-bh-border px-4 font-semibold text-bh-text shadow-sm hover:border-bh-teal/40 hover:bg-bh-teal-soft/35 hover:text-bh-teal-strong"
                  >
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button
                  type="submit"
                  size="sm"
                  variant={destructive ? 'destructive' : 'default'}
                  disabled={pending}
                  className={cn(
                    'h-10 rounded-full px-5 font-semibold shadow-[0_10px_22px_rgba(7,29,48,0.18)] transition hover:-translate-y-0.5 disabled:translate-y-0',
                    !destructive &&
                      'bg-bh-sidebar text-white hover:bg-bh-sidebar-raised',
                    destructive &&
                      'shadow-[0_10px_22px_rgba(180,35,24,0.22)]',
                  )}
                >
                  {pending ? 'Working…' : confirmLabel}
                </Button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
