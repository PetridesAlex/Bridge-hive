import Constants, { ExecutionEnvironment } from 'expo-constants';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { WorkplaceMapFallback } from '@/components/shifts/WorkplaceMapFallback';
import { colors } from '@/constants/theme';
import { canRenderNativeMap, readAndroidGoogleMapsKeyConfigured } from '@/lib/native-maps';

const STREET_DELTA = 0.0045;
const DEFAULT_HEIGHT = 200;

export const supportsInteractiveMap: boolean = canRenderNativeMap({
  platform: Platform.OS,
  isExpoGo: Constants.executionEnvironment === ExecutionEnvironment.StoreClient,
  androidGoogleMapsKeyConfigured: readAndroidGoogleMapsKeyConfigured(Constants.expoConfig?.extra),
});

type Props = {
  latitude: number;
  longitude: number;
  title: string;
  interactive?: boolean;
  height?: number;
  fill?: boolean;
};

class MapErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Native MapView centered on the workplace pin (street-level). */
export function WorkplaceMapView({
  latitude,
  longitude,
  title,
  interactive = false,
  height = DEFAULT_HEIGHT,
  fill = false,
}: Props) {
  const fallback = <WorkplaceMapFallback height={height} fill={fill} />;
  if (!supportsInteractiveMap) return fallback;

  return (
    <MapErrorBoundary fallback={fallback}>
      <View style={[styles.frame, fill ? styles.fill : { height }]}>
        <MapView
          style={StyleSheet.absoluteFillObject}
          region={{
            latitude,
            longitude,
            latitudeDelta: STREET_DELTA,
            longitudeDelta: STREET_DELTA,
          }}
          scrollEnabled={interactive}
          zoomEnabled={interactive}
          pitchEnabled={false}
          rotateEnabled={false}
          toolbarEnabled={false}
          showsCompass={interactive}
          showsPointsOfInterests={false}
        >
          <Marker
            coordinate={{ latitude, longitude }}
            title={title}
            pinColor={colors.tealStrong}
          />
        </MapView>
      </View>
    </MapErrorBoundary>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    backgroundColor: colors.surfaceSubdued,
  },
  fill: {
    flex: 1,
  },
});
