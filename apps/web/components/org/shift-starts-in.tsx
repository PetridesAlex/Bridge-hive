'use client';

import { useEffect, useState } from 'react';

function describe(startMs: number, endMs: number, now: number): string {
  if (now >= endMs) return 'Ended';
  if (now >= startMs) return 'In progress';
  const mins = Math.max(1, Math.round((startMs - now) / 60_000));
  if (mins < 60) return `Starts in ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) {
    const rest = mins % 60;
    return rest ? `Starts in ${hours}h ${rest}m` : `Starts in ${hours}h`;
  }
  return `Starts in ${Math.round(hours / 24)} days`;
}

/** Live relative start label. Renders nothing until mounted to avoid hydration drift. */
export function ShiftStartsIn({ startsAt, endsAt }: { startsAt: string; endsAt: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (now === null) return null;
  return (
    <span className="bh-tabular">{describe(Date.parse(startsAt), Date.parse(endsAt), now)}</span>
  );
}
