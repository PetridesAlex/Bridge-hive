import { Ionicons } from '@expo/vector-icons';
import React from 'react';

import { Badge } from '@/components/ui/Badge';
import { shiftStatusStyles, type StatusStyle } from '@/constants/theme';
import type { ShiftStatus } from '@/types';

export { MetaRow, ShiftMetaGrid } from '@/components/shifts/ShiftMeta';

type Props = {
  status: ShiftStatus | 'URGENT';
};

export function ShiftStatusBadge({ status }: Props) {
  const style: StatusStyle = shiftStatusStyles[status] ?? shiftStatusStyles.OPEN;
  return (
    <Badge
      label={style.label.toUpperCase()}
      color={style.fg}
      backgroundColor={style.bg}
      icon={style.icon as keyof typeof Ionicons.glyphMap}
    />
  );
}
