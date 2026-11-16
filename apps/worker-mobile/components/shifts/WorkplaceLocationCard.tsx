import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Clipboard,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  supportsInteractiveMap,
  WorkplaceMapView,
} from '@/components/shifts/WorkplaceMapView';
import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type Props = {
  locationName: string | null | undefined;
  wardName?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

const MAP_HEIGHT = 200;
const COPIED_FEEDBACK_MS = 1800;
const COPIED_GREEN = '#1E8E5A';
const COPIED_SOFT = 'rgba(30, 142, 90, 0.12)';
const COPIED_BORDER = 'rgba(30, 142, 90, 0.35)';

function parseCoordPair(
  lat: number | null | undefined,
  lng: number | null | undefined,
): { latitude: number; longitude: number } | null {
  if (
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }
  return { latitude: lat, longitude: lng };
}

function formatAddressLines(parts: {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
}): string[] {
  const lines: string[] = [];
  const line1 = parts.addressLine1?.trim();
  const line2 = parts.addressLine2?.trim();
  if (line1) lines.push(line1);
  if (line2) lines.push(line2);

  const cityLine = [parts.postalCode?.trim(), parts.city?.trim()].filter(Boolean).join(' ');
  if (cityLine) lines.push(cityLine);

  const country = parts.countryCode?.trim();
  if (country) lines.push(country.toUpperCase());

  return lines;
}

function buildCopyText(params: {
  locationName?: string | null;
  wardName?: string | null;
  addressLines: string[];
}): string {
  return [params.locationName?.trim(), params.wardName?.trim(), ...params.addressLines]
    .filter(Boolean)
    .join('\n');
}

const SMALL_PLACE_WORDS = new Set(['a', 'and', 'at', 'de', 'for', 'in', 'of', 'on', 'the']);

function isShoutedLabel(value: string): boolean {
  const letters = value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '');
  if (letters.length < 3) return false;
  const upper = letters.replace(/[^A-ZÀ-ÖØ-Þ]/g, '');
  return upper.length / letters.length > 0.85;
}

