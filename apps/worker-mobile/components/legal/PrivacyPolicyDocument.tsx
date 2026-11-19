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

function parseLabeledLine(line: string): { label: string; value: string } {
  const idx = line.indexOf(':');
  if (idx <= 0) return { label: '', value: line.trim() };
  return {
    label: line.slice(0, idx).trim(),
    value: line.slice(idx + 1).trim(),
  };
}

function identityIcon(label: string): keyof typeof Ionicons.glyphMap {
  const key = label.toLowerCase();
  if (key.includes('website')) return 'globe-outline';
  if (key.includes('email') || key.includes('contact')) return 'mail-outline';
  if (key.includes('registration')) return 'document-text-outline';
  if (key.includes('tax') || key.includes('tin') || key.includes('αφτ')) {
    return 'business-outline';
  }
  if (key.includes('office') || key.includes('address') || key.includes('registered')) {
    return 'location-outline';
  }
  return 'ellipse-outline';
}

function identityHref(label: string, value: string): string | undefined {
  const key = label.toLowerCase();
  if (key.includes('website') && /^https?:\/\//i.test(value)) return value;
  if ((key.includes('email') || key.includes('contact')) && value.includes('@')) {
    return value.startsWith('mailto:') ? value : `mailto:${value}`;
  }
  return undefined;
}

/** Slim offline / online freshness rail under the masthead. */
function OnlineFreshnessRail({
  note,
  actionLabel,
  onOpen,
}: {
  note: string;
  actionLabel: string;
  onOpen: () => void;
}) {
  const reduced = useReducedMotion();
  const breath = useSharedValue(reduced ? 1 : 0);
  const press = useSharedValue(0);
  const enter =
    !reduced && Platform.OS !== 'web'
      ? FadeInDown.duration(380).delay(80).springify().damping(18)
      : undefined;

  useEffect(() => {
    if (reduced) {
      breath.value = 1;
      return;
    }
    breath.value = withDelay(
      280,
      withRepeat(
        withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
  }, [breath, reduced]);

  const accentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(breath.value, [0, 1], [0.45, 1]),
    transform: [{ scaleY: interpolate(breath.value, [0, 1], [0.72, 1]) }],
  }));

  const sheenStyle = useAnimatedStyle(() => ({
    opacity: interpolate(breath.value, [0, 1], [0.04, 0.14]),
    transform: [{ translateX: interpolate(breath.value, [0, 1], [-28, 56]) }],
  }));

  const actionStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(press.value, [0, 1], [1, 0.98]) }],
  }));

  return (
    <Animated.View entering={enter} style={styles.freshnessRail}>
      <Animated.View style={[styles.freshnessAccent, accentStyle]} />
      <View style={styles.freshnessBody}>
        <Animated.View pointerEvents="none" style={[styles.freshnessSheen, sheenStyle]}>
          <LinearGradient
            colors={['transparent', 'rgba(20,169,181,0.18)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>
        <Text style={styles.freshnessNote}>{note}</Text>
        <Animated.View style={actionStyle}>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={actionLabel}
            onPress={onOpen}
            onPressIn={() => {
              press.value = withTiming(1, { duration: 90 });
            }}
            onPressOut={() => {
              press.value = withTiming(0, { duration: 140 });
            }}
            style={({ pressed }) => [
              styles.freshnessAction,
              pressed && styles.freshnessActionPressed,
            ]}
            hitSlop={8}
          >
            <Text style={styles.freshnessActionText}>{actionLabel}</Text>
            <Ionicons name="arrow-forward" size={13} color={colors.tealStrong} />
          </Pressable>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

/** Premium identity panel for the legal data controller block. */
function DataControllerCard({
  title,
  company,
  lines,
  onOpenUrl,
}: {
  title: string;
  company: string;
  lines: string[];
  onOpenUrl: (url: string) => void;
}) {
  const reduced = useReducedMotion();
  const breath = useSharedValue(reduced ? 1 : 0);
  const enter =
    !reduced && Platform.OS !== 'web'
      ? FadeInDown.duration(400).delay(120).springify().damping(18)
      : undefined;

  const rows = useMemo(
    () =>
      lines.map((line) => {
        const parsed = parseLabeledLine(line);
        return {
          key: line,
          ...parsed,
          icon: identityIcon(parsed.label),
          href: identityHref(parsed.label, parsed.value),
        };
      }),
    [lines],
  );

  useEffect(() => {
    if (reduced) {
      breath.value = 1;
      return;
    }
    breath.value = withDelay(
      360,
      withRepeat(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
  }, [breath, reduced]);

  const accentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(breath.value, [0, 1], [0.5, 1]),
    transform: [{ scaleY: interpolate(breath.value, [0, 1], [0.78, 1]) }],
  }));

  const sheenStyle = useAnimatedStyle(() => ({
    opacity: interpolate(breath.value, [0, 1], [0.03, 0.12]),
    transform: [{ translateX: interpolate(breath.value, [0, 1], [-36, 72]) }],
  }));

  return (
    <Animated.View entering={enter} style={styles.identityCard}>
      <Animated.View style={[styles.identityAccent, accentStyle]} />
      <View style={styles.identityBody}>
        <Animated.View pointerEvents="none" style={[styles.identitySheen, sheenStyle]}>
          <LinearGradient
            colors={['transparent', 'rgba(20,169,181,0.14)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>

        <View style={styles.identityHeader}>
          <View style={styles.identityMark}>
            <Ionicons name="business" size={15} color={colors.navy} />
          </View>
          <View style={styles.identityHeaderCopy}>
            <Text style={styles.identityLabel}>{title}</Text>
            <Text selectable style={styles.identityCompany}>
              {company}
            </Text>
          </View>
        </View>

        <View style={styles.identityRows}>
          {rows.map((row) => {
            const content = (
              <>
                <View style={styles.identityIconWell}>
                  <Ionicons name={row.icon} size={14} color={colors.tealStrong} />
                </View>
                <View style={styles.identityRowCopy}>
                  {row.label ? (
                    <Text style={styles.identityRowLabel}>{row.label}</Text>
                  ) : null}
                  <Text
                    selectable={!row.href}
                    style={[
                      styles.identityRowValue,
                      row.href ? styles.identityRowValueLink : null,
                    ]}
                  >
                    {row.value}
                  </Text>
                </View>
                {row.href ? (
                  <View style={styles.identityRowChevron}>
                    <Ionicons name="arrow-forward" size={12} color={colors.tealStrong} />
                  </View>
                ) : null}
              </>
            );

            if (row.href) {
              return (
                <Pressable
                  key={row.key}
                  accessibilityRole="link"
                  accessibilityLabel={`${row.label}: ${row.value}`}
                  onPress={() => onOpenUrl(row.href!)}
                  style={({ pressed }) => [
                    styles.identityRow,
                    pressed && styles.identityRowPressed,
                  ]}
                >
                  {content}
                </Pressable>
              );
            }

            return (
              <View
                key={row.key}
                accessibilityRole="text"
                accessibilityLabel={`${row.label}: ${row.value}`}
                style={styles.identityRow}
              >
                {content}
              </View>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
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
  bindRef,
}: {
  article: PolicyArticle;
  onLayout: (id: string, y: number) => void;
  onOpenUrl: (url: string) => void;
  bindRef: (id: string, node: View | null) => void;
}) {
  const number = articleNumber(article.title);

  return (
    <View
      ref={(node) => bindRef(article.id, node)}
      nativeID={`privacy-article-${article.id}`}
      collapsable={false}
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

const TOC_SCROLL_PAD = 20;
const TOC_SCROLL_MS = 480;

function asDomElement(node: unknown): HTMLElement | null {
  if (!node || typeof node !== 'object') return null;
  if (typeof (node as HTMLElement).getBoundingClientRect === 'function') {
    return node as HTMLElement;
  }
  const host = (node as { _nativeTag?: unknown; getNode?: () => unknown }).getNode?.();
  if (host && typeof (host as HTMLElement).getBoundingClientRect === 'function') {
    return host as HTMLElement;
  }
  return null;
}

function findScrollParent(node: HTMLElement | null): HTMLElement | null {
  let current = node?.parentElement ?? null;
  while (current) {
    const style = globalThis.getComputedStyle?.(current);
    const overflowY = style?.overflowY ?? '';
    if (
      current.scrollHeight > current.clientHeight + 24 &&
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay')
    ) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

function animateScrollTop(el: HTMLElement, to: number, duration = TOC_SCROLL_MS) {
  const from = el.scrollTop;
  const delta = to - from;
  if (Math.abs(delta) < 1) {
    el.scrollTop = to;
    return;
  }
  const start = performance.now();
  const ease = (t: number) => 1 - (1 - t) ** 3;
  const step = (now: number) => {
    const progress = Math.min(1, (now - start) / duration);
    el.scrollTop = from + delta * ease(progress);
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function PrivacyPolicyDocument({
  labels,
  showGreekNote,
}: {
  labels: Labels;
  showGreekNote: boolean;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const articleNodes = useRef<Record<string, View | null>>({});
  const articleLocalY = useRef<Record<string, number>>({});
  const articlesOriginY = useRef(0);
  const scrollY = useRef(0);
  const activeClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showTop, setShowTop] = useState(false);
  const [activeTocId, setActiveTocId] = useState<string | null>(null);
  const showFinal = privacyPolicyIsFinal();

  const openUrl = useCallback(
    (url: string) => {
      void openExternalUrl(url, labels.linkFailed);
    },
    [labels.linkFailed],
  );

  const bindArticleRef = useCallback((id: string, node: View | null) => {
    articleNodes.current[id] = node;
  }, []);

  const onArticleLayout = useCallback((id: string, y: number) => {
    articleLocalY.current[id] = y;
  }, []);

  const getScrollElement = useCallback((): HTMLElement | null => {
    if (Platform.OS !== 'web') return null;

    // Prefer the actual overflow parent of an article — RNW getScrollableNode can
    // point at a wrapper that ignores scrollTop writes.
    for (const node of Object.values(articleNodes.current)) {
      const parent = findScrollParent(asDomElement(node));
      if (parent) return parent;
    }

    const fromRef = scrollRef.current as unknown as {
      getScrollableNode?: () => HTMLElement | null;
    } | null;
    return fromRef?.getScrollableNode?.() ?? null;
  }, []);

  const scrollToY = useCallback(
    (y: number, scrollEl?: HTMLElement | null) => {
      const target = Math.max(0, y);
      scrollY.current = target;
      setShowTop(target > 420);

      const webEl = scrollEl ?? getScrollElement();
      if (webEl) {
        animateScrollTop(webEl, target);
        return;
      }

      scrollRef.current?.scrollTo({ y: target, animated: true });
    },
    [getScrollElement],
  );

  const markActiveToc = useCallback((id: string) => {
    setActiveTocId(id);
    if (activeClearRef.current) clearTimeout(activeClearRef.current);
    activeClearRef.current = setTimeout(() => setActiveTocId(null), 1600);
  }, []);

  useEffect(
    () => () => {
      if (activeClearRef.current) clearTimeout(activeClearRef.current);
    },
    [],
  );

  const jumpTo = useCallback(
    (id: string) => {
      markActiveToc(id);

      const fromLayout = () => {
        const local = articleLocalY.current[id];
        if (typeof local !== 'number') return false;
        scrollToY(articlesOriginY.current + local - TOC_SCROLL_PAD);
        return true;
      };

      const article = articleNodes.current[id];
      const artEl = asDomElement(article);

      if (Platform.OS === 'web') {
        // nativeID is the most reliable DOM hook under RNW.
        const byId =
          globalThis.document?.getElementById(`privacy-article-${id}`) ?? artEl;
        const webScroll = findScrollParent(byId) ?? getScrollElement();
        if (byId && webScroll) {
          const target =
            webScroll.scrollTop +
            (byId.getBoundingClientRect().top - webScroll.getBoundingClientRect().top) -
            TOC_SCROLL_PAD;
          scrollToY(target, webScroll);
          return;
        }
      }

      if (article && typeof article.measureInWindow === 'function') {
        article.measureInWindow((_ax, ay) => {
          if (typeof ay !== 'number' || !Number.isFinite(ay)) {
            fromLayout();
            return;
          }
          const scrollNode = scrollRef.current as
            | (ScrollView & {
                measureInWindow?: (
                  callback: (x: number, y: number, width: number, height: number) => void,
                ) => void;
              })
            | null;
          scrollNode?.measureInWindow?.((_sx: number, sy: number) => {
            if (typeof sy !== 'number') {
              fromLayout();
              return;
            }
            scrollToY(scrollY.current + (ay - sy) - TOC_SCROLL_PAD);
          });
        });
        return;
      }

      fromLayout();
    },
    [getScrollElement, markActiveToc, scrollToY],
  );

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollOuter}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          scrollY.current = y;
          setShowTop(y > 420);
        }}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View collapsable={false} style={styles.scrollContent}>
          <PolicyMasthead labels={labels} showFinal={showFinal} />

          {showGreekNote ? (
            <View style={styles.noticeBar} accessibilityRole="text">
              <Ionicons name="language-outline" size={15} color={colors.navy} />
              <Text style={styles.noticeText}>{labels.greekNote}</Text>
            </View>
          ) : null}

          <OnlineFreshnessRail
            note={labels.offlineNote}
            actionLabel={labels.viewOnline}
            onOpen={() => openUrl(privacyPolicyOnlineUrl())}
          />

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
                const active = activeTocId === article.id;
                return (
                  <Pressable
                    key={article.id}
                    accessibilityRole="button"
                    accessibilityLabel={article.title}
                    accessibilityState={{ selected: active }}
                    onPress={() => jumpTo(article.id)}
                    style={({ pressed }) => [
                      styles.tocItem,
                      index === POLICY_ARTICLES.length - 1 && styles.tocItemLast,
                      active && styles.tocItemActive,
                      pressed && styles.tocItemPressed,
                    ]}
                  >
                    <Text style={[styles.tocNum, active && styles.tocNumActive]}>
                      {(number || String(index + 1)).padStart(2, '0')}
                    </Text>
                    <Text
                      style={[styles.tocItemText, active && styles.tocItemTextActive]}
                      numberOfLines={2}
                    >
                      {articleHeading(article.title)}
                    </Text>
                    <View style={[styles.tocChevron, active && styles.tocChevronActive]}>
                      <Ionicons
                        name={active ? 'arrow-down' : 'chevron-forward'}
                        size={13}
                        color={active ? colors.tealStrong : colors.navy}
                      />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <DataControllerCard
            title={labels.dataController}
            company={POLICY_HEADER.company}
            lines={[
              ...POLICY_HEADER.linesBeforeTaxId,
              taxIdLine('en'),
              ...POLICY_HEADER.linesAfterTaxId,
            ]}
            onOpenUrl={openUrl}
          />

          <View
            collapsable={false}
            style={styles.articles}
            onLayout={(e) => {
              articlesOriginY.current = e.nativeEvent.layout.y;
            }}
          >
            {POLICY_ARTICLES.map((article) => (
              <ArticleSection
                key={article.id}
                article={article}
                onLayout={onArticleLayout}
                onOpenUrl={openUrl}
                bindRef={bindArticleRef}
              />
            ))}
          </View>

          <View style={styles.endBlock}>
            <View style={styles.endRule} />
            <Text style={styles.endMark}>{POLICY_HEADER.end}</Text>
            <Text style={styles.endVersion}>{POLICY_HEADER.endVersion}</Text>
          </View>
        </View>
      </ScrollView>

      {showTop ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={labels.backToTop}
          onPress={() => scrollToY(0)}
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
  scrollOuter: {
    flexGrow: 1,
  },
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
  noticeText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: typography.fonts.regular,
  },
  freshnessRail: {
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.07)',
  },
  freshnessAccent: {
    width: 3,
    marginVertical: 10,
    marginLeft: 10,
    borderRadius: 2,
    backgroundColor: colors.teal,
  },
  freshnessBody: {
    flex: 1,
    gap: 10,
    paddingVertical: 14,
    paddingLeft: 12,
    paddingRight: 14,
    overflow: 'hidden',
  },
  freshnessSheen: {
    ...StyleSheet.absoluteFillObject,
    width: 72,
  },
  freshnessNote: {
    color: colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 18,
    letterSpacing: 0.1,
    fontFamily: typography.fonts.regular,
  },
  freshnessAction: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(20, 169, 181, 0.10)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20, 169, 181, 0.22)',
  },
  freshnessActionPressed: {
    backgroundColor: 'rgba(20, 169, 181, 0.16)',
  },
  freshnessActionText: {
    color: colors.navy,
    fontSize: 12.5,
    letterSpacing: 0.2,
    fontFamily: typography.fonts.semibold,
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
    marginHorizontal: -spacing.xs,
    paddingLeft: spacing.xs,
    borderRadius: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(11, 42, 67, 0.07)',
  },
  tocItemLast: {
    borderBottomWidth: 0,
  },
  tocItemPressed: {
    backgroundColor: 'rgba(20, 169, 181, 0.06)',
  },
  tocItemActive: {
    backgroundColor: 'rgba(20, 169, 181, 0.10)',
    borderBottomColor: 'transparent',
  },
  tocNum: {
    width: 28,
    color: colors.tealStrong,
    fontSize: 12,
    fontFamily: typography.fonts.bold,
    letterSpacing: 0.3,
  },
  tocNumActive: {
    color: colors.navy,
  },
  tocItemText: {
    flex: 1,
    color: colors.navy,
    fontSize: 14,
    lineHeight: 19,
    fontFamily: typography.fonts.medium,
    letterSpacing: -0.15,
  },
  tocItemTextActive: {
    fontFamily: typography.fonts.semibold,
  },
  tocChevron: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11, 42, 67, 0.05)',
  },
  tocChevronActive: {
    backgroundColor: 'rgba(20, 169, 181, 0.16)',
  },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.08)',
    ...shadows.sm,
  },
  identityAccent: {
    width: 3,
    marginVertical: 14,
    marginLeft: 12,
    borderRadius: 2,
    backgroundColor: colors.navy,
  },
  identityBody: {
    flex: 1,
    gap: 14,
    paddingVertical: 16,
    paddingLeft: 12,
    paddingRight: 14,
    overflow: 'hidden',
  },
  identitySheen: {
    ...StyleSheet.absoluteFillObject,
    width: 88,
  },
  identityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  identityMark: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 169, 181, 0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20, 169, 181, 0.18)',
  },
  identityHeaderCopy: {
    flex: 1,
    gap: 4,
    paddingTop: 1,
  },
  identityLabel: {
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: typography.fonts.bold,
  },
  identityCompany: {
    color: colors.navy,
    fontSize: 14,
    lineHeight: 19,
    letterSpacing: -0.2,
    fontFamily: typography.fonts.semibold,
  },
  identityRows: {
    gap: 6,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(11, 42, 67, 0.028)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.05)',
  },
  identityRowPressed: {
    backgroundColor: 'rgba(20, 169, 181, 0.08)',
    borderColor: 'rgba(20, 169, 181, 0.16)',
  },
  identityIconWell: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(11, 42, 67, 0.06)',
  },
  identityRowCopy: {
    flex: 1,
    gap: 2,
  },
  identityRowLabel: {
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontFamily: typography.fonts.semibold,
  },
  identityRowValue: {
    color: colors.navy,
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: -0.1,
    fontFamily: typography.fonts.medium,
  },
  identityRowValueLink: {
    color: colors.tealStrong,
    fontFamily: typography.fonts.semibold,
  },
  identityRowChevron: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
    backgroundColor: 'rgba(20, 169, 181, 0.10)',
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
