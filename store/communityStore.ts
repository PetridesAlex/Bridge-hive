import { create } from 'zustand';

import { mockPosts } from '@/data/mock';
import type { CommunityPost, Member } from '@/types';

type CommunityState = {
  posts: CommunityPost[];
  toggleLike: (postId: string) => void;
  addComment: (postId: string) => void;
  addPost: (content: string, author: Member) => void;
};

export const useCommunityStore = create<CommunityState>((set) => ({
  posts: mockPosts,

  toggleLike: (postId) =>
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              likedByMe: !p.likedByMe,
              likes: p.likedByMe ? Math.max(0, p.likes - 1) : p.likes + 1,
            }
          : p,
      ),
    })),

  addComment: (postId) =>
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId ? { ...p, comments: p.comments + 1 } : p,
      ),
    })),

  addPost: (content, author) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    if (author.verificationStatus !== 'VERIFIED' && author.accountType !== 'SUPER_ADMIN') {
      return;
    }
    const post: CommunityPost = {
      id: `post_${Date.now()}`,
      marketId: author.marketId,
      authorId: author.id,
      authorName: author.fullName,
      authorRole: author.professionalRoleName,
      authorType: 'PROFESSIONAL',
      authorVerified: true,
      content: trimmed,
      createdAt: new Date().toISOString(),
      likes: 0,
      comments: 0,
      likedByMe: false,
    };
    set((state) => ({ posts: [post, ...state.posts] }));
  },
}));
