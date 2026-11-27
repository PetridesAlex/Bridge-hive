import { cn } from '@/lib/utils';

export function Badge({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'muted';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.02em]',
        variant === 'default' &&
          'border-[#0B2A43]/40 bg-[#0B2A43] text-white shadow-[0_1px_0_rgba(255,255,255,0.12)_inset]',
        variant === 'success' &&
          'border-emerald-700/35 bg-emerald-700 text-white shadow-[0_1px_0_rgba(255,255,255,0.14)_inset]',
        variant === 'warning' &&
          'border-amber-700/40 bg-[#C47A00] text-white shadow-[0_1px_0_rgba(255,255,255,0.16)_inset]',
        variant === 'danger' &&
          'border-red-800/35 bg-[#B42318] text-white shadow-[0_1px_0_rgba(255,255,255,0.12)_inset]',
        variant === 'muted' &&
          'border-[#0B2A43]/12 bg-[#0B2A43]/08 text-[#0B2A43]',
        className,
      )}
      {...props}
    />
  );
}
