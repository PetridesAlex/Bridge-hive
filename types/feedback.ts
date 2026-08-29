export type HospitalFeedback = {
  id: string;
  organizationId: string;
  organizationName: string;
  departmentName: string;
  /** Overall star rating from the hospital (1–5). */
  rating: number;
  /** Optional — hospitals typically leave stars only. */
  comment?: string;
  reviewerTitle: string;
  reviewedAt: string;
  categories?: {
    clinicalSkill: number;
    reliability: number;
    communication: number;
    teamwork: number;
  };
};
