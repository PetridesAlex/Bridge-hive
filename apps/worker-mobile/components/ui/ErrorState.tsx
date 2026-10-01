import React from 'react';

import { EmptyState } from '@/components/ui/EmptyState';

type Props = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
};

/** Query/server error with optional safe Retry. */
export function ErrorState({
  title = 'Something went wrong',
  description = 'We could not load this information. Check your connection and try again.',
  onRetry,
  retryLabel = 'Retry',
}: Props) {
  return (
    <EmptyState
      title={title}
      description={description}
      icon="cloud-offline-outline"
      actionLabel={onRetry ? retryLabel : undefined}
      onAction={onRetry}
    />
  );
}
