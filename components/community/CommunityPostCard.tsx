import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { colors, radii, spacing, typography } from '@/constants/theme';
import type { CommunityPost } from '@/types';
import { formatRelativeDate } from '@/utils/format';

type Props = {
  post: CommunityPost;
  canEngage: boolean;
  onLike: () => void;
  onComment: (text: string) => void;
};

export function CommunityPostCard({ post, canEngage, onLike, onComment }: Props) {
  const router = useRouter();
  const [commentOpen, setCommentOpen] = useState(false);
  const [comment, setComment] = useState('');

  const isOrg = post.authorType === 'ORGANIZATION';
  const initials = post.authorName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const requireVerified = () => {
    Alert.alert(
      'Verification required',
      'Only registered professionals who have passed verification can like and comment in the community.',
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Check status',
          onPress: () => router.push('/auth/professional/pending'),
        },
      ],
    );
  };

  const handleLike = () => {
    if (!canEngage) {
      requireVerified();
      return;
    }
    onLike();
  };

  const handleCommentPress = () => {
    if (!canEngage) {
      requireVerified();
      return;
    }
    setCommentOpen((open) => !open);
  };

  const submitComment = () => {
    const trimmed = comment.trim();
    if (!trimmed) return;
    onComment(trimmed);
    setComment('');
    setCommentOpen(false);
    if (Platform.OS !== 'web') {
      Alert.alert('Comment posted', 'Your comment is now on this discussion.');
    }
  };

  return (
    <Card style={[styles.card, isOrg && styles.orgCard]}>
      <View style={styles.header}>
        <Avatar
          initials={initials}
          size={40}
          backgroundColor={isOrg ? colors.navy : colors.blueLight}
          textColor={isOrg ? colors.yellow : colors.navy}
        />
        <View style={styles.headerText}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{post.authorName}</Text>
            {post.authorVerified ? (
              <Ionicons
                name="checkmark-circle"
                size={14}
                color={isOrg ? colors.yellow : colors.navyLift}
              />
            ) : null}
          </View>
          <Text style={styles.meta}>
            {isOrg ? 'Official Organization' : post.authorRole}
            {' · '}
            {formatRelativeDate(post.createdAt)}
          </Text>
        </View>
        {isOrg ? (
          <Badge label="Official" color={colors.navy} backgroundColor={colors.yellow} />
        ) : null}
      </View>

      <Text style={styles.content}>{post.content}</Text>

      <View style={styles.stats}>
        <Text style={styles.stat}>{post.likes} likes</Text>
        <Text style={styles.stat}>{post.comments} comments</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={handleLike}
          style={[styles.action, !canEngage && styles.actionLocked]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canEngage }}
        >
          <Ionicons
            name={post.likedByMe ? 'heart' : canEngage ? 'heart-outline' : 'lock-closed-outline'}
            size={18}
            color={post.likedByMe ? colors.error : canEngage ? colors.navyLift : colors.textMuted}
          />
          <Text style={[styles.actionLabel, post.likedByMe && styles.liked, !canEngage && styles.lockedLabel]}>
            Like
          </Text>
        </Pressable>

        <Pressable
          onPress={handleCommentPress}
          style={[styles.action, !canEngage && styles.actionLocked]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canEngage }}
        >
          <Ionicons
            name={canEngage ? 'chatbubble-outline' : 'lock-closed-outline'}
            size={18}
            color={canEngage ? colors.navyLift : colors.textMuted}
          />
          <Text style={[styles.actionLabel, !canEngage && styles.lockedLabel]}>Comment</Text>
        </Pressable>
      </View>

      {!canEngage ? (
        <Text style={styles.gateHint}>Verified members only · likes & comments</Text>
      ) : null}

      {commentOpen && canEngage ? (
        <View style={styles.commentBox}>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Write a professional comment…"
            placeholderTextColor={colors.textMuted}
            multiline
            style={styles.commentInput}
          />
          <Pressable
            onPress={submitComment}
            disabled={!comment.trim()}
            style={[styles.commentSubmit, !comment.trim() && styles.commentSubmitDisabled]}
            accessibilityRole="button"
          >
            <Text style={styles.commentSubmitText}>Post comment</Text>
          </Pressable>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  orgCard: {
    borderColor: colors.navy,
    borderWidth: 1.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  headerText: {
    flex: 1,
    minWidth: 140,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.md,
    color: colors.navy,
  },
  meta: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  content: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.size.md,
    color: colors.text,
    lineHeight: typography.lineHeight.md,
    marginBottom: spacing.md,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  stat: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.xl,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: colors.blueLight,
  },
  actionLocked: {
    backgroundColor: colors.background,
  },
  actionLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.size.sm,
    color: colors.navyLift,
  },
  liked: {
    color: colors.error,
  },
  lockedLabel: {
    color: colors.textMuted,
  },
  gateHint: {
    marginTop: spacing.sm,
    fontFamily: typography.fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  commentBox: {
    marginTop: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.blueLight,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  commentInput: {
    minHeight: 64,
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    color: colors.navy,
    textAlignVertical: 'top',
  },
  commentSubmit: {
    alignSelf: 'flex-end',
    backgroundColor: colors.navy,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.full,
  },
  commentSubmitDisabled: {
    opacity: 0.45,
  },
  commentSubmitText: {
    fontFamily: typography.fonts.semibold,
    fontSize: 12,
    color: colors.yellow,
  },
});
