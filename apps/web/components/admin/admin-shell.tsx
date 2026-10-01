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
    <div className="flex min-h-screen bg-bh-canvas">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-bh-surface focus:px-3 focus:py-2 focus:shadow"
      >
        Skip to content
      </a>

      <div className="sticky top-0 hidden h-screen shrink-0 min-[1180px]:block">
        <AdminSidebar
          capabilities={capabilities}
          displayName={displayName}
          email={email}
          queueCounts={queueCounts}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
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
          {children}
        </main>
      </div>
    </div>
  );
}
