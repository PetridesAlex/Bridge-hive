import Image from 'next/image';

export function OrgDashboardBanner() {
  return (
    <div className="overflow-hidden rounded-2xl border border-bh-border bg-bh-surface shadow-[0_8px_24px_rgba(7,29,48,0.06)]">
      <div className="relative aspect-[1024/249] w-full">
        <Image
          src="/org/bridge-hive-dashboard-banner.webp"
          alt="Bridge Hive — Connecting healthcare professionals"
          fill
          priority
          sizes="(max-width: 768px) 100vw, min(1100px, 100vw)"
          className="object-cover object-left"
        />
      </div>
    </div>
  );
}
