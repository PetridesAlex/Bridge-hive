'use client';

import { useRouter } from 'next/navigation';
import {
  useRef,
  useTransition,
  type FormEvent,
  type ReactNode,
} from 'react';

function hrefFromForm(pathname: string, form: HTMLFormElement): string {
  const params = new URLSearchParams();
  const formData = new FormData(form);
  for (const [key, value] of formData.entries()) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed) params.set(key, trimmed);
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/**
 * GET filters that stay on the App Router instead of a full document reload.
 * Select changes navigate immediately; search text is debounced.
 */
export function OrgClientFilterForm({
  pathname,
  className,
  children,
  debounceMs = 280,
}: {
  pathname: string;
  className?: string;
  children: ReactNode;
  debounceMs?: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const timerRef = useRef<number | null>(null);
  const generationRef = useRef(0);

  const navigate = (form: HTMLFormElement) => {
    const generation = ++generationRef.current;
    const href = hrefFromForm(pathname, form);
    startTransition(() => {
      if (generation !== generationRef.current) return;
      router.push(href, { scroll: false });
    });
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (timerRef.current) window.clearTimeout(timerRef.current);
    navigate(event.currentTarget);
  };

  const onChange = (event: FormEvent<HTMLFormElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const form = event.currentTarget;
    if (target instanceof HTMLSelectElement) {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      navigate(form);
      return;
    }
    if (
      target instanceof HTMLInputElement &&
      target.type !== 'hidden' &&
      target.type !== 'submit'
    ) {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => navigate(form), debounceMs);
    }
  };

  return (
    <form
      method="get"
      action={pathname}
      className={className}
      onSubmit={onSubmit}
      onChange={onChange}
      aria-busy={pending || undefined}
    >
      {children}
    </form>
  );
}
