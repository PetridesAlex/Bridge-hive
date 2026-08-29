import type { HospitalFeedback } from '@/types/feedback';
import { isoDateOffset } from '@/utils/format';

export const PROFILE_RATING_SUMMARY = {
  average: 4.8,
  totalReviews: 24,
  recommendationRate: 96,
  distribution: [
    { stars: 5, count: 18 },
    { stars: 4, count: 4 },
    { stars: 3, count: 2 },
    { stars: 2, count: 0 },
    { stars: 1, count: 0 },
  ],
  categoryAverages: {
    clinicalSkill: 4.9,
    reliability: 4.8,
    communication: 4.7,
    teamwork: 4.8,
  },
} as const;

/** Hospital star ratings shown on Profile (no written comments). */
export const mockHospitalFeedback: HospitalFeedback[] = [
  {
    id: 'fb_1',
    organizationId: 'org_med',
    organizationName: 'Mediterranean Hospital',
    departmentName: 'ICU',
    rating: 5,
    reviewerTitle: 'Charge Nurse',
    reviewedAt: isoDateOffset(-3),
  },
  {
    id: 'fb_2',
    organizationId: 'org_lgh',
    organizationName: 'Limassol General Hospital',
    departmentName: 'Ward B',
    rating: 5,
    reviewerTitle: 'Ward Manager',
    reviewedAt: isoDateOffset(-12),
  },
  {
    id: 'fb_3',
    organizationId: 'org_cmc',
    organizationName: 'Cyprus Medical Centre',
    departmentName: 'A&E',
    rating: 4,
    reviewerTitle: 'Clinical Lead',
    reviewedAt: isoDateOffset(-21),
  },
];
