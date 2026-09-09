/**
 * Hand-maintained Database type mirror for Phase 1 (+ finance remediation).
 * Prefer regenerating after `npx supabase db reset`:
 *   npm run db:types
 * Then export from database.generated.ts instead of this file.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type GenericTable<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: GenericTable<{
        id: string;
        full_name: string | null;
        phone: string | null;
        account_status: 'active' | 'suspended' | 'deleted';
        created_at: string;
        updated_at: string;
      }>;
      organizations: GenericTable<{
        id: string;
        legal_name: string;
        display_name: string;
        slug: string;
        billing_email: string | null;
        status: 'pending' | 'active' | 'suspended' | 'closed';
        timezone: string;
        created_at: string;
        updated_at: string;
      }>;
      organization_members: GenericTable<{
        id: string;
        organization_id: string;
        user_id: string;
        role: 'org_admin' | 'org_scheduler' | 'org_billing';
        status: 'invited' | 'active' | 'revoked';
        invited_at: string;
        accepted_at: string | null;
        invited_by: string | null;
        created_at: string;
        updated_at: string;
      }>;
      locations: GenericTable<{
        id: string;
        organization_id: string;
        name: string;
        address_line1: string | null;
        address_line2: string | null;
        city: string | null;
        postal_code: string | null;
        country_code: string;
        timezone: string;
        contact_name: string | null;
        contact_phone: string | null;
        contact_email: string | null;
        created_at: string;
        updated_at: string;
      }>;
      wards: GenericTable<{
        id: string;
        location_id: string;
        name: string;
        instructions: string | null;
        created_at: string;
        updated_at: string;
      }>;
      worker_profiles: GenericTable<{
        user_id: string;
        worker_role: 'registered_nurse' | 'ward_assistant' | null;
        bio: string | null;
        onboarding_status: 'not_started' | 'in_progress' | 'completed';
        verification_status:
          | 'draft'
          | 'submitted'
          | 'under_review'
          | 'verified'
          | 'rejected'
          | 'suspended'
          | 'expired';
        created_at: string;
        updated_at: string;
      }>;
      credentials: GenericTable<{
        id: string;
        worker_id: string;
        credential_type: string;
        expires_at: string | null;
        status:
          | 'pending'
          | 'under_review'
          | 'verified'
          | 'rejected'
          | 'expired'
          | 'suspended';
        storage_path: string | null;
        verified_by: string | null;
        verified_at: string | null;
        rejection_reason: string | null;
        created_at: string;
        updated_at: string;
      }>;
      shifts: GenericTable<{
        id: string;
        organization_id: string;
        location_id: string;
        ward_id: string | null;
        required_role: 'registered_nurse' | 'ward_assistant';
        starts_at: string;
        ends_at: string;
        break_minutes: number;
        rate_minor: number;
        currency: string;
        status:
          | 'draft'
          | 'published'
          | 'filled'
          | 'in_progress'
          | 'awaiting_approval'
          | 'completed'
          | 'cancelled'
          | 'disputed';
        acceptance_deadline: string | null;
        title: string | null;
        notes: string | null;
        created_by: string | null;
        created_at: string;
        updated_at: string;
      }>;
      shift_requirements: GenericTable<{
        id: string;
        shift_id: string;
        requirement_type: string;
        required: boolean;
        created_at: string;
      }>;
      shift_assignments: GenericTable<{
        id: string;
        shift_id: string;
        worker_id: string;
        status:
          | 'accepted'
          | 'withdrawn'
          | 'cancelled'
          | 'checked_in'
          | 'checked_out'
          | 'submitted'
          | 'approved'
          | 'rejected'
          | 'no_show';
        accepted_at: string;
        check_in_at: string | null;
        check_out_at: string | null;
        cancellation_reason: string | null;
        created_at: string;
        updated_at: string;
      }>;
      timesheets: GenericTable<{
        id: string;
        assignment_id: string;
        submitted_minutes: number | null;
        approved_minutes: number | null;
        break_minutes: number;
        status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'corrected';
        reviewed_by: string | null;
        review_note: string | null;
        submitted_at: string | null;
        reviewed_at: string | null;
        created_at: string;
        updated_at: string;
      }>;
      device_tokens: GenericTable<{
        id: string;
        user_id: string;
        platform: string;
        expo_push_token: string;
        last_seen_at: string;
        revoked_at: string | null;
        created_at: string;
        updated_at: string;
      }>;
      notifications: GenericTable<{
        id: string;
        user_id: string;
        type: string;
        title: string;
        body: string;
        data: Json;
        read_at: string | null;
        created_at: string;
      }>;
      audit_events: GenericTable<{
        id: string;
        actor_user_id: string | null;
        organization_id: string | null;
        entity_type: string;
        entity_id: string | null;
        action: string;
        before: Json | null;
        after: Json | null;
        created_at: string;
      }>;
      platform_admin_roles: GenericTable<{
        user_id: string;
        role:
          | 'platform_support'
          | 'platform_verifier'
          | 'platform_finance'
          | 'platform_super_admin';
        granted_by: string | null;
        granted_at: string;
        created_at: string;
        updated_at: string;
      }>;
      platform_settings: GenericTable<{
        key: string;
        value_json: Json;
        updated_at: string;
      }>;
      payout_accounts: GenericTable<{
        id: string;
        worker_id: string;
        provider: string;
        external_account_id: string | null;
        country: string;
        currency: string;
        masked_iban: string;
        status:
          | 'pending'
          | 'verified'
          | 'failed'
          | 'rejected'
          | 'expired'
          | 'suspended';
        verified_at: string | null;
        last_verified_at: string | null;
        created_at: string;
        updated_at: string;
      }>;
      payout_account_events: GenericTable<{
        id: string;
        payout_account_id: string;
        event_type: string;
        provider_event_id: string | null;
        reason_code: string | null;
        actor_user_id: string | null;
        created_at: string;
      }>;
      pay_runs: GenericTable<{
        id: string;
        organization_id: string;
        period_start: string;
        period_end: string;
        status: 'draft' | 'approved' | 'released' | 'cancelled';
        total_minor: number;
        approved_by: string | null;
        released_at: string | null;
        created_at: string;
        updated_at: string;
      }>;
      payouts: GenericTable<{
        id: string;
        worker_id: string;
        assignment_id: string;
        organization_id: string;
        pay_run_id: string | null;
        payout_account_id: string | null;
        gross_amount_minor: number;
        commission_rate_bps: number;
        commission_amount_minor: number;
        worker_transfer_amount_minor: number;
        organization_total_due_minor: number;
        currency: string;
        approved_minutes: number;
        rate_minor: number;
        status:
          | 'approved'
          | 'payment_instruction_ready'
          | 'reported_paid'
          | 'reconciliation_pending'
          | 'reconciled'
          | 'overdue'
          | 'disputed'
          | 'failed'
          | 'cancelled';
        due_at: string;
        reported_paid_at: string | null;
        reconciled_at: string | null;
        bank_reference: string | null;
        failure_code: string | null;
        created_at: string;
        updated_at: string;
      }>;
      commission_obligations: GenericTable<{
        id: string;
        organization_id: string;
        worker_id: string | null;
        assignment_id: string;
        payout_id: string;
        gross_amount_minor: number;
        commission_rate_bps: number;
        commission_amount_minor: number;
        currency: string;
        payer_type: 'organization' | 'worker';
        status: 'pending' | 'invoiced' | 'paid' | 'overdue' | 'disputed' | 'waived';
        due_at: string;
        paid_at: string | null;
        invoice_reference: string | null;
        created_at: string;
        updated_at: string;
      }>;
      organization_payment_reports: GenericTable<{
        id: string;
        organization_id: string;
        payout_id: string;
        bank_reference: string;
        reported_at: string;
        reported_by: string;
        evidence_storage_path: string | null;
        reconciled_at: string | null;
        reconciled_by: string | null;
        created_at: string;
      }>;
      payment_adjustments: GenericTable<{
        id: string;
        payout_id: string;
        organization_id: string;
        adjustment_minor: number;
        currency: string;
        reason: string;
        created_by: string;
        created_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      claim_shift: {
        Args: { p_shift_id: string };
        Returns: Database['public']['Tables']['shift_assignments']['Row'];
      };
      publish_shift: {
        Args: { p_shift_id: string };
        Returns: Database['public']['Tables']['shifts']['Row'];
      };
      review_timesheet: {
        Args: {
          p_timesheet_id: string;
          p_decision: string;
          p_approved_minutes?: number;
          p_review_note?: string;
        };
        Returns: Database['public']['Tables']['timesheets']['Row'];
      };
      create_financial_snapshot: {
        Args: { p_assignment_id: string };
        Returns: Database['public']['Tables']['payouts']['Row'];
      };
      submit_payout_account: {
        Args: { p_country: string; p_currency: string; p_masked_iban: string };
        Returns: Database['public']['Tables']['payout_accounts']['Row'];
      };
      verify_payout_account: {
        Args: {
          p_payout_account_id: string;
          p_decision: string;
          p_reason_code?: string;
        };
        Returns: Database['public']['Tables']['payout_accounts']['Row'];
      };
      report_organization_payment: {
        Args: {
          p_payout_id: string;
          p_bank_reference: string;
          p_evidence_storage_path?: string;
        };
        Returns: Database['public']['Tables']['organization_payment_reports']['Row'];
      };
      reconcile_direct_transfer: {
        Args: { p_payout_id: string; p_admin_note?: string };
        Returns: Database['public']['Tables']['payouts']['Row'];
      };
      is_platform_admin: {
        Args: {
          p_required_role?:
            | 'platform_support'
            | 'platform_verifier'
            | 'platform_finance'
            | 'platform_super_admin';
        };
        Returns: boolean;
      };
      is_org_member: {
        Args: { p_organization_id: string };
        Returns: boolean;
      };
      has_org_role: {
        Args: {
          p_organization_id: string;
          p_roles: ('org_admin' | 'org_scheduler' | 'org_billing')[];
        };
        Returns: boolean;
      };
    };
    Enums: {
      platform_admin_role:
        | 'platform_support'
        | 'platform_verifier'
        | 'platform_finance'
        | 'platform_super_admin';
      payout_status:
        | 'approved'
        | 'payment_instruction_ready'
        | 'reported_paid'
        | 'reconciliation_pending'
        | 'reconciled'
        | 'overdue'
        | 'disputed'
        | 'failed'
        | 'cancelled';
      commission_payer_type: 'organization' | 'worker';
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
