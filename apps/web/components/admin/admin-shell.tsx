import { AdminBossmanQuote } from '@/components/admin/admin-bossman-quote';
import { AdminSidebar, type AdminQueueCounts } from '@/components/admin/admin-sidebar';
import { AdminTopbar } from '@/components/admin/admin-topbar';
import type { PlatformCapabilities } from '@/lib/admin/capabilities';

export function AdminShell({
  capabilities,
  displayName,
  email,
  queueCounts,
  children,
}: {
  capabilities: PlatformCapabilities;
  displayName: string;
  email?: string | null;
  queueCounts: AdminQueueCounts;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen overflow-x-clip bg-[#d8e3eb]">
      {/* Soft brand atmosphere — cool slate base + navy/teal washes so white cards lift */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: [
            'radial-gradient(1100px 560px at 8% -12%, rgba(7, 29, 48, 0.12), transparent 64%)',
            'radial-gradient(900px 520px at 96% 4%, rgba(22, 166, 182, 0.14), transparent 60%)',
            'radial-gradient(760px 460px at 78% 108%, rgba(11, 42, 67, 0.08), transparent 58%)',
            'linear-gradient(165deg, #d5e1ea 0%, #e2ebf1 36%, #dce8ef 72%, #d7e4ec 100%)',
          ].join(', '),
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            'radial-gradient(rgba(7, 29, 48, 0.045) 0.75px, transparent 0.75px)',
          backgroundSize: '20px 20px',
          maskImage:
            'linear-gradient(180deg, rgba(0,0,0,0.5), rgba(0,0,0,0.16) 52%, transparent 100%)',
        }}
      />

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-bh-surface focus:px-3 focus:py-2 focus:shadow"
      >
        Skip to content
      </a>

      <div className="sticky top-0 z-10 hidden h-screen shrink-0 min-[1180px]:block">
        <AdminSidebar
          capabilities={capabilities}
          displayName={displayName}
          email={email}
          queueCounts={queueCounts}
        />
      </div>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <AdminTopbar
          capabilities={capabilities}
          displayName={displayName}
          email={email}
          queueCounts={queueCounts}
        />
        <main
          id="main-content"
          className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        >
          <AdminBossmanQuote />
          {children}
        </main>
      </div>
    </div>
  );
}
