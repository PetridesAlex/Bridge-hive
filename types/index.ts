export type MarketStatus = 'active' | 'inactive' | 'coming_soon';

export type Market = {
  id: string;
  code: string;
  countryCode: string;
  name: string;
  currency: string;
  timezone: string;
  locale: string;
  defaultLanguage: string;
  supportedLanguages: string[];
  status: MarketStatus;
};

export type ProfessionalRoleCode = 'REGISTERED_NURSE' | 'WARD_ASSISTANT' | string;

export type ProfessionalRole = {
  id: string;
  marketId: string;
  code: ProfessionalRoleCode;
  name: string;
  active: boolean;
};

/** Document / legacy badge status (kept for existing UI). */
export type VerificationStatus = 'VERIFIED' | 'PENDING' | 'REJECTED' | 'UNVERIFIED';

/** Shared auth identity account type. */
export type AccountType = 'PROFESSIONAL' | 'ORGANIZATION_USER' | 'SUPER_ADMIN';

/** Professional marketplace verification lifecycle. */
export type ProfessionalAccountStatus =
  | 'DRAFT'
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'INACTIVE';

/** Organization marketplace verification lifecycle. */
export type OrganizationAccountStatus =
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'INACTIVE';

/** @deprecated Prefer AccountType; kept for Super Admin badge compatibility. */
export type AppRole = 'MEMBER' | 'SUPER_ADMIN' | 'ORG_ADMIN';

export type OrganizationMemberRole =
  | 'ORGANIZATION_OWNER'
  | 'ORGANIZATION_ADMIN'
  | 'HR_MANAGER'
  | 'SCHEDULER'
  | 'DEPARTMENT_MANAGER'
  | 'FINANCE'
  | 'VIEWER';

export type OrganizationMemberStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED' | 'REMOVED';

export type Member = {
  id: string;
  marketId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  accountType: AccountType;
  professionalRoleId: string;
  professionalRoleCode: ProfessionalRoleCode;
  professionalRoleName: string;
  location: string;
  city: string;
  countryCode: string;
  /** Simplified status for existing UI badges. */
  verificationStatus: VerificationStatus;
  /** Full professional lifecycle when accountType is PROFESSIONAL. */
  professionalStatus: ProfessionalAccountStatus;
  appRole: AppRole;
  reliabilityPercent: number;
  completedShifts: number;
  hoursWorked: number;
  organizationsWorkedWith: number;
  availableEarnings: number;
  pendingEarnings: number;
  paidThisMonth: number;
  avatarInitials: string;
  yearsExperience: number;
  registrationNumber?: string;
  speciality?: string;
};

export type OrganizationType =
  | 'HOSPITAL'
  | 'PRIVATE_HOSPITAL'
  | 'CLINIC'
  | 'MEDICAL_CENTRE'
  | 'REHABILITATION'
  | 'REHABILITATION_CENTRE'
  | 'CARE_HOME'
  | 'OTHER'
  | 'OTHER_APPROVED_PROVIDER';

export type Organization = {
  id: string;
  marketId: string;
  name: string;
  organizationType: OrganizationType;
  verified: boolean;
  verificationStatus?: OrganizationAccountStatus;
  logo?: string;
  phone: string;
  email: string;
  website?: string;
  location: string;
  address: string;
  city: string;
  countryCode?: string;
  registrationNumber?: string;
  latitude?: number;
  longitude?: number;
};

export type OrganizationMembership = {
  id: string;
  organizationId: string;
  profileId: string;
  role: OrganizationMemberRole;
  departmentId?: string;
  status: OrganizationMemberStatus;
  organization?: Organization;
};

export type ProfessionalProfile = {
  id: string;
  profileId: string;
  marketId: string;
  professionalRoleId: string;
  professionalRoleCode: ProfessionalRoleCode;
  professionalRoleName: string;
  verificationStatus: ProfessionalAccountStatus;
  registrationNumber?: string;
  yearsExperience: number;
  speciality?: string;
  availableForShifts: boolean;
  preferredLocations: string[];
  preferredDepartments: string[];
  preferredShiftTypes: ('day' | 'night')[];
};

export type OrganizationLocation = {
  id: string;
  marketId: string;
  organizationId: string;
  name: string;
  city: string;
  address: string;
};

export type Department = {
  id: string;
  organizationId: string;
  name: string;
  code: string;
};

export type ShiftStatus =
  | 'OPEN'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'TRANSFERRED'
  | 'CANCELLED';

export type Shift = {
  id: string;
  marketId: string;
  organizationId: string;
  locationId: string;
  departmentId: string;
  professionalRoleId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  pay: number;
  currency: string;
  requiredWorkers: number;
  filledPositions: number;
  remainingPositions: number;
  requirements: string[];
  uniform: string;
  instructions: string;
  urgent: boolean;
  status: ShiftStatus;
  city: string;
  departmentName: string;
  organizationName: string;
  organizationVerified: boolean;
  professionalRoleName: string;
  locationName: string;
  assignedToMemberId?: string;
};

