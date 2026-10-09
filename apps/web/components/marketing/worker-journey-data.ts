import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  CalendarDays,
  FileUp,
  Receipt,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

export type WorkerJourneyStep = {
  id: string;
  label: string;
  body: string;
  shortLabel: string;
  Icon: LucideIcon;
};

/** Canonical six-step worker account setup — shared by list + visual. */
export const WORKER_JOURNEY_STEPS: WorkerJourneyStep[] = [
  {
    id: 'create-account',
    label: 'Create your account',
    body: 'Register in the Bridge Hive worker app and confirm your email address.',
    shortLabel: 'Create account',
    Icon: UserRound,
  },
  {
    id: 'upload-documents',
    label: 'Upload role-specific documents',
    body: 'Submit credentials and information required for your role — registered nurse, ward assistant, or physiotherapist.',
    shortLabel: 'Documents',
    Icon: FileUp,
  },
  {
    id: 'bank-details',
    label: 'Submit bank details for wage payouts',
    body: 'Provide bank account details so healthcare organizations can pay your approved wages by bank transfer. Bridge Hive reviews those details as part of account verification — it does not use them to collect platform fees.',
    shortLabel: 'Bank details',
    Icon: Building2,
  },
  {
    id: 'admin-review',
    label: 'Platform admin review',
    body: 'A Bridge Hive administrator reviews your package. Shifts are available only after verification and activation.',
    shortLabel: 'Admin review',
    Icon: ShieldCheck,
  },
  {
    id: 'browse-shifts',
    label: 'Browse and accept eligible shifts',
    body: 'Once activated, view openings that match your role and accept work you can complete.',
    shortLabel: 'Browse shifts',
    Icon: CalendarDays,
  },
  {
    id: 'timesheets-commission',
    label: 'Timesheets, wages, and commission',
    body: 'Complete timesheets in the app. Organizations pay approved wages by bank transfer. Separately, Bridge Hive invoices you for its platform commission.',
    shortLabel: 'Timesheets & wages',
    Icon: Receipt,
  },
];

export const WORKER_JOURNEY_STEP_COUNT = WORKER_JOURNEY_STEPS.length;
