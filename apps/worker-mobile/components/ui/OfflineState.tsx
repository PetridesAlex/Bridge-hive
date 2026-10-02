import React from 'react';

import { EmptyState } from '@/components/ui/EmptyState';

type Props = {
  title?: string;
  description?: string;
  onRetry?: () => void;
};

/** Offline presentation — never confuse with a true empty list. */
export function OfflineState({
  title = 'You appear to be offline',
  description = 'Check your connection and pull to refresh when you are back online.',
  onRetry,
}: Props) {
  return (
    <EmptyState
      title={title}
      description={description}
      icon="wifi-outline"
      actionLabel={onRetry ? 'Retry' : undefined}
      onAction={onRetry}
    />
  );
}