/** All-caps workplace names read as labels. Title case makes them read as a place. */
function titleCasePlace(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      if (index > 0 && SMALL_PLACE_WORDS.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function presentPlace(raw: string): { name: string; locality: string | null } {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  const formatted = isShoutedLabel(trimmed) ? titleCasePlace(trimmed) : trimmed;
  const match = formatted.match(
    /^(.*?)\s+in\s+([A-Za-zÀ-ÖØ-öø-ÿ][\wÀ-ÖØ-öø-ÿ'.-]*(?:\s+[A-Za-zÀ-ÖØ-öø-ÿ][\wÀ-ÖØ-öø-ÿ'.-]*){0,2})$/,
  );
  if (!match) return { name: formatted, locality: null };
  const name = match[1].trim();
  const locality = match[2].trim();
  if (!name || !locality) return { name: formatted, locality: null };
  return { name, locality };
}

function mapsSearchUrl(query: string): string {
  const q = encodeURIComponent(query);
  if (Platform.OS === 'ios') return `http://maps.apple.com/?q=${q}`;
  if (Platform.OS === 'android') return `geo:0,0?q=${q}`;
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function mapsDirectionsUrl(lat: number, lng: number, label: string): string {
  const name = encodeURIComponent(label || 'Workplace');
  if (Platform.OS === 'ios') {
    return `http://maps.apple.com/?daddr=${lat},${lng}&q=${name}`;
  }
  if (Platform.OS === 'android') {
    return `geo:${lat},${lng}?q=${lat},${lng}(${name})`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/**
 * Premium workplace pin card for shift detail — map when coords exist,
 * address-only directions when not, honest empty otherwise.
 */
export function WorkplaceLocationCard({
  locationName,
  wardName,
  addressLine1,
  addressLine2,
  city,
  postalCode,
  countryCode,
  latitude,
  longitude,
}: Props) {
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyPop = useSharedValue(1);
  const enter = useSharedValue(reduced ? 1 : 0);

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  const copyIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(copyPop.value, [0, 1], [0.4, 1]) }],
    opacity: interpolate(copyPop.value, [0, 1], [0, 1]),
  }));

  const coords = parseCoordPair(latitude, longitude);
  const hasCoords = coords != null;
  const addressLines = useMemo(
    () =>
      formatAddressLines({
        addressLine1,
        addressLine2,
        city,
        postalCode,
        countryCode,
      }),
    [addressLine1, addressLine2, city, postalCode, countryCode],
  );
  const hasAddress = addressLines.length > 0;
  const facility = locationName?.trim() || 'Workplace';
  const place = presentPlace(locationName?.trim() || facility);
  const hasAnyPlace = Boolean(locationName?.trim()) || hasAddress || Boolean(wardName?.trim());

  useEffect(() => {
    if (reduced) {
      enter.value = 1;
      return;
    }
    enter.value = withDelay(
      140,
      withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) }),
    );
  }, [enter, reduced]);

  const shellStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: interpolate(enter.value, [0, 1], [10, 0]) }],
  }));

  const copyText = buildCopyText({
    locationName: facility,
    wardName,
    addressLines,
  });

  const onCopy = async () => {
    if (!copyText) return;
    try {
      Clipboard.setString(copyText);
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setCopied(true);
      copyPop.value = reduced
        ? 1
        : withSequence(
            withTiming(0, { duration: 0 }),
            withSpring(1, { damping: 11, stiffness: 320 }),
          );
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    } catch {
      Alert.alert('Could not copy', 'Please copy the address manually.');
    }
  };

  const onDirections = async () => {
    let url: string | null = null;
    if (coords) {
      url = mapsDirectionsUrl(coords.latitude, coords.longitude, facility);
    } else if (hasAddress || locationName?.trim()) {
      const query = [facility, ...addressLines].filter(Boolean).join(', ');
      url = mapsSearchUrl(query);
    }
    if (!url) return;
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const can = await Linking.canOpenURL(url).catch(() => true);
    if (!can) {
      Alert.alert('Maps unavailable', 'Could not open the maps app on this device.');
      return;
    }
    await Linking.openURL(url);
  };

  if (!hasAnyPlace && !hasCoords) {
    return (
      <Animated.View style={[styles.card, shellStyle]} accessibilityRole="summary">
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(11, 42, 67, 0.05)', 'rgba(20, 169, 181, 0.04)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.wash}
        />
        <View style={styles.header}>
          <LinearGradient
            colors={[colors.navy, '#0C3E56', colors.tealStrong]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerIcon}
          >
            <Ionicons name="location" size={18} color={colors.white} />
          </LinearGradient>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Workplace location</Text>
            <Text style={styles.title}>Not available</Text>
          </View>
        </View>
        <Text style={styles.emptyBody}>Workplace location not available.</Text>
      </Animated.View>
    );
  }

  return (
    <>
      <Animated.View style={[styles.card, shellStyle]} accessibilityRole="summary">
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(20, 169, 181, 0.10)', 'rgba(11, 42, 67, 0.03)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.wash}
        />

        <View style={styles.header}>
          <LinearGradient
            colors={[colors.navy, '#0C3E56', colors.tealStrong]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerIcon}
          >
            <Ionicons name="location" size={18} color={colors.white} />
          </LinearGradient>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Workplace location</Text>
            <Text style={styles.title} numberOfLines={2}>
              {place.name}
            </Text>
            {place.locality ? (
              <View style={styles.locality}>
                <Ionicons name="location-outline" size={13} color={colors.tealStrong} />
                <Text style={styles.localityText} numberOfLines={1}>
                  {place.locality}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {wardName?.trim() ? (
          <View style={styles.wardChip}>
            <Ionicons name="business" size={12} color={colors.tealStrong} />
            <Text style={styles.wardText}>{wardName.trim()}</Text>
          </View>
        ) : null}

        {hasAddress ? (
          <View style={styles.addressBlock}>
            {addressLines.map((line) => (
              <Text key={line} style={styles.addressLine}>
                {line}
              </Text>
            ))}
          </View>
        ) : null}

        {coords ? (
          <View style={styles.mapWrap}>
            <WorkplaceMapView
              latitude={coords.latitude}
              longitude={coords.longitude}
              title={facility}
              interactive={false}
              height={MAP_HEIGHT}
            />
          </View>
        ) : hasAddress ? (
          <View style={styles.pinNote}>
            <Ionicons name="navigate-outline" size={14} color={colors.tealStrong} />
            <Text style={styles.pinNoteText}>
              A precise map pin is unavailable. Directions use the workplace address.
            </Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          {(hasCoords || hasAddress || locationName?.trim()) && (
            <Pressable
              onPress={() => void onDirections()}
              accessibilityRole="button"
              accessibilityLabel="Get directions"
              style={({ pressed }) => [styles.actionPrimary, pressed && styles.actionPressed]}
            >
              <LinearGradient
                colors={[colors.navy, '#0C3E56', colors.tealStrong]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.actionPrimaryFill}
              >
                <Ionicons name="navigate" size={15} color={colors.white} />
                <Text style={styles.actionPrimaryLabel}>Get directions</Text>
              </LinearGradient>
            </Pressable>
          )}

          {copyText ? (
            <Pressable
              onPress={() => void onCopy()}
              accessibilityRole="button"
              accessibilityLabel={copied ? 'Address copied' : 'Copy address'}
              accessibilityState={{ checked: copied }}
              style={({ pressed }) => [
                styles.actionSecondary,
                copied && styles.actionCopied,
                pressed && styles.actionPressed,
              ]}
            >
              {copied ? (
                <Animated.View style={[styles.copiedBadge, copyIconStyle]}>
                  <Ionicons name="checkmark" size={12} color={colors.white} />
                </Animated.View>
              ) : (
                <Ionicons name="copy-outline" size={15} color={colors.navy} />
              )}
              <Text
                style={[styles.actionSecondaryLabel, copied && styles.actionCopiedLabel]}
                accessibilityLiveRegion="polite"
              >
                {copied ? 'Copied' : 'Copy'}
              </Text>
            </Pressable>
          ) : null}

          {coords && supportsInteractiveMap ? (
            <Pressable
              onPress={() => {
                if (Platform.OS !== 'web') {
                  void Haptics.selectionAsync();
                }
                setExpanded(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Expand map"
              style={({ pressed }) => [styles.actionSecondary, pressed && styles.actionPressed]}
            >
              <Ionicons name="expand" size={15} color={colors.navy} />
              <Text style={styles.actionSecondaryLabel}>Expand</Text>
            </Pressable>
          ) : null}
        </View>
      </Animated.View>

      {coords && supportsInteractiveMap ? (
        <Modal
          visible={expanded}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setExpanded(false)}
        >
          <View style={[styles.expandRoot, { paddingTop: insets.top }]}>
            <View style={styles.expandHeader}>
              <View style={styles.expandTitleWrap}>
                <Text style={styles.expandEyebrow}>Workplace</Text>
                <Text style={styles.expandTitle} numberOfLines={2}>
                  {place.name}
                </Text>
                {place.locality ? (
                  <Text style={styles.expandLocality} numberOfLines={1}>
                    {place.locality}
                  </Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => setExpanded(false)}
                accessibilityRole="button"
                accessibilityLabel="Close map"
                hitSlop={12}
                style={styles.expandClose}
              >
                <Ionicons name="close" size={22} color={colors.navy} />
              </Pressable>
            </View>
            <View style={styles.expandMapFill}>
              <WorkplaceMapView
                latitude={coords.latitude}
                longitude={coords.longitude}
                title={facility}
                interactive
                fill
              />
            </View>
            <View style={[styles.expandActions, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <Pressable
                onPress={() => void onDirections()}
                accessibilityRole="button"
                style={({ pressed }) => [styles.actionPrimary, pressed && styles.actionPressed]}
              >
                <LinearGradient
                  colors={[colors.navy, '#0C3E56', colors.tealStrong]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.actionPrimaryFill}
                >
                  <Ionicons name="navigate" size={15} color={colors.white} />
                  <Text style={styles.actionPrimaryLabel}>Get directions</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  wash: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontFamily: typography.fonts.semibold,
    fontSize: 11,
    color: colors.tealStrong,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    fontFamily: typography.fonts.display,
    fontSize: typography.size.xxl,
    color: colors.navy,
    lineHeight: typography.lineHeight.xxl,
    letterSpacing: -0.45,
  },
  locality: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  localityText: {
    flexShrink: 1,
    fontFamily: typography.fonts.medium,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 0.15,
    color: colors.tealStrong,
  },
  wardChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.tealSoft,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: spacing.sm,
  },
  wardText: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.xs,
    color: colors.navy,
  },
  addressBlock: {
    marginBottom: spacing.md,
    gap: 2,
  },
  addressLine: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.sm,
  },
  mapWrap: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  pinNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.tealSoft,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  pinNoteText: {
    flex: 1,
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.xs,
    color: colors.navy,
    lineHeight: typography.lineHeight.sm,
  },
  emptyBody: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
  },
  actionPrimary: {
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  actionPrimaryFill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionPrimaryLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.sm,
    color: colors.white,
  },
  actionSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceSubdued,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  actionSecondaryLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.sm,
    color: colors.navy,
  },
  actionPressed: {
    opacity: 0.86,
  },
  actionCopied: {
    backgroundColor: COPIED_SOFT,
    borderColor: COPIED_BORDER,
  },
  actionCopiedLabel: {
    color: COPIED_GREEN,
  },
  copiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COPIED_GREEN,
  },
  expandRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  expandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  expandTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  expandEyebrow: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.xs,
    color: colors.tealStrong,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  expandTitle: {
    fontFamily: typography.fonts.display,
    fontSize: typography.size.xxl,
    lineHeight: typography.lineHeight.xxl,
    letterSpacing: -0.4,
    color: colors.navy,
  },
  expandLocality: {
    fontFamily: typography.fonts.medium,
    fontSize: 14,
    lineHeight: 18,
    color: colors.tealStrong,
    marginTop: 2,
  },
  expandClose: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSubdued,
  },
  expandMapFill: {
    flex: 1,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSubdued,
    ...shadows.md,
  },
  expandActions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});
