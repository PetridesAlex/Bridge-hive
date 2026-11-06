'use client';

import { useState } from 'react';

import { organizationInitials } from '@bridge-hive/domain';
import { cn } from '@/lib/utils';

export function OrgMark({
  displayName,
  logoUrl,
  size = 'md',
  className,
}: {
  displayName: string;
  logoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'display' | 'hero' | 'showcase';
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const initials = organizationInitials(displayName);
  const dims =
    size === 'showcase'
      ? 'h-[5.5rem] w-[5.5rem] text-[28px]'
      : size === 'hero'
      ? 'h-[4.5rem] w-[4.5rem] text-xl'
      : size === 'display'
        ? 'h-14 w-14 text-base'
        : size === 'lg'
          ? 'h-20 w-20 text-xl'
          : size === 'sm'
            ? 'h-9 w-9 text-xs'
            : 'h-10 w-10 text-sm';
  const radius =
    size === 'showcase'
      ? 'rounded-[1.6rem]'
      : size === 'hero'
        ? 'rounded-[1.15rem]'
        : 'rounded-2xl';

  if (logoUrl && !failed) {
    return (
      <span
        className={cn(
          'relative inline-flex shrink-0 overflow-hidden bg-bh-subtle ring-1 ring-bh-border',
          radius,
          dims,
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
        <span className="sr-only">{displayName} logo</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center bg-bh-teal/20 font-semibold text-bh-teal-strong',
        radius,
        dims,
        className,
      )}
      aria-hidden
    >
      {initials}
    </span>
  );
}
