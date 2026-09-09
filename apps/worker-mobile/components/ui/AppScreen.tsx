import React from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/constants/theme';
import { useLayout } from '@/hooks/useLayout';

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
  refreshControl?: ScrollViewProps['refreshControl'];
  /** Full-bleed children (headers) can opt out of the centered column. */
  fullBleed?: boolean;
};

export function AppScreen({
  children,
  scroll = true,
  padded = true,
  style,
  contentStyle,
  edges = ['top'],
  refreshControl,
  fullBleed = false,
}: Props) {
  const { gutter, contentMaxWidth } = useLayout();

  const columnStyle: StyleProp<ViewStyle> = fullBleed
    ? undefined
    : {
        width: '100%',
        maxWidth: contentMaxWidth,
        alignSelf: 'center',
      };

  const padStyle: StyleProp<ViewStyle> = padded
    ? { paddingHorizontal: gutter }
    : undefined;

  if (scroll) {
    return (
      <SafeAreaView style={[styles.safe, style]} edges={edges}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, columnStyle, padStyle, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, style]} edges={edges}>
      <View style={[styles.fill, columnStyle, padStyle, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fill: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.huge,
    flexGrow: 1,
  },
});
