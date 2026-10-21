import { colors } from '@/constants/theme';

export type WorkSegment = 'upcoming' | 'to_submit' | 'completed';

export type WorkSegmentTheme = {
  key: WorkSegment;
  label: string;
  shortLabel: string;
  description: string;
  /** Primary accent for rails, icons, active tab. */
  accent: string;
  accentSoft: string;
  gradient: [string, string];
  border: string;
  icon: 'calendar-outline' | 'create-outline' | 'checkmark-done-outline';
  iconFocused: 'calendar' | 'create' | 'checkmark-done';
};

/** Distinct color systems for My shifts segments. */
export const WORK_SEGMENTS: Record<WorkSegment, WorkSegmentTheme> = {
  upcoming: {
    key: 'upcoming',
    label: 'Upcoming',
    shortLabel: 'Scheduled',
    description: 'Accepted shifts waiting to start or finish',
    accent: colors.navy,
    accentSoft: '#E8EEF4',
    gradient: [colors.navy, colors.navyLift],
    border: '#B8C9D9',
    icon: 'calendar-outline',
    iconFocused: 'calendar',
  },
  to_submit: {
    key: 'to_submit',
    label: 'To submit',
    shortLabel: 'Action needed',
    description: 'Shift ended — submit hours for review',
    accent: colors.honeyStrong,
    accentSoft: colors.yellowLight,
    gradient: [colors.honeyStrong, '#C47A12'],
    border: '#E8C07A',
    icon: 'create-outline',
    iconFocused: 'create',
  },
  completed: {
    key: 'completed',
    label: 'Completed',
    shortLabel: 'Done',
    description: 'Submitted, approved, or closed assignments',
    accent: colors.success,
    accentSoft: colors.successLight,
    gradient: ['#146C43', colors.success],
    border: '#9FD4B3',
    icon: 'checkmark-done-outline',
    iconFocused: 'checkmark-done',
  },
};
