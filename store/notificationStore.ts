import { create } from 'zustand';

import { mockNotifications } from '@/data/mock';
import type { AppNotification } from '@/types';

type NotificationState = {
  notifications: AppNotification[];
  markRead: (id: string) => void;
  markAllRead: () => void;
  unreadCount: () => number;
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: mockNotifications,

  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    })),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),

  unreadCount: () => get().notifications.filter((n) => !n.read).length,
}));
