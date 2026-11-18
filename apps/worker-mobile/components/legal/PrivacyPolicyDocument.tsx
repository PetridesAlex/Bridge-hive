import {
  POLICY_ARTICLES,
  POLICY_HEADER,
  PRIVACY_POLICY_LAST_UPDATED,
  PRIVACY_POLICY_TAX_ID,
  PRIVACY_POLICY_VERSION_LABEL,
  privacyPolicyIsFinal,
  taxIdLine,
  type PolicyArticle,
  type PolicyBlock,
} from '@bridge-hive/legal-content';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { openExternalUrl, privacyPolicyOnlineUrl } from '@/lib/legal-urls';

type Labels = {
  legalDocument: string;
  onThisPage: string;
  tocSubtitle: string;
  dataController: string;
  metaVersion: string;
  metaUpdated: string;
  metaTaxId: string;
  viewOnline: string;
  offlineNote: string;
  greekNote: string;
  statusFinal: string;
  linkFailed: string;
  backToTop: string;
};

/** Presentation-only: strip redundant label prefixes already shown in UI chrome. */
function stripMetaPrefix(value: string, prefixes: string[]): string {
  for (const prefix of prefixes) {
    if (value.toLowerCase().startsWith(prefix.toLowerCase())) {
      return value.slice(prefix.length).trim();
    }
  }
  return value;
}

function articleNumber(title: string): string {
  const match = title.match(/^Article\s+(\d+)/i);
  return match?.[1] ?? '';
}

function articleHeading(title: string): string {
  return title.replace(/^Article\s+\d+\s+[—–-]\s*/i, '') || title;
}

