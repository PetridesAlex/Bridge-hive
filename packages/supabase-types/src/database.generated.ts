export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_events: {
        Row: {
          action: string
          actor_user_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          organization_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          organization_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_obligations: {
        Row: {
          assignment_id: string
          commission_amount_minor: number
          commission_rate_bps: number
          created_at: string
          currency: string
          due_at: string
          gross_amount_minor: number
          id: string
          invoice_reference: string | null
          organization_id: string
          paid_at: string | null
          payer_type: Database["public"]["Enums"]["commission_payer_type"]
          payout_id: string
          status: Database["public"]["Enums"]["commission_status"]
          updated_at: string
          worker_id: string | null
        }
        Insert: {
          assignment_id: string
          commission_amount_minor: number
          commission_rate_bps: number
          created_at?: string
          currency: string
          due_at: string
          gross_amount_minor: number
          id?: string
          invoice_reference?: string | null
          organization_id: string
          paid_at?: string | null
          payer_type?: Database["public"]["Enums"]["commission_payer_type"]
          payout_id: string
          status?: Database["public"]["Enums"]["commission_status"]
          updated_at?: string
          worker_id?: string | null
        }
        Update: {
          assignment_id?: string
          commission_amount_minor?: number
          commission_rate_bps?: number
          created_at?: string
          currency?: string
          due_at?: string
          gross_amount_minor?: number
          id?: string
          invoice_reference?: string | null
          organization_id?: string
          paid_at?: string | null
          payer_type?: Database["public"]["Enums"]["commission_payer_type"]
          payout_id?: string
          status?: Database["public"]["Enums"]["commission_status"]
          updated_at?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_obligations_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: true
            referencedRelation: "shift_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_obligations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_obligations_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "payouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_obligations_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      commission_rate_rules: {
        Row: {
          created_at: string
          created_by: string | null
          effective_from: string
          effective_until: string | null
          id: string
          rate_bps: number
          reason: string
          scope: string
          scope_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_from: string
          effective_until?: string | null
          id?: string
          rate_bps: number
          reason: string
          scope?: string
          scope_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_until?: string | null
          id?: string
          rate_bps?: number
          reason?: string
          scope?: string
          scope_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_rate_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credentials: {
        Row: {
          created_at: string
          credential_type: string
          expires_at: string | null
          id: string
          rejection_reason: string | null
          status: Database["public"]["Enums"]["credential_status"]
          storage_path: string | null
          storage_paths: Json
          updated_at: string
          verified_at: string | null
          verified_by: string | null
          worker_id: string
        }
        Insert: {
          created_at?: string
          credential_type: string
          expires_at?: string | null
          id?: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["credential_status"]
          storage_path?: string | null
          storage_paths?: Json
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          worker_id: string
        }
        Update: {
          created_at?: string
          credential_type?: string
          expires_at?: string | null
          id?: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["credential_status"]
          storage_path?: string | null
          storage_paths?: Json
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credentials_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credentials_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      device_tokens: {
        Row: {
          created_at: string
          expo_push_token: string
          id: string
          last_seen_at: string
          platform: string
          revoked_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expo_push_token: string
          id?: string
          last_seen_at?: string
          platform: string
          revoked_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expo_push_token?: string
          id?: string
          last_seen_at?: string
          platform?: string
          revoked_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country_code: string
          created_at: string
          id: string
          image_path: string | null
          name: string
          organization_id: string
          postal_code: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country_code?: string
          created_at?: string
          id?: string
          image_path?: string | null
          name: string
          organization_id: string
          postal_code?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country_code?: string
          created_at?: string
          id?: string
          image_path?: string | null
          name?: string
          organization_id?: string
          postal_code?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json
          id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string
          delivery_status: string
          email_normalized: string
          expires_at: string
          id: string
          last_delivery_error_category: string | null
          last_send_attempt_at: string | null
          last_sent_at: string | null
          organization_id: string
          revoked_at: string | null
          revoked_by: string | null
          role: Database["public"]["Enums"]["org_role"]
          send_attempt_count: number
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by: string
          delivery_status?: string
          email_normalized: string
          expires_at: string
          id?: string
          last_delivery_error_category?: string | null
          last_send_attempt_at?: string | null
          last_sent_at?: string | null
          organization_id: string
          revoked_at?: string | null
          revoked_by?: string | null
          role: Database["public"]["Enums"]["org_role"]
          send_attempt_count?: number
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string
          delivery_status?: string
          email_normalized?: string
          expires_at?: string
          id?: string
          last_delivery_error_category?: string | null
          last_send_attempt_at?: string | null
          last_sent_at?: string | null
          organization_id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          role?: Database["public"]["Enums"]["org_role"]
          send_attempt_count?: number
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_invitations_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invited_at: string
          invited_by: string | null
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          status: Database["public"]["Enums"]["membership_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_payment_reports: {
        Row: {
          bank_reference: string
          created_at: string
          evidence_storage_path: string | null
          id: string
          organization_id: string
          payout_id: string
          reconciled_at: string | null
          reconciled_by: string | null
          reported_at: string
          reported_by: string
        }
        Insert: {
          bank_reference: string
          created_at?: string
          evidence_storage_path?: string | null
          id?: string
          organization_id: string
          payout_id: string
          reconciled_at?: string | null
          reconciled_by?: string | null
          reported_at?: string
          reported_by: string
        }
        Update: {
          bank_reference?: string
          created_at?: string
          evidence_storage_path?: string | null
          id?: string
          organization_id?: string
          payout_id?: string
          reconciled_at?: string | null
          reconciled_by?: string | null
          reported_at?: string
          reported_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_payment_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_payment_reports_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "payouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_payment_reports_reconciled_by_fkey"
            columns: ["reconciled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_payment_reports_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          billing_email: string | null
          city: string | null
          country_code: string
          created_at: string
          display_name: string
          id: string
          legal_name: string
          logo_path: string | null
          organization_type: Database["public"]["Enums"]["organization_type"]
          postal_code: string | null
          primary_contact_email: string | null
          primary_contact_name: string | null
          registration_number: string | null
          registration_number_normalized: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          slug: string
          status: Database["public"]["Enums"]["org_status"]
          status_reason: string | null
          submitted_at: string | null
          tax_vat_number: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          billing_email?: string | null
          city?: string | null
          country_code?: string
          created_at?: string
          display_name: string
          id?: string
          legal_name: string
          logo_path?: string | null
          organization_type?: Database["public"]["Enums"]["organization_type"]
          postal_code?: string | null
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          registration_number?: string | null
          registration_number_normalized?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug: string
          status?: Database["public"]["Enums"]["org_status"]
          status_reason?: string | null
          submitted_at?: string | null
          tax_vat_number?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          billing_email?: string | null
          city?: string | null
          country_code?: string
          created_at?: string
          display_name?: string
          id?: string
          legal_name?: string
          logo_path?: string | null
          organization_type?: Database["public"]["Enums"]["organization_type"]
          postal_code?: string | null
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          registration_number?: string | null
          registration_number_normalized?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["org_status"]
          status_reason?: string | null
          submitted_at?: string | null
          tax_vat_number?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pay_runs: {
        Row: {
          approved_by: string | null
          created_at: string
          id: string
          organization_id: string
          period_end: string
          period_start: string
          released_at: string | null
          status: Database["public"]["Enums"]["pay_run_status"]
          total_minor: number
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          id?: string
          organization_id: string
          period_end: string
          period_start: string
          released_at?: string | null
          status?: Database["public"]["Enums"]["pay_run_status"]
          total_minor?: number
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          period_end?: string
          period_start?: string
          released_at?: string | null
          status?: Database["public"]["Enums"]["pay_run_status"]
          total_minor?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pay_runs_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pay_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_adjustments: {
        Row: {
          adjustment_minor: number
          created_at: string
          created_by: string
          currency: string
          id: string
          organization_id: string
          payout_id: string
          reason: string
        }
        Insert: {
          adjustment_minor: number
          created_at?: string
          created_by: string
          currency: string
          id?: string
          organization_id: string
          payout_id: string
          reason: string
        }
        Update: {
          adjustment_minor?: number
          created_at?: string
          created_by?: string
          currency?: string
          id?: string
          organization_id?: string
          payout_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_adjustments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_adjustments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_adjustments_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "payouts"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_account_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_type: string
          id: string
          payout_account_id: string
          provider_event_id: string | null
          reason_code: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          payout_account_id: string
          provider_event_id?: string | null
          reason_code?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          payout_account_id?: string
          provider_event_id?: string | null
          reason_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payout_account_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_account_events_payout_account_id_fkey"
            columns: ["payout_account_id"]
            isOneToOne: false
            referencedRelation: "payout_account_status_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_account_events_payout_account_id_fkey"
            columns: ["payout_account_id"]
            isOneToOne: false
            referencedRelation: "payout_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_accounts: {
        Row: {
          account_holder_name: string | null
          country: string
          created_at: string
          currency: string
          external_account_id: string | null
          id: string
          last_verified_at: string | null
          masked_iban: string
          proof_mime_type: string | null
          proof_storage_path: string | null
          provider: string
          rejection_reason: string | null
          status: Database["public"]["Enums"]["payout_account_status"]
          updated_at: string
          verified_at: string | null
          worker_id: string
        }
        Insert: {
          account_holder_name?: string | null
          country?: string
          created_at?: string
          currency?: string
          external_account_id?: string | null
          id?: string
          last_verified_at?: string | null
          masked_iban: string
          proof_mime_type?: string | null
          proof_storage_path?: string | null
          provider?: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["payout_account_status"]
          updated_at?: string
          verified_at?: string | null
          worker_id: string
        }
        Update: {
          account_holder_name?: string | null
          country?: string
          created_at?: string
          currency?: string
          external_account_id?: string | null
          id?: string
          last_verified_at?: string | null
          masked_iban?: string
          proof_mime_type?: string | null
          proof_storage_path?: string | null
          provider?: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["payout_account_status"]
          updated_at?: string
          verified_at?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_accounts_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: true
            referencedRelation: "worker_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      payouts: {
        Row: {
          approved_minutes: number
          assignment_id: string
          bank_reference: string | null
          commission_amount_minor: number
          commission_rate_bps: number
          created_at: string
          currency: string
          due_at: string
          failure_code: string | null
          gross_amount_minor: number
          id: string
          organization_id: string
          organization_total_due_minor: number
          pay_run_id: string | null
          payout_account_id: string | null
          rate_minor: number
          reconciled_at: string | null
          reported_paid_at: string | null
          status: Database["public"]["Enums"]["payout_status"]
          updated_at: string
          worker_id: string
          worker_transfer_amount_minor: number
        }
        Insert: {
          approved_minutes: number
          assignment_id: string
          bank_reference?: string | null
          commission_amount_minor: number
          commission_rate_bps: number
          created_at?: string
          currency: string
          due_at: string
          failure_code?: string | null
          gross_amount_minor: number
          id?: string
          organization_id: string
          organization_total_due_minor: number
          pay_run_id?: string | null
          payout_account_id?: string | null
          rate_minor: number
          reconciled_at?: string | null
          reported_paid_at?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
          worker_id: string
          worker_transfer_amount_minor: number
        }
        Update: {
          approved_minutes?: number
          assignment_id?: string
          bank_reference?: string | null
          commission_amount_minor?: number
          commission_rate_bps?: number
          created_at?: string
          currency?: string
          due_at?: string
          failure_code?: string | null
          gross_amount_minor?: number
          id?: string
          organization_id?: string
          organization_total_due_minor?: number
          pay_run_id?: string | null
          payout_account_id?: string | null
          rate_minor?: number
          reconciled_at?: string | null
          reported_paid_at?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
          worker_id?: string
          worker_transfer_amount_minor?: number
        }
        Relationships: [
          {
            foreignKeyName: "payouts_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: true
            referencedRelation: "shift_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_pay_run_id_fkey"
            columns: ["pay_run_id"]
            isOneToOne: false
            referencedRelation: "pay_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_payout_account_id_fkey"
            columns: ["payout_account_id"]
            isOneToOne: false
            referencedRelation: "payout_account_status_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_payout_account_id_fkey"
            columns: ["payout_account_id"]
            isOneToOne: false
            referencedRelation: "payout_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      platform_admin_roles: {
        Row: {
          created_at: string
          granted_at: string
          granted_by: string | null
          role: Database["public"]["Enums"]["platform_admin_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          role: Database["public"]["Enums"]["platform_admin_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          role?: Database["public"]["Enums"]["platform_admin_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_admin_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_admin_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          value_json: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value_json: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value_json?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          avatar_path: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          avatar_path?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          avatar_path?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shift_assignments: {
        Row: {
          accepted_at: string
          cancellation_reason: string | null
          check_in_at: string | null
          check_out_at: string | null
          created_at: string
          id: string
          shift_id: string
          status: Database["public"]["Enums"]["assignment_status"]
          updated_at: string
          worker_id: string
        }
        Insert: {
          accepted_at?: string
          cancellation_reason?: string | null
          check_in_at?: string | null
          check_out_at?: string | null
          created_at?: string
          id?: string
          shift_id: string
          status?: Database["public"]["Enums"]["assignment_status"]
          updated_at?: string
          worker_id: string
        }
        Update: {
          accepted_at?: string
          cancellation_reason?: string | null
          check_in_at?: string | null
          check_out_at?: string | null
          created_at?: string
          id?: string
          shift_id?: string
          status?: Database["public"]["Enums"]["assignment_status"]
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_assignments_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      shift_creation_batches: {
        Row: {
          created_at: string
          created_by: string
          creation_mode: string
          id: string
          organization_id: string
          payload_hash: string
          request_key: string
          requested_status: string
          shift_count: number
        }
        Insert: {
          created_at?: string
          created_by: string
          creation_mode: string
          id?: string
          organization_id: string
          payload_hash: string
          request_key: string
          requested_status: string
          shift_count: number
        }
        Update: {
          created_at?: string
          created_by?: string
          creation_mode?: string
          id?: string
          organization_id?: string
          payload_hash?: string
          request_key?: string
          requested_status?: string
          shift_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "shift_creation_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_creation_batches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_requirements: {
        Row: {
          created_at: string
          id: string
          required: boolean
          requirement_type: string
          shift_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          required?: boolean
          requirement_type: string
          shift_id: string
        }
        Update: {
          created_at?: string
          id?: string
          required?: boolean
          requirement_type?: string
          shift_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_requirements_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          acceptance_deadline: string | null
          break_minutes: number
          created_at: string
          created_by: string | null
          creation_batch_id: string | null
          currency: string
          ends_at: string
          id: string
          location_id: string
          notes: string | null
          organization_id: string
          rate_minor: number
          required_role: Database["public"]["Enums"]["worker_role"]
          starts_at: string
          status: Database["public"]["Enums"]["shift_status"]
          title: string | null
          updated_at: string
          ward_id: string | null
        }
        Insert: {
          acceptance_deadline?: string | null
          break_minutes?: number
          created_at?: string
          created_by?: string | null
          creation_batch_id?: string | null
          currency?: string
          ends_at: string
          id?: string
          location_id: string
          notes?: string | null
          organization_id: string
          rate_minor: number
          required_role: Database["public"]["Enums"]["worker_role"]
          starts_at: string
          status?: Database["public"]["Enums"]["shift_status"]
          title?: string | null
          updated_at?: string
          ward_id?: string | null
        }
        Update: {
          acceptance_deadline?: string | null
          break_minutes?: number
          created_at?: string
          created_by?: string | null
          creation_batch_id?: string | null
          currency?: string
          ends_at?: string
          id?: string
          location_id?: string
          notes?: string | null
          organization_id?: string
          rate_minor?: number
          required_role?: Database["public"]["Enums"]["worker_role"]
          starts_at?: string
          status?: Database["public"]["Enums"]["shift_status"]
          title?: string | null
          updated_at?: string
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shifts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_creation_batch_id_fkey"
            columns: ["creation_batch_id"]
            isOneToOne: false
            referencedRelation: "shift_creation_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheets: {
        Row: {
          approved_minutes: number | null
          assignment_id: string
          break_minutes: number
          created_at: string
          id: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["timesheet_status"]
          submitted_at: string | null
          submitted_minutes: number | null
          updated_at: string
        }
        Insert: {
          approved_minutes?: number | null
          assignment_id: string
          break_minutes?: number
          created_at?: string
          id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["timesheet_status"]
          submitted_at?: string | null
          submitted_minutes?: number | null
          updated_at?: string
        }
        Update: {
          approved_minutes?: number | null
          assignment_id?: string
          break_minutes?: number
          created_at?: string
          id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["timesheet_status"]
          submitted_at?: string | null
          submitted_minutes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheets_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: true
            referencedRelation: "shift_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wards: {
        Row: {
          created_at: string
          id: string
          instructions: string | null
          location_id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          instructions?: string | null
          location_id: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          instructions?: string | null
          location_id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wards_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_commission_invoices: {
        Row: {
          approved_minutes: number
          assignment_id: string
          commission_amount_minor: number
          commission_rate_bps: number
          created_at: string
          currency: string
          due_at: string
          gross_amount_minor: number
          id: string
          invoice_number: string
          issued_at: string
          organization_id: string
          paid_at: string | null
          past_due_at: string | null
          provider_metadata: Json
          provider_name: string
          rate_minor: number
          status: Database["public"]["Enums"]["worker_invoice_status"]
          stripe_checkout_session_id: string | null
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          timesheet_id: string
          updated_at: string
          void_reason: string | null
          voided_at: string | null
          worker_id: string
        }
        Insert: {
          approved_minutes: number
          assignment_id: string
          commission_amount_minor: number
          commission_rate_bps: number
          created_at?: string
          currency?: string
          due_at: string
          gross_amount_minor: number
          id?: string
          invoice_number: string
          issued_at?: string
          organization_id: string
          paid_at?: string | null
          past_due_at?: string | null
          provider_metadata?: Json
          provider_name?: string
          rate_minor: number
          status?: Database["public"]["Enums"]["worker_invoice_status"]
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          timesheet_id: string
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          worker_id: string
        }
        Update: {
          approved_minutes?: number
          assignment_id?: string
          commission_amount_minor?: number
          commission_rate_bps?: number
          created_at?: string
          currency?: string
          due_at?: string
          gross_amount_minor?: number
          id?: string
          invoice_number?: string
          issued_at?: string
          organization_id?: string
          paid_at?: string | null
          past_due_at?: string | null
          provider_metadata?: Json
          provider_name?: string
          rate_minor?: number
          status?: Database["public"]["Enums"]["worker_invoice_status"]
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          timesheet_id?: string
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_commission_invoices_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: true
            referencedRelation: "shift_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_commission_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_commission_invoices_timesheet_id_fkey"
            columns: ["timesheet_id"]
            isOneToOne: true
            referencedRelation: "timesheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_commission_invoices_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "worker_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      worker_invoice_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_type: string
          id: string
          invoice_id: string
          provider_data: Json
          provider_event_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          invoice_id: string
          provider_data?: Json
          provider_event_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          invoice_id?: string
          provider_data?: Json
          provider_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "worker_invoice_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_invoice_events_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "worker_commission_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_profiles: {
        Row: {
          bio: string | null
          created_at: string
          onboarding_status: Database["public"]["Enums"]["onboarding_status"]
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          worker_role: Database["public"]["Enums"]["worker_role"] | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          onboarding_status?: Database["public"]["Enums"]["onboarding_status"]
          updated_at?: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          worker_role?: Database["public"]["Enums"]["worker_role"] | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          onboarding_status?: Database["public"]["Enums"]["onboarding_status"]
          updated_at?: string
          user_id?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          worker_role?: Database["public"]["Enums"]["worker_role"] | null
        }
        Relationships: [
          {
            foreignKeyName: "worker_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      payout_account_status_view: {
        Row: {
          created_at: string | null
          has_proof: boolean | null
          id: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["payout_account_status"] | null
          updated_at: string | null
          verified_at: string | null
          worker_id: string | null
        }
        Insert: {
          created_at?: string | null
          has_proof?: never
          id?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["payout_account_status"] | null
          updated_at?: string | null
          verified_at?: string | null
          worker_id?: string | null
        }
        Update: {
          created_at?: string | null
          has_proof?: never
          id?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["payout_account_status"] | null
          updated_at?: string | null
          verified_at?: string | null
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payout_accounts_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: true
            referencedRelation: "worker_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Functions: {
      _create_organization_invitation_internal: {
        Args: {
          p_created_by: string
          p_email: string
          p_organization_id: string
          p_role: Database["public"]["Enums"]["org_role"]
        }
        Returns: {
          expires_at: string
          invitation_id: string
          raw_token: string
        }[]
      }
      accept_organization_invitation: {
        Args: { p_raw_token: string }
        Returns: Json
      }
      accept_organization_invitation_by_id: {
        Args: { p_invitation_id: string }
        Returns: Json
      }
      assert_invitation_resend_allowed: {
        Args: { p_invitation_id: string }
        Returns: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string
          delivery_status: string
          email_normalized: string
          expires_at: string
          id: string
          last_delivery_error_category: string | null
          last_send_attempt_at: string | null
          last_sent_at: string | null
          organization_id: string
          revoked_at: string | null
          revoked_by: string | null
          role: Database["public"]["Enums"]["org_role"]
          send_attempt_count: number
          token_hash: string
        }
        SetofOptions: {
          from: "*"
          to: "organization_invitations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_organization_invitation_preview_by_id: {
        Args: { p_invitation_id: string }
        Returns: Json
      }
      mark_organization_invitation_delivery: {
        Args: {
          p_delivery_status: string
          p_error_category?: string | null
          p_invitation_id: string
        }
        Returns: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string
          delivery_status: string
          email_normalized: string
          expires_at: string
          id: string
          last_delivery_error_category: string | null
          last_send_attempt_at: string | null
          last_sent_at: string | null
          organization_id: string
          revoked_at: string | null
          revoked_by: string | null
          role: Database["public"]["Enums"]["org_role"]
          send_attempt_count: number
          token_hash: string
        }
        SetofOptions: {
          from: "*"
          to: "organization_invitations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      apply_worker_invoice_provider_event: {
        Args: {
          p_amount_minor: number
          p_checkout_session_id?: string
          p_currency: string
          p_event_type: string
          p_invoice_id: string
          p_payment_intent_id?: string
          p_provider_data?: Json
          p_provider_event_id: string
        }
        Returns: Json
      }
      approve_organization: {
        Args: { p_organization_id: string }
        Returns: {
          address_line1: string | null
          address_line2: string | null
          billing_email: string | null
          city: string | null
          country_code: string
          created_at: string
          display_name: string
          id: string
          legal_name: string
          logo_path: string | null
          organization_type: Database["public"]["Enums"]["organization_type"]
          postal_code: string | null
          primary_contact_email: string | null
          primary_contact_name: string | null
          registration_number: string | null
          registration_number_normalized: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          slug: string
          status: Database["public"]["Enums"]["org_status"]
          status_reason: string | null
          submitted_at: string | null
          tax_vat_number: string | null
          timezone: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      approve_reviewed_worker_credentials: {
        Args: {
          p_confirm_reviewed: boolean
          p_credential_ids: string[]
          p_expected_last_activity?: string
          p_worker_id: string
        }
        Returns: {
          created_at: string
          credential_type: string
          expires_at: string | null
          id: string
          rejection_reason: string | null
          status: Database["public"]["Enums"]["credential_status"]
          storage_path: string | null
          storage_paths: Json
          updated_at: string
          verified_at: string | null
          verified_by: string | null
          worker_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "credentials"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      assignment_belongs_to_org_member: {
        Args: { p_assignment_id: string }
        Returns: boolean
      }
      audit_credential_document_view: {
        Args: { p_credential_id: string }
        Returns: undefined
      }
      audit_payout_proof_document_view: {
        Args: { p_payout_account_id: string }
        Returns: undefined
      }
      check_in_assignment: {
        Args: { p_assignment_id: string }
        Returns: {
          accepted_at: string
          cancellation_reason: string | null
          check_in_at: string | null
          check_out_at: string | null
          created_at: string
          id: string
          shift_id: string
          status: Database["public"]["Enums"]["assignment_status"]
          updated_at: string
          worker_id: string
        }
        SetofOptions: {
          from: "*"
          to: "shift_assignments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      check_out_assignment: {
        Args: { p_assignment_id: string }
        Returns: {
          accepted_at: string
          cancellation_reason: string | null
          check_in_at: string | null
          check_out_at: string | null
          created_at: string
          id: string
          shift_id: string
          status: Database["public"]["Enums"]["assignment_status"]
          updated_at: string
          worker_id: string
        }
        SetofOptions: {
          from: "*"
          to: "shift_assignments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      check_schedule_conflict: {
        Args: {
          p_ends_at: string
          p_exclude_assignment_id?: string
          p_starts_at: string
          p_worker_id: string
        }
        Returns: boolean
      }
      check_worker_eligibility: {
        Args: { p_shift_id: string; p_worker_id: string }
        Returns: string
      }
      claim_shift: {
        Args: { p_shift_id: string }
        Returns: {
          accepted_at: string
          cancellation_reason: string | null
          check_in_at: string | null
          check_out_at: string | null
          created_at: string
          id: string
          shift_id: string
          status: Database["public"]["Enums"]["assignment_status"]
          updated_at: string
          worker_id: string
        }
        SetofOptions: {
          from: "*"
          to: "shift_assignments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_audit_event: {
        Args: {
          p_action: string
          p_after?: Json
          p_before?: Json
          p_entity_id: string
          p_entity_type: string
          p_organization_id: string
        }
        Returns: {
          action: string
          actor_user_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          organization_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "audit_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_financial_snapshot: {
        Args: { p_assignment_id: string }
        Returns: {
          approved_minutes: number
          assignment_id: string
          bank_reference: string | null
          commission_amount_minor: number
          commission_rate_bps: number
          created_at: string
          currency: string
          due_at: string
          failure_code: string | null
          gross_amount_minor: number
          id: string
          organization_id: string
          organization_total_due_minor: number
          pay_run_id: string | null
          payout_account_id: string | null
          rate_minor: number
          reconciled_at: string | null
          reported_paid_at: string | null
          status: Database["public"]["Enums"]["payout_status"]
          updated_at: string
          worker_id: string
          worker_transfer_amount_minor: number
        }
        SetofOptions: {
          from: "*"
          to: "payouts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_organization_invitation: {
        Args: {
          p_email: string
          p_organization_id: string
          p_role: Database["public"]["Enums"]["org_role"]
        }
        Returns: Json
      }
      create_organization_with_admin_invite: {
        Args: {
          p_address_line1?: string
          p_address_line2?: string
          p_admin_email: string
          p_billing_email?: string
          p_city?: string
          p_country_code?: string
          p_display_name: string
          p_legal_name: string
          p_organization_type: Database["public"]["Enums"]["organization_type"]
          p_postal_code?: string
          p_primary_contact_email?: string
          p_primary_contact_name?: string
          p_registration_number?: string
          p_slug: string
          p_tax_vat_number?: string
          p_timezone?: string
        }
        Returns: Json
      }
      create_shifts_batch: {
        Args: {
          p_creation_mode: string
          p_organization_id: string
          p_request_key: string
          p_requested_status: string
          p_shifts: Json
        }
        Returns: Json
      }
      credential_has_uploaded_file: {
        Args: { p_cred: Database["public"]["Tables"]["credentials"]["Row"] }
        Returns: boolean
      }
      credential_support_view: {
        Args: never
        Returns: {
          created_at: string
          credential_type: string
          expires_at: string
          id: string
          status: Database["public"]["Enums"]["credential_status"]
          updated_at: string
          verified_at: string
          worker_id: string
        }[]
      }
      ensure_my_worker_profile: {
        Args: {
          p_bio?: string | null
          p_worker_role?: Database["public"]["Enums"]["worker_role"] | null
        }
        Returns: {
          bio: string | null
          created_at: string
          onboarding_status: Database["public"]["Enums"]["onboarding_status"]
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          worker_role: Database["public"]["Enums"]["worker_role"] | null
        }
        SetofOptions: {
          from: "*"
          to: "worker_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      generate_invitation_raw_token: { Args: never; Returns: string }
      generate_payment_instructions: {
        Args: { p_payout_id: string }
        Returns: {
          approved_minutes: number
          assignment_id: string
          bank_reference: string | null
          commission_amount_minor: number
          commission_rate_bps: number
          created_at: string
          currency: string
          due_at: string
          failure_code: string | null
          gross_amount_minor: number
          id: string
          organization_id: string
          organization_total_due_minor: number
          pay_run_id: string | null
          payout_account_id: string | null
          rate_minor: number
          reconciled_at: string | null
          reported_paid_at: string | null
          status: Database["public"]["Enums"]["payout_status"]
          updated_at: string
          worker_id: string
          worker_transfer_amount_minor: number
        }
        SetofOptions: {
          from: "*"
          to: "payouts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_admin_organization_detail: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      get_effective_commission_rate_bps: {
        Args: { p_at?: string }
        Returns: number
      }
      get_finance_metrics: {
        Args: { p_period_end?: string; p_period_start?: string }
        Returns: Json
      }
      get_my_billing_restriction_summary: { Args: never; Returns: Json }
      get_my_organization_setup: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      get_organization_invitation_preview: {
        Args: { p_raw_token: string }
        Returns: Json
      }
      get_setting_int: {
        Args: { p_default: number; p_key: string }
        Returns: number
      }
      get_worker_billing_standing: {
        Args: { p_worker_id: string }
        Returns: Database["public"]["Enums"]["worker_billing_standing"]
      }
      get_worker_payout_status: {
        Args: { p_worker_id: string }
        Returns: {
          created_at: string
          has_proof: boolean
          id: string
          rejection_reason: string
          status: Database["public"]["Enums"]["payout_account_status"]
          updated_at: string
          verified_at: string
          worker_id: string
        }[]
      }
      get_worker_shift_details: {
        Args: { p_shift_id: string }
        Returns: {
          acceptance_deadline: string
          break_minutes: number
          currency: string
          ends_at: string
          location_name: string
          notes: string
          organization_name: string
          rate_minor: number
          required_role: Database["public"]["Enums"]["worker_role"]
          shift_id: string
          starts_at: string
          status: Database["public"]["Enums"]["shift_status"]
          title: string
          ward_name: string
        }[]
      }
      has_org_role: {
        Args: {
          p_organization_id: string
          p_roles: Database["public"]["Enums"]["org_role"][]
        }
        Returns: boolean
      }
      hash_invitation_token: { Args: { p_raw_token: string }; Returns: string }
      is_org_member: { Args: { p_organization_id: string }; Returns: boolean }
      is_platform_admin: {
        Args: {
          p_required_role?: Database["public"]["Enums"]["platform_admin_role"]
        }
        Returns: boolean
      }
      is_valid_iban: { Args: { p_iban: string }; Returns: boolean }
      list_admin_organizations: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_organization_type?: Database["public"]["Enums"]["organization_type"]
          p_search?: string
          p_sort?: string
          p_status?: Database["public"]["Enums"]["org_status"]
        }
        Returns: {
          created_at: string
          display_name: string
          id: string
          last_activity: string
          legal_name: string
          location_count: number
          member_count: number
          organization_type: Database["public"]["Enums"]["organization_type"]
          published_shift_count: number
          short_reference: string
          status: Database["public"]["Enums"]["org_status"]
          total_count: number
        }[]
      }
      list_finance_invoices: {
        Args: {
          p_due_after?: string
          p_due_before?: string
          p_limit?: number
          p_offset?: number
          p_organization_id?: string
          p_search?: string
          p_status?: string
          p_worker_role?: string
        }
        Returns: {
          commission_amount_minor: number
          commission_rate_bps: number
          currency: string
          due_at: string
          gross_amount_minor: number
          id: string
          invoice_number: string
          issued_at: string
          organization_id: string
          organization_name: string
          paid_at: string
          provider_name: string
          shift_starts_at: string
          status: Database["public"]["Enums"]["worker_invoice_status"]
          stripe_checkout_session_id: string
          stripe_payment_intent_id: string
          worker_id: string
          worker_name: string
          worker_role: Database["public"]["Enums"]["worker_role"]
        }[]
      }
      list_verification_applications: {
        Args: {
          p_application_status?: string
          p_limit?: number
          p_offset?: number
          p_payout_status?: Database["public"]["Enums"]["payout_account_status"]
          p_role?: Database["public"]["Enums"]["worker_role"]
          p_search?: string
          p_sort?: string
        }
        Returns: {
          account_status: Database["public"]["Enums"]["account_status"]
          application_ref: string
          application_status: string
          approved_count: number
          awaiting_review_count: number
          email: string
          full_name: string
          last_activity_at: string
          onboarding_status: Database["public"]["Enums"]["onboarding_status"]
          payout_status: Database["public"]["Enums"]["payout_account_status"]
          phone: string
          rejected_count: number
          required_total: number
          submitted_at: string
          submitted_file_count: number
          total_count: number
          verification_status: Database["public"]["Enums"]["verification_status"]
          worker_id: string
          worker_role: Database["public"]["Enums"]["worker_role"]
        }[]
      }
      list_worker_payout_statuses: {
        Args: never
        Returns: {
          status: Database["public"]["Enums"]["payout_account_status"]
          worker_id: string
        }[]
      }
      mark_credentials_under_review: {
        Args: { p_credential_ids: string[]; p_worker_id: string }
        Returns: {
          created_at: string
          credential_type: string
          expires_at: string | null
          id: string
          rejection_reason: string | null
          status: Database["public"]["Enums"]["credential_status"]
          storage_path: string | null
          storage_paths: Json
          updated_at: string
          verified_at: string | null
          verified_by: string | null
          worker_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "credentials"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      mark_payout_overdue: {
        Args: { p_payout_id: string }
        Returns: {
          approved_minutes: number
          assignment_id: string
          bank_reference: string | null
          commission_amount_minor: number
          commission_rate_bps: number
          created_at: string
          currency: string
          due_at: string
          failure_code: string | null
          gross_amount_minor: number
          id: string
          organization_id: string
          organization_total_due_minor: number
          pay_run_id: string | null
          payout_account_id: string | null
          rate_minor: number
          reconciled_at: string | null
          reported_paid_at: string | null
          status: Database["public"]["Enums"]["payout_status"]
          updated_at: string
          worker_id: string
          worker_transfer_amount_minor: number
        }
        SetofOptions: {
          from: "*"
          to: "payouts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mask_iban: { Args: { p_iban: string }; Returns: string }
      next_worker_invoice_number: { Args: never; Returns: string }
      normalize_email: { Args: { p_email: string }; Returns: string }
      normalize_iban: { Args: { p_iban: string }; Returns: string }
      normalize_org_slug: { Args: { p_slug: string }; Returns: string }
      normalize_registration_number: {
        Args: { p_value: string }
        Returns: string
      }
      notify_credential_event: {
        Args: {
          p_credential_type: string
          p_event_type: string
          p_reason?: string
          p_worker_id: string
        }
        Returns: undefined
      }
      notify_organization_event: {
        Args: {
          p_event_type: string
          p_org_display_name: string
          p_safe_reason?: string
          p_user_id: string
        }
        Returns: undefined
      }
      notify_platform_admin_task: {
        Args: { p_body: string; p_data?: Json; p_title: string; p_type: string }
        Returns: undefined
      }
      notify_super_admin_task: {
        Args: { p_body: string; p_data?: Json; p_title: string; p_type: string }
        Returns: undefined
      }
      notify_worker_invoice: {
        Args: {
          p_body: string
          p_dedupe_hours?: number
          p_invoice_id: string
          p_invoice_number: string
          p_title: string
          p_type: string
          p_worker_id: string
        }
        Returns: undefined
      }
      organization_is_operational: {
        Args: { p_organization_id: string }
        Returns: boolean
      }
      process_worker_commission_due_dates: { Args: never; Returns: Json }
      publish_shift: {
        Args: { p_shift_id: string }
        Returns: {
          acceptance_deadline: string | null
          break_minutes: number
          created_at: string
          created_by: string | null
          creation_batch_id: string | null
          currency: string
          ends_at: string
          id: string
          location_id: string
          notes: string | null
          organization_id: string
          rate_minor: number
          required_role: Database["public"]["Enums"]["worker_role"]
          starts_at: string
          status: Database["public"]["Enums"]["shift_status"]
          title: string | null
          updated_at: string
          ward_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "shifts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reactivate_organization: {
        Args: { p_organization_id: string; p_reason: string }
        Returns: {
          address_line1: string | null
          address_line2: string | null
          billing_email: string | null
          city: string | null
          country_code: string
          created_at: string
          display_name: string
          id: string
          legal_name: string
          logo_path: string | null
          organization_type: Database["public"]["Enums"]["organization_type"]
          postal_code: string | null
          primary_contact_email: string | null
          primary_contact_name: string | null
          registration_number: string | null
          registration_number_normalized: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          slug: string
          status: Database["public"]["Enums"]["org_status"]
          status_reason: string | null
          submitted_at: string | null
          tax_vat_number: string | null
          timezone: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reactivate_worker_account: {
        Args: { p_reason: string; p_worker_id: string }
        Returns: {
          account_status: Database["public"]["Enums"]["account_status"]
          avatar_path: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reconcile_direct_transfer: {
        Args: { p_admin_note?: string; p_payout_id: string }
        Returns: {
          approved_minutes: number
          assignment_id: string
          bank_reference: string | null
          commission_amount_minor: number
          commission_rate_bps: number
          created_at: string
          currency: string
          due_at: string
          failure_code: string | null
          gross_amount_minor: number
          id: string
          organization_id: string
          organization_total_due_minor: number
          pay_run_id: string | null
          payout_account_id: string | null
          rate_minor: number
          reconciled_at: string | null
          reported_paid_at: string | null
          status: Database["public"]["Enums"]["payout_status"]
          updated_at: string
          worker_id: string
          worker_transfer_amount_minor: number
        }
        SetofOptions: {
          from: "*"
          to: "payouts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_worker_invoice_checkout: {
        Args: {
          p_checkout_session_id: string
          p_invoice_id: string
          p_stripe_customer_id: string
        }
        Returns: {
          approved_minutes: number
          assignment_id: string
          commission_amount_minor: number
          commission_rate_bps: number
          created_at: string
          currency: string
          due_at: string
          gross_amount_minor: number
          id: string
          invoice_number: string
          issued_at: string
          organization_id: string
          paid_at: string | null
          past_due_at: string | null
          provider_metadata: Json
          provider_name: string
          rate_minor: number
          status: Database["public"]["Enums"]["worker_invoice_status"]
          stripe_checkout_session_id: string | null
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          timesheet_id: string
          updated_at: string
          void_reason: string | null
          voided_at: string | null
          worker_id: string
        }
        SetofOptions: {
          from: "*"
          to: "worker_commission_invoices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reject_organization: {
        Args: { p_organization_id: string; p_reason: string }
        Returns: {
          address_line1: string | null
          address_line2: string | null
          billing_email: string | null
          city: string | null
          country_code: string
          created_at: string
          display_name: string
          id: string
          legal_name: string
          logo_path: string | null
          organization_type: Database["public"]["Enums"]["organization_type"]
          postal_code: string | null
          primary_contact_email: string | null
          primary_contact_name: string | null
          registration_number: string | null
          registration_number_normalized: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          slug: string
          status: Database["public"]["Enums"]["org_status"]
          status_reason: string | null
          submitted_at: string | null
          tax_vat_number: string | null
          timezone: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      report_organization_payment: {
        Args: {
          p_bank_reference: string
          p_evidence_storage_path?: string
          p_payout_id: string
        }
        Returns: {
          bank_reference: string
          created_at: string
          evidence_storage_path: string | null
          id: string
          organization_id: string
          payout_id: string
          reconciled_at: string | null
          reconciled_by: string | null
          reported_at: string
          reported_by: string
        }
        SetofOptions: {
          from: "*"
          to: "organization_payment_reports"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      review_timesheet: {
        Args: {
          p_approved_minutes?: number
          p_decision: string
          p_review_note?: string
          p_timesheet_id: string
        }
        Returns: {
          approved_minutes: number | null
          assignment_id: string
          break_minutes: number
          created_at: string
          id: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["timesheet_status"]
          submitted_at: string | null
          submitted_minutes: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "timesheets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      revoke_organization_invitation: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
      run_worker_commission_due_dates: { Args: never; Returns: Json }
      set_location_image_path: {
        Args: {
          p_location_id: string
          p_organization_id: string
          p_path: string
        }
        Returns: string
      }
      set_my_avatar_path: { Args: { p_path: string }; Returns: string }
      set_organization_display_name: {
        Args: { p_display_name: string; p_organization_id: string }
        Returns: {
          address_line1: string | null
          address_line2: string | null
          billing_email: string | null
          city: string | null
          country_code: string
          created_at: string
          display_name: string
          id: string
          legal_name: string
          logo_path: string | null
          organization_type: Database["public"]["Enums"]["organization_type"]
          postal_code: string | null
          primary_contact_email: string | null
          primary_contact_name: string | null
          registration_number: string | null
          registration_number_normalized: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          slug: string
          status: Database["public"]["Enums"]["org_status"]
          status_reason: string | null
          submitted_at: string | null
          tax_vat_number: string | null
          timezone: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_organization_logo_path: {
        Args: { p_organization_id: string; p_path: string }
        Returns: string
      }
      set_worker_verification: {
        Args: {
          p_reason?: string
          p_status: Database["public"]["Enums"]["verification_status"]
          p_worker_id: string
        }
        Returns: {
          bio: string | null
          created_at: string
          onboarding_status: Database["public"]["Enums"]["onboarding_status"]
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          worker_role: Database["public"]["Enums"]["worker_role"] | null
        }
        SetofOptions: {
          from: "*"
          to: "worker_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      shift_organization_id: { Args: { p_shift_id: string }; Returns: string }
      submit_credential_for_review: {
        Args: { p_credential_id: string }
        Returns: {
          created_at: string
          credential_type: string
          expires_at: string | null
          id: string
          rejection_reason: string | null
          status: Database["public"]["Enums"]["credential_status"]
          storage_path: string | null
          storage_paths: Json
          updated_at: string
          verified_at: string | null
          verified_by: string | null
          worker_id: string
        }
        SetofOptions: {
          from: "*"
          to: "credentials"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_organization_for_review: {
        Args: { p_organization_id: string }
        Returns: {
          address_line1: string | null
          address_line2: string | null
          billing_email: string | null
          city: string | null
          country_code: string
          created_at: string
          display_name: string
          id: string
          legal_name: string
          logo_path: string | null
          organization_type: Database["public"]["Enums"]["organization_type"]
          postal_code: string | null
          primary_contact_email: string | null
          primary_contact_name: string | null
          registration_number: string | null
          registration_number_normalized: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          slug: string
          status: Database["public"]["Enums"]["org_status"]
          status_reason: string | null
          submitted_at: string | null
          tax_vat_number: string | null
          timezone: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_payout_account: {
        Args: {
          p_account_holder_name: string
          p_country: string
          p_currency: string
          p_iban: string
          p_proof_mime_type: string
          p_proof_storage_path: string
        }
        Returns: {
          account_holder_name: string | null
          country: string
          created_at: string
          currency: string
          external_account_id: string | null
          id: string
          last_verified_at: string | null
          masked_iban: string
          proof_mime_type: string | null
          proof_storage_path: string | null
          provider: string
          rejection_reason: string | null
          status: Database["public"]["Enums"]["payout_account_status"]
          updated_at: string
          verified_at: string | null
          worker_id: string
        }
        SetofOptions: {
          from: "*"
          to: "payout_accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_worker_verification_package: {
        Args: Record<PropertyKey, never>
        Returns: {
          bio: string | null
          created_at: string
          onboarding_status: Database["public"]["Enums"]["onboarding_status"]
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          worker_role: Database["public"]["Enums"]["worker_role"] | null
        }
        SetofOptions: {
          from: "*"
          to: "worker_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_timesheet: {
        Args: { p_assignment_id: string }
        Returns: {
          approved_minutes: number | null
          assignment_id: string
          break_minutes: number
          created_at: string
          id: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["timesheet_status"]
          submitted_at: string | null
          submitted_minutes: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "timesheets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      suspend_organization: {
        Args: { p_organization_id: string; p_reason: string }
        Returns: {
          address_line1: string | null
          address_line2: string | null
          billing_email: string | null
          city: string | null
          country_code: string
          created_at: string
          display_name: string
          id: string
          legal_name: string
          logo_path: string | null
          organization_type: Database["public"]["Enums"]["organization_type"]
          postal_code: string | null
          primary_contact_email: string | null
          primary_contact_name: string | null
          registration_number: string | null
          registration_number_normalized: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          slug: string
          status: Database["public"]["Enums"]["org_status"]
          status_reason: string | null
          submitted_at: string | null
          tax_vat_number: string | null
          timezone: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      suspend_worker_account: {
        Args: { p_reason: string; p_worker_id: string }
        Returns: {
          account_status: Database["public"]["Enums"]["account_status"]
          avatar_path: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_organization_profile: {
        Args: {
          p_address_line1?: string
          p_address_line2?: string
          p_billing_email?: string
          p_city?: string
          p_country_code?: string
          p_display_name?: string
          p_legal_name?: string
          p_organization_id: string
          p_organization_type?: Database["public"]["Enums"]["organization_type"]
          p_postal_code?: string
          p_primary_contact_email?: string
          p_primary_contact_name?: string
          p_registration_number?: string
          p_tax_vat_number?: string
          p_timezone?: string
        }
        Returns: {
          address_line1: string | null
          address_line2: string | null
          billing_email: string | null
          city: string | null
          country_code: string
          created_at: string
          display_name: string
          id: string
          legal_name: string
          logo_path: string | null
          organization_type: Database["public"]["Enums"]["organization_type"]
          postal_code: string | null
          primary_contact_email: string | null
          primary_contact_name: string | null
          registration_number: string | null
          registration_number_normalized: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          slug: string
          status: Database["public"]["Enums"]["org_status"]
          status_reason: string | null
          submitted_at: string | null
          tax_vat_number: string | null
          timezone: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      verification_application_dashboard_counts: {
        Args: never
        Returns: {
          awaiting_documents: number
          corrections_required: number
          payout_approval_pending: number
          ready_for_final_approval: number
          ready_for_review: number
          suspended: number
          under_review: number
        }[]
      }
      verify_credential: {
        Args: {
          p_credential_id: string
          p_decision: string
          p_rejection_reason?: string
        }
        Returns: {
          created_at: string
          credential_type: string
          expires_at: string | null
          id: string
          rejection_reason: string | null
          status: Database["public"]["Enums"]["credential_status"]
          storage_path: string | null
          storage_paths: Json
          updated_at: string
          verified_at: string | null
          verified_by: string | null
          worker_id: string
        }
        SetofOptions: {
          from: "*"
          to: "credentials"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      verify_payout_account: {
        Args: {
          p_decision: string
          p_payout_account_id: string
          p_reason_code?: string
        }
        Returns: {
          account_holder_name: string | null
          country: string
          created_at: string
          currency: string
          external_account_id: string | null
          id: string
          last_verified_at: string | null
          masked_iban: string
          proof_mime_type: string | null
          proof_storage_path: string | null
          provider: string
          rejection_reason: string | null
          status: Database["public"]["Enums"]["payout_account_status"]
          updated_at: string
          verified_at: string | null
          worker_id: string
        }
        SetofOptions: {
          from: "*"
          to: "payout_accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      void_worker_commission_invoice: {
        Args: { p_invoice_id: string; p_reason: string }
        Returns: Json
      }
      worker_application_last_activity: {
        Args: { p_worker_id: string }
        Returns: string
      }
      worker_assigned_to_org_member: {
        Args: { p_worker_id: string }
        Returns: boolean
      }
      worker_credential_requirements: {
        Args: { p_worker_role: Database["public"]["Enums"]["worker_role"] }
        Returns: {
          credential_type: string
          is_required: boolean
          sort_order: number
        }[]
      }
      worker_has_assignment_on_shift: {
        Args: { p_shift_id: string }
        Returns: boolean
      }
      worker_has_overdue_commission: {
        Args: { p_worker_id: string }
        Returns: boolean
      }
      worker_has_satisfied_payout_account: {
        Args: { p_worker_id: string }
        Returns: boolean
      }
      worker_is_ready_for_final_approval: {
        Args: { p_worker_id: string }
        Returns: boolean
      }
      worker_required_credential_types: {
        Args: { p_worker_role: Database["public"]["Enums"]["worker_role"] }
        Returns: string[]
      }
      worker_support_view: {
        Args: never
        Returns: {
          account_status: Database["public"]["Enums"]["account_status"]
          created_at: string
          full_name: string
          onboarding_status: Database["public"]["Enums"]["onboarding_status"]
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          worker_role: Database["public"]["Enums"]["worker_role"]
        }[]
      }
      worker_verification_application_status: {
        Args: { p_worker_id: string }
        Returns: string
      }
    }
    Enums: {
      account_status: "active" | "suspended" | "deleted"
      assignment_status:
        | "accepted"
        | "withdrawn"
        | "cancelled"
        | "checked_in"
        | "checked_out"
        | "submitted"
        | "approved"
        | "rejected"
        | "no_show"
      commission_payer_type: "organization" | "worker"
      commission_status:
        | "pending"
        | "invoiced"
        | "paid"
        | "overdue"
        | "disputed"
        | "waived"
      credential_status:
        | "pending"
        | "under_review"
        | "verified"
        | "rejected"
        | "expired"
        | "suspended"
      membership_status: "invited" | "active" | "revoked"
      onboarding_status: "not_started" | "in_progress" | "completed"
      org_role: "org_admin" | "org_scheduler" | "org_billing"
      org_status:
        | "pending"
        | "active"
        | "suspended"
        | "closed"
        | "under_review"
        | "rejected"
      organization_type: "hospital" | "clinic" | "nursing_home" | "other"
      pay_run_status: "draft" | "approved" | "released" | "cancelled"
      payout_account_status:
        | "pending"
        | "verified"
        | "failed"
        | "rejected"
        | "expired"
        | "suspended"
      payout_status:
        | "approved"
        | "payment_instruction_ready"
        | "reported_paid"
        | "reconciliation_pending"
        | "reconciled"
        | "overdue"
        | "disputed"
        | "failed"
        | "cancelled"
      platform_admin_role:
        | "platform_support"
        | "platform_verifier"
        | "platform_finance"
        | "platform_super_admin"
      shift_status:
        | "draft"
        | "published"
        | "filled"
        | "in_progress"
        | "awaiting_approval"
        | "completed"
        | "cancelled"
        | "disputed"
      timesheet_status:
        | "draft"
        | "submitted"
        | "approved"
        | "rejected"
        | "corrected"
      verification_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "verified"
        | "rejected"
        | "suspended"
        | "expired"
      worker_billing_standing: "good_standing" | "restricted"
      worker_invoice_status:
        | "draft"
        | "open"
        | "payment_processing"
        | "paid"
        | "past_due"
        | "void"
        | "uncollectible"
      worker_role: "registered_nurse" | "ward_assistant"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          lifecycle_configuration: Json | null
          lifecycle_configuration_generation: string | null
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
          versioning_status: string
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          lifecycle_configuration?: Json | null
          lifecycle_configuration_generation?: string | null
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
          versioning_status?: string
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          lifecycle_configuration?: Json | null
          lifecycle_configuration_generation?: string | null
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
          versioning_status?: string
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          archived_at: string | null
          bucket_id: string | null
          created_at: string | null
          id: string
          is_delete_marker: boolean
          is_versioned: boolean
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          archived_at?: string | null
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          is_delete_marker?: boolean
          is_versioned?: boolean
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          archived_at?: string | null
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          is_delete_marker?: boolean
          is_versioned?: boolean
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: { delete_markers?: string; noncurrent_versions?: string }
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
          raw_prefix_param?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delete_markers?: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          next_token_archived_at?: string
          next_token_version?: string
          noncurrent_versions?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          archived_at: string
          created_at: string
          id: string
          is_delete_marker: boolean
          is_versioned: boolean
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
          version: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          delete_markers?: string
          levels?: number
          limits?: number
          noncurrent_versions?: string
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          archived_at: string
          created_at: string
          id: string
          is_delete_marker: boolean
          is_versioned: boolean
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
          version: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          delete_markers?: string
          noncurrent_versions?: string
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
          p_start_after_version?: string
        }
        Returns: {
          archived_at: string
          created_at: string
          id: string
          is_delete_marker: boolean
          is_versioned: boolean
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
          version: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          delete_markers?: string
          levels?: number
          limits?: number
          noncurrent_versions?: string
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
          start_after_archived_at?: string
          start_after_is_continuation?: boolean
          start_after_version?: string
        }
        Returns: {
          archived_at: string
          created_at: string
          id: string
          is_delete_marker: boolean
          is_versioned: boolean
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
          version: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_status: ["active", "suspended", "deleted"],
      assignment_status: [
        "accepted",
        "withdrawn",
        "cancelled",
        "checked_in",
        "checked_out",
        "submitted",
        "approved",
        "rejected",
        "no_show",
      ],
      commission_payer_type: ["organization", "worker"],
      commission_status: [
        "pending",
        "invoiced",
        "paid",
        "overdue",
        "disputed",
        "waived",
      ],
      credential_status: [
        "pending",
        "under_review",
        "verified",
        "rejected",
        "expired",
        "suspended",
      ],
      membership_status: ["invited", "active", "revoked"],
      onboarding_status: ["not_started", "in_progress", "completed"],
      org_role: ["org_admin", "org_scheduler", "org_billing"],
      org_status: [
        "pending",
        "active",
        "suspended",
        "closed",
        "under_review",
        "rejected",
      ],
      organization_type: ["hospital", "clinic", "nursing_home", "other"],
      pay_run_status: ["draft", "approved", "released", "cancelled"],
      payout_account_status: [
        "pending",
        "verified",
        "failed",
        "rejected",
        "expired",
        "suspended",
      ],
      payout_status: [
        "approved",
        "payment_instruction_ready",
        "reported_paid",
        "reconciliation_pending",
        "reconciled",
        "overdue",
        "disputed",
        "failed",
        "cancelled",
      ],
      platform_admin_role: [
        "platform_support",
        "platform_verifier",
        "platform_finance",
        "platform_super_admin",
      ],
      shift_status: [
        "draft",
        "published",
        "filled",
        "in_progress",
        "awaiting_approval",
        "completed",
        "cancelled",
        "disputed",
      ],
      timesheet_status: [
        "draft",
        "submitted",
        "approved",
        "rejected",
        "corrected",
      ],
      verification_status: [
        "draft",
        "submitted",
        "under_review",
        "verified",
        "rejected",
        "suspended",
        "expired",
      ],
      worker_billing_standing: ["good_standing", "restricted"],
      worker_invoice_status: [
        "draft",
        "open",
        "payment_processing",
        "paid",
        "past_due",
        "void",
        "uncollectible",
      ],
      worker_role: ["registered_nurse", "ward_assistant"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const
