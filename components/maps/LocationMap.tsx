import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { createElement, useMemo } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';

type Props = {
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  city?: string;
};

function mapsQuery(props: Props) {
  if (props.latitude != null && props.longitude != null) {
    return `${props.latitude},${props.longitude}`;
  }
  return `${props.address}, Cyprus`;
}

function googleMapsNavigateUrl(props: Props) {
  const destination = encodeURIComponent(mapsQuery(props));
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

function googleMapsEmbedUrl(props: Props) {
  const q = encodeURIComponent(mapsQuery(props));
  return `https://www.google.com/maps?q=${q}&z=16&output=embed`;
}

function staticMapUrl(props: Props) {
  const lat = props.latitude ?? 34.685;
  const lng = props.longitude ?? 33.04;
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=720x360&maptype=mapnik&markers=${lat},${lng},red-pushpin`;
}

async function openGoogleMaps(props: Props) {
  const url = googleMapsNavigateUrl(props);
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert('Maps', 'Unable to open Google Maps on this device.');
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert('Maps', 'Unable to open Google Maps on this device.');
  }
}

export function LocationMap({ name, address, latitude, longitude, city }: Props) {
  const props = useMemo(
    () => ({ name, address, latitude, longitude, city }),
    [name, address, latitude, longitude, city],
  );

  const embedSrc = useMemo(() => googleMapsEmbedUrl(props), [props]);
  const previewSrc = useMemo(() => staticMapUrl(props), [props]);

  return (
    <View style={styles.wrap}>
      <View style={styles.frame}>
        <View style={styles.mapSurface}>
          {Platform.OS === 'web'
            ? createElement('iframe', {
                src: embedSrc,
                title: `Map of ${name}`,
                loading: 'lazy',
                referrerPolicy: 'no-referrer-when-downgrade',
                style: {
                  border: 0,
                  width: '100%',
                  height: '100%',
                  display: 'block',
                },
              })
            : (
              <Pressable
                onPress={() => void openGoogleMaps(props)}
                accessibilityRole="button"
                accessibilityLabel="Open location in Google Maps"
                style={styles.nativePress}
              >
                <Image source={{ uri: previewSrc }} style={styles.staticMap} contentFit="cover" />
              </Pressable>
            )}
        </View>

        <LinearGradient
          colors={['transparent', 'rgba(7,26,47,0.55)', 'rgba(7,26,47,0.92)']}
          locations={[0, 0.45, 1]}
          style={styles.scrim}
          pointerEvents="none"
        />

        <View style={styles.pin} pointerEvents="none">
          <View style={styles.pinGlow} />
          <Ionicons name="location" size={22} color={colors.navy} />
        </View>

        <View style={styles.footer}>
          <View style={styles.footerCopy}>
            <Text style={styles.footerLabel}>Location</Text>
            <Text style={styles.footerAddress} numberOfLines={2}>
              {address}
            </Text>
          </View>
          <Pressable
            onPress={() => void openGoogleMaps(props)}
            style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Navigate with Google Maps"
          >
            <Ionicons name="navigate" size={16} color={colors.navy} />
            <Text style={styles.navLabel}>Navigate</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing.md,
  },
  frame: {
    height: 220,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.navy,
    borderWidth: 1,
    borderColor: 'rgba(245,176,0,0.28)',
  },
  mapSurface: {
    ...StyleSheet.absoluteFillObject,
  },
  nativePress: {
    flex: 1,
  },
  staticMap: {
    width: '100%',
    height: '100%',
  },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 108,
  },
  pin: {
    position: 'absolute',
    top: '38%',
    alignSelf: 'center',
    left: '50%',
    marginLeft: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 6,
  },
  pinGlow: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(245,176,0,0.22)',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  footerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  footerLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.yellow,
  },
  footerAddress: {
    fontFamily: typography.fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.white,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.yellow,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  navBtnPressed: {
    opacity: 0.88,
  },
  navLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: 13,
    color: colors.navy,
  },
});