function PolicyMasthead({
  labels,
  showFinal,
}: {
  labels: Labels;
  showFinal: boolean;
}) {
  const reduced = useReducedMotion();
  const sheen = useSharedValue(reduced ? 0.35 : 0);
  const enter = !reduced && Platform.OS !== 'web' ? FadeInDown.duration(420).springify().damping(18) : undefined;

  const versionValue = stripMetaPrefix(PRIVACY_POLICY_VERSION_LABEL, ['Version:']);
  const updatedValue = stripMetaPrefix(PRIVACY_POLICY_LAST_UPDATED, ['Last Updated:']);

  useEffect(() => {
    if (reduced) {
      sheen.value = 0.35;
      return;
    }
    sheen.value = withDelay(
      200,
      withRepeat(
        withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
  }, [reduced, sheen]);

  const sheenStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sheen.value, [0, 1], [0.08, 0.22]),
    transform: [{ translateX: interpolate(sheen.value, [0, 1], [-40, 80]) }],
  }));

  return (
    <Animated.View entering={enter} style={styles.masthead}>
      <LinearGradient
        colors={['#04121F', '#0B2A43', '#0E4A5C', '#123A5C']}
        locations={[0, 0.38, 0.78, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(224,170,24,0.22)', 'rgba(20,169,181,0.10)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.mastheadGlow}
      />
      <View pointerEvents="none" style={styles.mastheadOrbA} />
      <View pointerEvents="none" style={styles.mastheadOrbB} />
      <Animated.View pointerEvents="none" style={[styles.mastheadSheen, sheenStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.18)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      <View style={styles.mastheadTop}>
        <View style={styles.mark}>
          <LinearGradient
            colors={[colors.white, '#F3FAFC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <Ionicons name="shield-checkmark" size={18} color={colors.navy} />
        </View>
        <View style={styles.mastheadTopCopy}>
          <Text style={styles.mastheadKicker}>{labels.legalDocument}</Text>
          {showFinal ? (
            <View style={styles.finalChip} accessibilityLabel={labels.statusFinal}>
              <View style={styles.finalDot} />
              <Text style={styles.finalChipText}>{labels.statusFinal}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <Text style={styles.companyLabel}>{POLICY_HEADER.company}</Text>
      <Text style={styles.brandTitle}>{POLICY_HEADER.subtitle}</Text>

      <View style={styles.metaTiles}>
        <View style={styles.metaTile}>
          <Text style={styles.metaKey}>{labels.metaVersion}</Text>
          <Text style={styles.metaValue} numberOfLines={2}>
            {versionValue}
          </Text>
        </View>
        <View style={styles.metaTileDivider} />
        <View style={styles.metaTile}>
          <Text style={styles.metaKey}>{labels.metaUpdated}</Text>
          <Text style={styles.metaValue} numberOfLines={2}>
            {updatedValue}
          </Text>
        </View>
      </View>

      <View style={styles.taxStrip}>
        <View style={styles.taxStripIcon}>
          <Ionicons name="business-outline" size={14} color={colors.tealStrong} />
        </View>
        <View style={styles.taxStripCopy}>
          <Text style={styles.metaKey}>{labels.metaTaxId}</Text>
          <Text style={styles.taxValue} selectable>
            {PRIVACY_POLICY_TAX_ID}
          </Text>
        </View>
      </View>

      <View style={styles.mastheadRuleRow}>
        <View style={styles.mastheadRule} />
        <View style={styles.mastheadRuleSoft} />
      </View>
    </Animated.View>
  );
}

function BlockView({
  block,
  onOpenUrl,
}: {
  block: PolicyBlock;
  onOpenUrl: (url: string) => void;
}) {
  if (typeof block === 'string') {
    return <LinkedParagraph text={block} onOpenUrl={onOpenUrl} style={styles.paragraph} />;
  }
  if (block.kind === 'h3') {
    return (
      <Text accessibilityRole="header" style={styles.h3}>
        {block.text}
      </Text>
    );
  }
  if (block.kind === 'ul' || block.kind === 'ol') {
    return (
      <View style={styles.list}>
        {block.items.map((item, index) => (
          <View key={`${block.kind}-${index}`} style={styles.listItem}>
            <Text style={styles.listBullet} accessibilityElementsHidden>
              {block.kind === 'ol' ? `${index + 1}.` : '•'}
            </Text>
            <LinkedParagraph
              text={item}
              onOpenUrl={onOpenUrl}
              style={styles.listText}
            />
          </View>
        ))}
      </View>
    );
  }

  const lines = [...block.lines];
  if (block.withTaxId === 'after-registration') {
    const regIdx = lines.findIndex((line) =>
      line.toLowerCase().includes('registration number'),
    );
    const insertAt = regIdx >= 0 ? regIdx + 1 : lines.length;
    lines.splice(insertAt, 0, taxIdLine('en'));
  }

  return (
    <View style={styles.linesBox}>
      {lines.map((line) => (
        <LinkedParagraph
          key={line}
          text={line}
          onOpenUrl={onOpenUrl}
          style={styles.lineText}
        />
      ))}
    </View>
  );
}

const URL_RE = /(https?:\/\/[^\s)]+|mailto:[^\s)]+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi;

function LinkedParagraph({
  text,
  onOpenUrl,
  style,
}: {
  text: string;
  onOpenUrl: (url: string) => void;
  style?: object;
}) {
  const parts = useMemo(() => {
    const out: { text: string; href?: string }[] = [];
    let last = 0;
    const re = new RegExp(URL_RE.source, 'gi');
    let match: RegExpExecArray | null;
    while ((match = re.exec(text))) {
      if (match.index > last) {
        out.push({ text: text.slice(last, match.index) });
      }
      const raw = match[0];
      const href = raw.includes('@') && !raw.startsWith('mailto:')
        ? `mailto:${raw}`
        : raw;
      out.push({ text: raw, href });
      last = match.index + raw.length;
    }
    if (last < text.length) out.push({ text: text.slice(last) });
    return out.length ? out : [{ text }];
  }, [text]);

  return (
    <Text selectable style={style}>
      {parts.map((part, index) =>
        part.href ? (
          <Text
            key={`${index}-${part.text}`}
            accessibilityRole="link"
            style={styles.link}
            onPress={() => onOpenUrl(part.href!)}
          >
            {part.text}
          </Text>
        ) : (
          <Text key={`${index}-${part.text}`}>{part.text}</Text>
        ),
      )}
    </Text>
  );
}

function ArticleSection({
  article,
  onLayout,
  onOpenUrl,
}: {
  article: PolicyArticle;
  onLayout: (id: string, y: number) => void;
  onOpenUrl: (url: string) => void;
}) {
  const number = articleNumber(article.title);

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => onLayout(article.id, e.nativeEvent.layout.y)}
      style={styles.articleCard}
    >
      <View style={styles.articleAccent} />
      <View style={styles.articleInner}>
        <View style={styles.articleHeading}>
          {number ? (
            <View style={styles.articleNumBadge}>
              <Text style={styles.articleNum}>{number.padStart(2, '0')}</Text>
            </View>
          ) : null}
          <Text accessibilityRole="header" style={styles.articleTitle}>
            {articleHeading(article.title)}
          </Text>
        </View>
        <View style={styles.articleBody}>
          {article.blocks.map((block, index) => (
            <BlockView key={`${article.id}-${index}`} block={block} onOpenUrl={onOpenUrl} />
          ))}
        </View>
      </View>
    </View>
  );
}

export function PrivacyPolicyDocument({
  labels,
  showGreekNote,
}: {
  labels: Labels;
  showGreekNote: boolean;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Record<string, number>>({});
  const [showTop, setShowTop] = useState(false);
  const showFinal = privacyPolicyIsFinal();

  const openUrl = useCallback(
    (url: string) => {
      void openExternalUrl(url, labels.linkFailed);
    },
    [labels.linkFailed],
  );

  const onArticleLayout = useCallback((id: string, y: number) => {
    offsets.current[id] = y;
  }, []);

  const jumpTo = useCallback((id: string) => {
    const y = offsets.current[id];
    if (typeof y !== 'number') return;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
  }, []);

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        onScroll={(e) => setShowTop(e.nativeEvent.contentOffset.y > 420)}
        scrollEventThrottle={64}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <PolicyMasthead labels={labels} showFinal={showFinal} />

        {showGreekNote ? (
          <View style={styles.noticeBar} accessibilityRole="text">
            <Ionicons name="language-outline" size={15} color={colors.navy} />
            <Text style={styles.noticeText}>{labels.greekNote}</Text>
          </View>
        ) : null}

        <View style={styles.noticeBar}>
          <Ionicons name="cloud-offline-outline" size={15} color={colors.navy} />
          <View style={styles.noticeCopy}>
            <Text style={styles.noticeText}>{labels.offlineNote}</Text>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={labels.viewOnline}
              onPress={() => openUrl(privacyPolicyOnlineUrl())}
              style={styles.onlineLink}
              hitSlop={6}
            >
              <Text style={styles.onlineLinkText}>{labels.viewOnline}</Text>
              <Ionicons name="open-outline" size={13} color={colors.navy} />
            </Pressable>
          </View>
        </View>

        {POLICY_ARTICLES.length > 4 ? (
          <View style={styles.toc}>
            <View style={styles.tocHeader}>
              <View>
                <Text accessibilityRole="header" style={styles.tocTitle}>
                  {labels.onThisPage}
                </Text>
                <Text style={styles.tocSubtitle}>{labels.tocSubtitle}</Text>
              </View>
              <View style={styles.tocCountPill}>
                <Text style={styles.tocCount}>{POLICY_ARTICLES.length}</Text>
              </View>
            </View>
            {POLICY_ARTICLES.map((article, index) => {
              const number = articleNumber(article.title);
              return (
                <Pressable
                  key={article.id}
                  accessibilityRole="button"
                  accessibilityLabel={article.title}
                  onPress={() => jumpTo(article.id)}
                  style={[
                    styles.tocItem,
                    index === POLICY_ARTICLES.length - 1 && styles.tocItemLast,
                  ]}
                >
                  <Text style={styles.tocNum}>
                    {(number || String(index + 1)).padStart(2, '0')}
                  </Text>
                  <Text style={styles.tocItemText} numberOfLines={2}>
                    {articleHeading(article.title)}
                  </Text>
                  <View style={styles.tocChevron}>
                    <Ionicons name="chevron-forward" size={13} color={colors.navy} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View style={styles.identityCard}>
          <Text style={styles.identityLabel}>{labels.dataController}</Text>
          {POLICY_HEADER.linesBeforeTaxId.map((line) => (
            <LinkedParagraph
              key={line}
              text={line}
              onOpenUrl={openUrl}
              style={styles.headerLine}
            />
          ))}
          <Text selectable style={styles.headerLine}>
            {taxIdLine('en')}
          </Text>
          {POLICY_HEADER.linesAfterTaxId.map((line) => (
            <Text key={line} selectable style={styles.headerLine}>
              {line}
            </Text>
          ))}
        </View>

        <View style={styles.articles}>
          {POLICY_ARTICLES.map((article) => (
            <ArticleSection
              key={article.id}
              article={article}
              onLayout={onArticleLayout}
              onOpenUrl={openUrl}
            />
          ))}
        </View>

        <View style={styles.endBlock}>
          <View style={styles.endRule} />
          <Text style={styles.endMark}>{POLICY_HEADER.end}</Text>
          <Text style={styles.endVersion}>{POLICY_HEADER.endVersion}</Text>
        </View>
      </ScrollView>

      {showTop ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={labels.backToTop}
          onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
          style={styles.backToTop}
        >
          <Ionicons name="chevron-up" size={16} color={colors.white} />
          <Text style={styles.backToTopText}>{labels.backToTop}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl + 36,
    gap: spacing.md,
  },
  masthead: {
    borderRadius: 24,
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg + 4,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    ...shadows.md,
  },
  mastheadGlow: {
    position: 'absolute',
    top: -48,
    left: -28,
    width: 260,
    height: 200,
  },
  mastheadOrbA: {
    position: 'absolute',
    right: -36,
    top: -28,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(20, 169, 181, 0.14)',
  },
  mastheadOrbB: {
    position: 'absolute',
    right: 48,
    bottom: -50,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(224, 170, 24, 0.10)',
  },
  mastheadSheen: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 90,
  },
  mastheadTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 2,
  },
  mastheadTopCopy: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  mark: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...shadows.sm,
  },
  mastheadKicker: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontFamily: typography.fonts.bold,
  },
  companyLabel: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 10,
    lineHeight: 14,
    fontFamily: typography.fonts.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  brandTitle: {
    color: colors.white,
    fontSize: 25,
    lineHeight: 31,
    fontFamily: typography.fonts.display,
    letterSpacing: -0.5,
    maxWidth: 460,
    marginTop: 2,
  },
  finalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(20, 169, 181, 0.45)',
    backgroundColor: 'rgba(20, 169, 181, 0.14)',
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  finalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.tealStrong,
  },
  finalChipText: {
    color: 'rgba(184, 236, 240, 0.95)',
    fontSize: 10,
    fontFamily: typography.fonts.bold,
    letterSpacing: 0.55,
    textTransform: 'uppercase',
  },
  metaTiles: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  metaTile: {
    flex: 1,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  metaTileDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  metaKey: {
    color: 'rgba(255,255,255,0.48)',
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    fontFamily: typography.fonts.bold,
  },
  metaValue: {
    color: 'rgba(255,255,255,0.94)',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typography.fonts.semibold,
    letterSpacing: -0.1,
  },
  taxStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  taxStripIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 169, 181, 0.18)',
  },
  taxStripCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  taxValue: {
    color: 'rgba(255,255,255,0.94)',
    fontSize: 12,
    lineHeight: 17,
    fontFamily: typography.fonts.medium,
  },
  mastheadRuleRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mastheadRule: {
    height: 2,
    width: 36,
    borderRadius: 1,
    backgroundColor: colors.yellow,
  },
  mastheadRuleSoft: {
    height: 2,
    flex: 1,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  noticeBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.08)',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  noticeCopy: {
    flex: 1,
    gap: 6,
  },
  noticeText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: typography.fonts.regular,
  },
  onlineLink: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 28,
  },
  onlineLinkText: {
    color: colors.navy,
    fontSize: 13,
    fontFamily: typography.fonts.semibold,
    letterSpacing: -0.1,
  },
  toc: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.08)',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    ...shadows.sm,
  },
  tocHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.md,
    marginBottom: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(11, 42, 67, 0.08)',
  },
  tocTitle: {
    color: colors.navy,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: typography.fonts.bold,
  },
  tocSubtitle: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: typography.fonts.regular,
  },
  tocCountPill: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    backgroundColor: colors.navy,
  },
  tocCount: {
    color: colors.white,
    fontSize: 12,
    fontFamily: typography.fonts.bold,
  },
  tocItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 46,
    paddingVertical: 11,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(11, 42, 67, 0.07)',
  },
  tocItemLast: {
    borderBottomWidth: 0,
  },
  tocNum: {
    width: 28,
    color: colors.tealStrong,
    fontSize: 12,
    fontFamily: typography.fonts.bold,
    letterSpacing: 0.3,
  },
  tocItemText: {
    flex: 1,
    color: colors.navy,
    fontSize: 14,
    lineHeight: 19,
    fontFamily: typography.fonts.medium,
    letterSpacing: -0.15,
  },
  tocChevron: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11, 42, 67, 0.05)',
  },
  identityCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.08)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: 4,
    ...shadows.sm,
  },
  identityLabel: {
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    fontFamily: typography.fonts.bold,
    marginBottom: 6,
  },
  headerLine: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: typography.fonts.regular,
  },
  articles: {
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  articleCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.07)',
    ...shadows.sm,
  },
  articleAccent: {
    width: 3,
    backgroundColor: colors.navy,
  },
  articleInner: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  articleHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  articleNumBadge: {
    marginTop: 1,
    minWidth: 34,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
    backgroundColor: 'rgba(20, 169, 181, 0.12)',
  },
  articleNum: {
    color: colors.tealStrong,
    fontSize: 11,
    fontFamily: typography.fonts.bold,
    letterSpacing: 0.5,
  },
  articleTitle: {
    flex: 1,
    color: colors.navy,
    fontSize: 17,
    lineHeight: 23,
    fontFamily: typography.fonts.displaySemibold,
    letterSpacing: -0.3,
  },
  articleBody: {
    gap: spacing.sm,
    paddingLeft: 46,
  },
  paragraph: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 25,
    fontFamily: typography.fonts.regular,
  },
  h3: {
    marginTop: spacing.xs,
    color: colors.navy,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: typography.fonts.semibold,
    letterSpacing: -0.1,
  },
  list: { gap: 8, marginTop: 2 },
  listItem: { flexDirection: 'row', gap: 8, paddingRight: 4 },
  listBullet: {
    width: 18,
    color: colors.navy,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: typography.fonts.semibold,
  },
  listText: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    lineHeight: 23,
    fontFamily: typography.fonts.regular,
  },
  linesBox: {
    backgroundColor: colors.surfaceSubdued,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.06)',
    padding: spacing.md,
    gap: 4,
  },
  lineText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: typography.fonts.regular,
  },
  link: {
    color: colors.navy,
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(11, 42, 67, 0.28)',
  },
  endBlock: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
    gap: 6,
  },
  endRule: {
    width: 48,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.yellow,
    marginBottom: 8,
  },
  endMark: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 1.4,
    fontFamily: typography.fonts.bold,
  },
  endVersion: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: typography.fonts.medium,
  },
  backToTop: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.navy,
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...shadows.md,
  },
  backToTopText: {
    color: colors.white,
    fontSize: 12,
    fontFamily: typography.fonts.semibold,
  },
});
