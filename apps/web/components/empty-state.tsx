import { cn } from '@/lib/utils';

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-dashed border-bh-border bg-bh-surface px-6 py-12 text-center',
        className,
      )}
    >
      <h3 className="text-base font-medium text-bh-text">{title}</h3>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm text-bh-text-secondary">{description}</p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
