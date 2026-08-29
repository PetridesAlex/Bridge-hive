import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { AnnouncementCard } from '@/components/community/AnnouncementCard';
import { CommunityPostCard } from '@/components/community/CommunityPostCard';
import { ExchangeCard } from '@/components/community/ExchangeCard';
import { PostComposer } from '@/components/community/PostComposer';
import { AppScreen } from '@/components/ui/AppScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SelectMenu } from '@/components/ui/SelectMenu';
import { colors, spacing, typography } from '@/constants/theme';
import { mockAnnouncements, mockExchangeListings } from '@/data/mock';
import { useAuth } from '@/providers/AuthProvider';
import { useCommunityStore } from '@/store/communityStore';

const COMMUNITY_VIEWS = [
  {
    key: 'feed',
    label: 'Feed',
    description: 'Posts from verified professionals',
    icon: 'newspaper-outline' as const,
    iconFocused: 'newspaper' as const,
  },
  {
    key: 'announcements',
    label: 'Announcements',
    description: 'Official hospital & platform updates',
    icon: 'megaphone-outline' as const,
    iconFocused: 'megaphone' as const,
  },
  {
    key: 'exchange',
    label: 'Shift Exchange',
    description: 'Cover shifts from verified members',
    icon: 'swap-horizontal-outline' as const,
    iconFocused: 'swap-horizontal' as const,
  },
];

export default function CommunityScreen() {
  const [tab, setTab] = useState('feed');
  const { member, isVerifiedProfessional, isSuperAdmin } = useAuth();
  const posts = useCommunityStore((s) => s.posts);
  const toggleLike = useCommunityStore((s) => s.toggleLike);
  const addComment = useCommunityStore((s) => s.addComment);
  const addPost = useCommunityStore((s) => s.addPost);

  const canEngage = isVerifiedProfessional || isSuperAdmin;

  const options = useMemo(
    () =>
      COMMUNITY_VIEWS.map((item) => {
        let badge = 0;
        if (item.key === 'feed') badge = posts.length;
        if (item.key === 'announcements') badge = mockAnnouncements.length;
        if (item.key === 'exchange') badge = mockExchangeListings.length;
        return { ...item, badge };
      }),
    [posts.length],
  );

  return (
    <AppScreen>
      <ScreenHeader
        title="Community"
        subtitle={
          canEngage
            ? 'Verified professional network'
            : 'View only until verification is complete'
        }
      />

      <SelectMenu
        title="Community"
        accessibilityLabel="Choose community section"
        options={options}
        value={tab}
        onChange={setTab}
      />

      {tab === 'feed' ? (
        <Animated.View key="feed" entering={FadeIn.duration(220)} exiting={FadeOut.duration(120)}>
          <PostComposer
            canPost={canEngage}
            onSubmit={(content) => {
              if (!canEngage) return;
              addPost(content, member);
            }}
          />
          {posts.map((post) => (
            <CommunityPostCard
              key={post.id}
              post={post}
              canEngage={canEngage}
              onLike={() => {
                if (!canEngage) return;
                toggleLike(post.id);
              }}
              onComment={() => {
                if (!canEngage) return;
                addComment(post.id);
              }}
            />
          ))}
        </Animated.View>
      ) : null}

      {tab === 'announcements' ? (
        <Animated.View
          key="announcements"
          entering={FadeIn.duration(220)}
          exiting={FadeOut.duration(120)}
          style={styles.stack}
        >
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>Official updates</Text>
            <Text style={styles.bannerBody}>
              Hospital notices, training, and platform messages for verified professionals.
            </Text>
          </View>
          {mockAnnouncements.map((announcement) => (
            <AnnouncementCard key={announcement.id} announcement={announcement} />
          ))}
        </Animated.View>
      ) : null}

      {tab === 'exchange' ? (
        <Animated.View
          key="exchange"
          entering={FadeIn.duration(220)}
          exiting={FadeOut.duration(120)}
          style={styles.stack}
        >
          <View style={[styles.banner, styles.exchangeBanner]}>
            <Text style={styles.bannerTitle}>Available for transfer</Text>
            <Text style={styles.bannerBody}>
              Pick up shifts other verified professionals need covered — hospital approval still
              required.
            </Text>
          </View>
          {mockExchangeListings.map((listing) => (
            <ExchangeCard key={listing.id} listing={listing} />
          ))}
        </Animated.View>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 0,
  },
  banner: {
    backgroundColor: colors.blueLight,
    borderRadius: 14,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  exchangeBanner: {
    backgroundColor: colors.yellowLight,
  },
  bannerTitle: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.size.md,
    color: colors.navy,
    marginBottom: 4,
  },
  bannerBody: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.sm,
  },
});