export type ShiftAssignment = {
  id: string;
  marketId: string;
  shiftId: string;
  memberId: string;
  organizationId: string;
  status: 'CONFIRMED' | 'COMPLETED' | 'TRANSFERRED' | 'CANCELLED';
  acceptedAt: string;
};

export type ShiftTransferStatus =
  | 'REQUESTED'
  | 'ACCEPTED_BY_REPLACEMENT'
  | 'PENDING_HOSPITAL_APPROVAL'
  | 'COMPLETED'
  | 'DECLINED'
  | 'EXPIRED';

export type ShiftTransfer = {
  id: string;
  marketId: string;
  shiftId: string;
  organizationId: string;
  fromMemberId: string;
  toMemberId?: string;
  toMemberName?: string;
  status: ShiftTransferStatus;
  hospitalApprovalRequired: boolean;
  requestedAt: string;
  completedAt?: string;
  noCancellationFee: boolean;
};

export type ReplacementCandidate = {
  id: string;
  fullName: string;
  professionalRoleName: string;
  verified: boolean;
  available: boolean;
  workedAtHospitalBefore: boolean;
  reliabilityPercent: number;
  avatarInitials: string;
};

export type DocumentStatus =
  | 'VERIFIED'
  | 'PENDING_REVIEW'
  | 'EXPIRING_SOON'
  | 'EXPIRED'
  | 'REJECTED';

export type ProfessionalDocument = {
  id: string;
  memberId: string;
  documentType: string;
  countryCode: string;
  issuingAuthority: string;
  registrationNumber?: string;
  issuedAt: string;
  expiresAt: string;
  verificationStatus: DocumentStatus;
  fileUrl?: string;
  daysUntilExpiry?: number;
};

export type DayPart = 'morning' | 'afternoon' | 'night';

export type DayAvailability = {
  day: string;
  morning: boolean;
  afternoon: boolean;
  night: boolean;
};

export type MemberAvailability = {
  memberId: string;
  availableForShifts: boolean;
  weekly: DayAvailability[];
  maxTravelDistanceKm: number;
  preferredLocations: string[];
  preferredDepartments: string[];
  preferredShiftTypes: ('day' | 'night')[];
};

export type PaymentStatus = 'PAID' | 'PROCESSING' | 'PENDING' | 'FAILED';

export type Payment = {
  id: string;
  marketId: string;
  memberId: string;
  organizationId: string;
  organizationName: string;
  shiftId: string;
  shiftLabel: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paidAt: string;
};

export type InvoiceStatus = 'PAID' | 'ISSUED' | 'OVERDUE' | 'DRAFT';

export type InvoiceItem = {
  id: string;
  description: string;
  organizationName: string;
  date: string;
  hours: number;
  amount: number;
};

export type Invoice = {
  id: string;
  marketId: string;
  memberId: string;
  invoiceNumber: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  status: InvoiceStatus;
  totalAmount: number;
  currency: string;
  items: InvoiceItem[];
  paymentStatus: PaymentStatus;
};

export type CommunityAuthorType = 'PROFESSIONAL' | 'ORGANIZATION';

export type CommunityPost = {
  id: string;
  marketId: string;
  authorId: string;
  authorName: string;
  authorRole?: string;
  authorType: CommunityAuthorType;
  authorVerified: boolean;
  content: string;
  createdAt: string;
  likes: number;
  comments: number;
  likedByMe: boolean;
};

export type Comment = {
  id: string;
  postId: string;
  authorName: string;
  content: string;
  createdAt: string;
};

export type AnnouncementCategory =
  | 'WEEKEND_SHIFTS'
  | 'TRAINING'
  | 'HOSPITAL'
  | 'PLATFORM'
  | 'PROFESSIONAL'
  | 'DOCUMENT';

export type Announcement = {
  id: string;
  marketId: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  organizationName?: string;
  createdAt: string;
};

export type ShiftExchangeListing = {
  id: string;
  marketId: string;
  shiftId: string;
  fromMemberId: string;
  fromMemberName: string;
  professionalRoleName: string;
  organizationName: string;
  departmentName: string;
  city: string;
  date: string;
  startTime: string;
  endTime: string;
  pay: number;
  currency: string;
  urgent: boolean;
};

export type NotificationType =
  | 'SHIFT_AVAILABLE'
  | 'URGENT_SHIFT'
  | 'SHIFT_CONFIRMED'
  | 'SHIFT_REMINDER'
  | 'TRANSFER_REQUEST'
  | 'TRANSFER_ACCEPTED'
  | 'TRANSFER_APPROVED'
  | 'TRANSFER_COMPLETED'
  | 'PAYMENT'
  | 'DOCUMENT_EXPIRY'
  | 'COMMUNITY'
  | 'SYSTEM';

export type AppNotification = {
  id: string;
  marketId: string;
  memberId: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  relatedId?: string;
};
