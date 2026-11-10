import { Sparkles } from 'lucide-react';

export function AdminBossmanQuote() {
  return (
    <aside
      aria-label="Bossman greeting"
      className="group/quote relative mb-5 overflow-hidden rounded-2xl border border-bh-sidebar/20 bg-[linear-gradient(120deg,#16384f_0%,#071d30_48%,#0c3a42_100%)] px-4 py-3.5 text-white shadow-[0_14px_36px_rgba(7,29,48,0.22)] sm:mb-6 sm:px-5 sm:py-4"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-bh-honey via-bh-teal to-bh-honey"
      />
      <span
        aria-hidden
        className="bh-orb-drift pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-bh-teal/25 blur-3xl"
      />
      <span
        aria-hidden
        className="bh-orb-drift pointer-events-none absolute -bottom-12 left-1/3 h-24 w-24 rounded-full bg-bh-honey/20 blur-3xl"
        style={{ animationDelay: '-5s' }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition duration-700 group-hover/quote:opacity-100 bh-btn-flow bg-[linear-gradient(110deg,transparent_15%,rgba(255,255,255,0.08)_45%,transparent_70%)]"
      />

      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bh-honey text-bh-sidebar shadow-[0_8px_18px_rgba(224,170,24,0.35)]">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-bh-honey">
              Bossman desk
            </p>
            <p className="mt-0.5 text-[15px] font-semibold tracking-tight text-white sm:text-base">
              <span className="mr-1.5 font-serif text-xl leading-none text-bh-honey/90" aria-hidden>
                “
              </span>
              Hello Bossman, How do you feel today?
              <span className="ml-1 font-serif text-xl leading-none text-bh-honey/90" aria-hidden>
                ”
              </span>
            </p>
          </div>
        </div>
        <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-white/80 backdrop-blur-sm">
          Premium daily check-in
        </span>
      </div>
    </aside>
  );
}
