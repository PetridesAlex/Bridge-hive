import React from 'react';

import { WorkplaceMapFallback } from '@/components/shifts/WorkplaceMapFallback';

const DEFAULT_HEIGHT = 200;

/** Web has no react-native-maps — show address-card fallback only. */
export const supportsInteractiveMap: boolean = false;

type Props = {
  latitude: number;
  longitude: number;
  title: string;
  interactive?: boolean;
  height?: number;
  fill?: boolean;
};

export function WorkplaceMapView({
  height = DEFAULT_HEIGHT,
  fill = false,
}: Props) {
  return <WorkplaceMapFallback height={height} fill={fill} />;
}
