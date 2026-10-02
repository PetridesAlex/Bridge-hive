export default function OrgLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="h-10 w-64 animate-pulse rounded-lg bg-bh-subtle" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl border border-bh-border bg-bh-surface" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-xl border border-bh-border bg-bh-surface" />
        <div className="h-64 animate-pulse rounded-xl border border-bh-border bg-bh-surface" />
      </div>
      <div className="h-48 animate-pulse rounded-xl border border-bh-border bg-bh-surface" />
    </div>
  );
}
