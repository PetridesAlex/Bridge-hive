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

import { HiveFlowBackground } from '@/components/brand/HiveFlowBackground';
import { ScreenEnter } from '@/components/ui/ScreenEnter';
import { spacing } from '@/constants/theme';
import { type ContentKind, useLayout } from '@/hooks/useLayout';

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
  /** Column max-width preset for Expo web / tablet. */
  contentKind?: ContentKind;
  /** Skip first-mount enter animation. */
  disableEnter?: boolean;
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
  contentKind = 'list',
  disableEnter = false,
}: Props) {
  const { gutter, contentMaxWidth } = useLayout(contentKind);

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

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, columnStyle, padStyle, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, columnStyle, padStyle, contentStyle]}>{children}</View>
  );

  return (
    <View style={styles.root}>
      <HiveFlowBackground />
      <SafeAreaView style={[styles.safe, style]} edges={edges}>
        {disableEnter ? body : <ScreenEnter>{body}</ScreenEnter>}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  fill: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.huge,
    flexGrow: 1,
  },
});
