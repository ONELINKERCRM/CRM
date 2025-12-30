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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          annual_revenue: number | null
          city: string | null
          country: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          email: string | null
          employee_count: number | null
          id: string
          industry: string | null
          is_deleted: boolean
          metadata: Json | null
          name: string
          organization_id: string
          owner_id: string | null
          phone: string | null
          postal_code: string | null
          source: string | null
          state: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          annual_revenue?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          email?: string | null
          employee_count?: number | null
          id?: string
          industry?: string | null
          is_deleted?: boolean
          metadata?: Json | null
          name: string
          organization_id: string
          owner_id?: string | null
          phone?: string | null
          postal_code?: string | null
          source?: string | null
          state?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          annual_revenue?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          email?: string | null
          employee_count?: number | null
          id?: string
          industry?: string | null
          is_deleted?: boolean
          metadata?: Json | null
          name?: string
          organization_id?: string
          owner_id?: string | null
          phone?: string | null
          postal_code?: string | null
          source?: string | null
          state?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      activities: {
        Row: {
          account_id: string | null
          completed_at: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          lead_id: string | null
          organization_id: string
          outcome: string | null
          owner_id: string | null
          related_to_id: string | null
          related_to_type: Database["public"]["Enums"]["entity_type"] | null
          scheduled_at: string | null
          subject: string
          type: Database["public"]["Enums"]["activity_type"]
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          lead_id?: string | null
          organization_id: string
          outcome?: string | null
          owner_id?: string | null
          related_to_id?: string | null
          related_to_type?: Database["public"]["Enums"]["entity_type"] | null
          scheduled_at?: string | null
          subject: string
          type: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          lead_id?: string | null
          organization_id?: string
          outcome?: string | null
          owner_id?: string | null
          related_to_id?: string | null
          related_to_type?: Database["public"]["Enums"]["entity_type"] | null
          scheduled_at?: string | null
          subject?: string
          type?: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_load: {
        Row: {
          agent_id: string
          average_response_time_hours: number | null
          company_id: string
          conversion_rate: number | null
          current_leads_count: number | null
          id: string
          is_available: boolean | null
          last_assignment_at: string | null
          max_leads_capacity: number | null
          pending_followups_count: number | null
          total_assignments_today: number | null
          total_assignments_week: number | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          average_response_time_hours?: number | null
          company_id: string
          conversion_rate?: number | null
          current_leads_count?: number | null
          id?: string
          is_available?: boolean | null
          last_assignment_at?: string | null
          max_leads_capacity?: number | null
          pending_followups_count?: number | null
          total_assignments_today?: number | null
          total_assignments_week?: number | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          average_response_time_hours?: number | null
          company_id?: string
          conversion_rate?: number | null
          current_leads_count?: number | null
          id?: string
          is_available?: boolean | null
          last_assignment_at?: string | null
          max_leads_capacity?: number | null
          pending_followups_count?: number | null
          total_assignments_today?: number | null
          total_assignments_week?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_load_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_load_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          email: string
          id: string
          invitation_sent_at: string | null
          invitation_token: string | null
          name: string
          permissions: Json
          phone: string | null
          role: Database["public"]["Enums"]["agent_role"]
          status: Database["public"]["Enums"]["agent_status"]
          team_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email: string
          id?: string
          invitation_sent_at?: string | null
          invitation_token?: string | null
          name: string
          permissions?: Json
          phone?: string | null
          role?: Database["public"]["Enums"]["agent_role"]
          status?: Database["public"]["Enums"]["agent_status"]
          team_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string
          id?: string
          invitation_sent_at?: string | null
          invitation_token?: string | null
          name?: string
          permissions?: Json
          phone?: string | null
          role?: Database["public"]["Enums"]["agent_role"]
          status?: Database["public"]["Enums"]["agent_status"]
          team_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          api_key_hash: string
          api_key_prefix: string
          company_id: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          key_name: string
          last_used_at: string | null
          permissions: Json | null
          status: string
        }
        Insert: {
          api_key_hash: string
          api_key_prefix: string
          company_id: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_name: string
          last_used_at?: string | null
          permissions?: Json | null
          status?: string
        }
        Update: {
          api_key_hash?: string
          api_key_prefix?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_name?: string
          last_used_at?: string | null
          permissions?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_notifications: {
        Row: {
          agent_id: string
          assignment_log_id: string | null
          company_id: string
          created_at: string
          email_sent: boolean | null
          email_sent_at: string | null
          id: string
          is_read: boolean | null
          lead_id: string
          message: string | null
          notification_type: string | null
          push_sent: boolean | null
          push_sent_at: string | null
          read_at: string | null
          title: string
        }
        Insert: {
          agent_id: string
          assignment_log_id?: string | null
          company_id: string
          created_at?: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          id?: string
          is_read?: boolean | null
          lead_id: string
          message?: string | null
          notification_type?: string | null
          push_sent?: boolean | null
          push_sent_at?: string | null
          read_at?: string | null
          title: string
        }
        Update: {
          agent_id?: string
          assignment_log_id?: string | null
          company_id?: string
          created_at?: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          id?: string
          is_read?: boolean | null
          lead_id?: string
          message?: string | null
          notification_type?: string | null
          push_sent?: boolean | null
          push_sent_at?: string | null
          read_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_notifications_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_notifications_assignment_log_id_fkey"
            columns: ["assignment_log_id"]
            isOneToOne: false
            referencedRelation: "lead_assignment_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_notifications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          organization_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          organization_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          organization_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_reassignment_rules: {
        Row: {
          apply_to_stages: string[] | null
          company_id: string
          created_at: string
          created_by: string | null
          days_without_contact: number
          id: string
          is_active: boolean | null
          name: string
          reassign_to_agent_id: string | null
          reassign_to_pool_id: string | null
          updated_at: string
          use_round_robin: boolean | null
        }
        Insert: {
          apply_to_stages?: string[] | null
          company_id: string
          created_at?: string
          created_by?: string | null
          days_without_contact?: number
          id?: string
          is_active?: boolean | null
          name: string
          reassign_to_agent_id?: string | null
          reassign_to_pool_id?: string | null
          updated_at?: string
          use_round_robin?: boolean | null
        }
        Update: {
          apply_to_stages?: string[] | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          days_without_contact?: number
          id?: string
          is_active?: boolean | null
          name?: string
          reassign_to_agent_id?: string | null
          reassign_to_pool_id?: string | null
          updated_at?: string
          use_round_robin?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "auto_reassignment_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_reassignment_rules_reassign_to_agent_id_fkey"
            columns: ["reassign_to_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_reassignment_rules_reassign_to_pool_id_fkey"
            columns: ["reassign_to_pool_id"]
            isOneToOne: false
            referencedRelation: "lead_pools"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_analytics: {
        Row: {
          average_delivery_time_seconds: number | null
          campaign_id: string
          click_rate: number | null
          company_id: string
          created_at: string | null
          delivery_rate: number | null
          failure_rate: number | null
          id: string
          open_rate: number | null
          read_rate: number | null
          total_bounced: number | null
          total_clicked: number | null
          total_delivered: number | null
          total_failed: number | null
          total_queued: number | null
          total_read: number | null
          total_recipients: number | null
          total_sending: number | null
          total_sent: number | null
          total_skipped: number | null
          total_unsubscribed: number | null
          updated_at: string | null
        }
        Insert: {
          average_delivery_time_seconds?: number | null
          campaign_id: string
          click_rate?: number | null
          company_id: string
          created_at?: string | null
          delivery_rate?: number | null
          failure_rate?: number | null
          id?: string
          open_rate?: number | null
          read_rate?: number | null
          total_bounced?: number | null
          total_clicked?: number | null
          total_delivered?: number | null
          total_failed?: number | null
          total_queued?: number | null
          total_read?: number | null
          total_recipients?: number | null
          total_sending?: number | null
          total_sent?: number | null
          total_skipped?: number | null
          total_unsubscribed?: number | null
          updated_at?: string | null
        }
        Update: {
          average_delivery_time_seconds?: number | null
          campaign_id?: string
          click_rate?: number | null
          company_id?: string
          created_at?: string | null
          delivery_rate?: number | null
          failure_rate?: number | null
          id?: string
          open_rate?: number | null
          read_rate?: number | null
          total_bounced?: number | null
          total_clicked?: number | null
          total_delivered?: number | null
          total_failed?: number | null
          total_queued?: number | null
          total_read?: number | null
          total_recipients?: number | null
          total_sending?: number | null
          total_sent?: number | null
          total_skipped?: number | null
          total_unsubscribed?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_analytics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_analytics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_import_errors: {
        Row: {
          campaign_id: string
          company_id: string
          created_at: string | null
          error_message: string
          error_type: string
          id: string
          lead_data: Json
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          row_number: number | null
        }
        Insert: {
          campaign_id: string
          company_id: string
          created_at?: string | null
          error_message: string
          error_type: string
          id?: string
          lead_data: Json
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          row_number?: number | null
        }
        Update: {
          campaign_id?: string
          company_id?: string
          created_at?: string | null
          error_message?: string
          error_type?: string
          id?: string
          lead_data?: Json
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          row_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_import_errors_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_import_errors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_logs: {
        Row: {
          action: string
          action_type: string | null
          campaign_id: string
          company_id: string
          created_at: string
          details: Json | null
          id: string
          performed_by: string | null
          recipient_id: string | null
        }
        Insert: {
          action: string
          action_type?: string | null
          campaign_id: string
          company_id: string
          created_at?: string
          details?: Json | null
          id?: string
          performed_by?: string | null
          recipient_id?: string | null
        }
        Update: {
          action?: string
          action_type?: string | null
          campaign_id?: string
          company_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          performed_by?: string | null
          recipient_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_logs_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "campaign_recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_messages: {
        Row: {
          campaign_id: string
          clicked_at: string | null
          company_id: string
          content: string | null
          created_at: string
          delivered_at: string | null
          error_message: string | null
          external_id: string | null
          id: string
          lead_id: string | null
          opened_at: string | null
          recipient_email: string | null
          recipient_phone: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          clicked_at?: string | null
          company_id: string
          content?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          lead_id?: string | null
          opened_at?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          clicked_at?: string | null
          company_id?: string
          content?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          lead_id?: string | null
          opened_at?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_recipients: {
        Row: {
          campaign_id: string
          company_id: string
          consent_checked: boolean | null
          created_at: string | null
          delivered_at: string | null
          delivery_status: string
          error_code: string | null
          error_message: string | null
          failed_at: string | null
          id: string
          imported_from: string
          is_duplicate: boolean | null
          lead_id: string | null
          meta_message_id: string | null
          name: string | null
          phone_number: string
          queued_at: string | null
          read_at: string | null
          recipient_email: string | null
          recipient_name: string | null
          retry_count: number | null
          sent_at: string | null
          template_variables: Json | null
          updated_at: string | null
        }
        Insert: {
          campaign_id: string
          company_id: string
          consent_checked?: boolean | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_status?: string
          error_code?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          imported_from?: string
          is_duplicate?: boolean | null
          lead_id?: string | null
          meta_message_id?: string | null
          name?: string | null
          phone_number: string
          queued_at?: string | null
          read_at?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          retry_count?: number | null
          sent_at?: string | null
          template_variables?: Json | null
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string
          company_id?: string
          consent_checked?: boolean | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_status?: string
          error_code?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          imported_from?: string
          is_duplicate?: boolean | null
          lead_id?: string | null
          meta_message_id?: string | null
          name?: string | null
          phone_number?: string
          queued_at?: string | null
          read_at?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          retry_count?: number | null
          sent_at?: string | null
          template_variables?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_schedules: {
        Row: {
          campaign_id: string
          company_id: string
          created_at: string | null
          error_message: string | null
          executed_at: string | null
          id: string
          scheduled_time: string
          status: string | null
          timezone: string | null
        }
        Insert: {
          campaign_id: string
          company_id: string
          created_at?: string | null
          error_message?: string | null
          executed_at?: string | null
          id?: string
          scheduled_time: string
          status?: string | null
          timezone?: string | null
        }
        Update: {
          campaign_id?: string
          company_id?: string
          created_at?: string | null
          error_message?: string | null
          executed_at?: string | null
          id?: string
          scheduled_time?: string
          status?: string | null
          timezone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_schedules_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          audience_count: number | null
          audience_filters: Json | null
          audience_type: string | null
          bounced_count: number | null
          campaign_type: string
          channel: string
          clicked_count: number | null
          company_id: string
          completed_at: string | null
          connection_id: string | null
          consent_required: boolean | null
          created_at: string
          created_by: string | null
          delivered_count: number | null
          description: string | null
          failed_count: number | null
          id: string
          language: string | null
          marketing_template_id: string | null
          max_retries: number | null
          name: string
          opened_count: number | null
          phone_number_id: string | null
          priority: number | null
          rate_limit_per_second: number | null
          retry_count: number | null
          scheduled_at: string | null
          sent_count: number | null
          started_at: string | null
          status: string
          template_content: Json | null
          template_id: string | null
          timezone: string | null
          total_recipients: number | null
          updated_at: string
          whatsapp_template_id: string | null
        }
        Insert: {
          audience_count?: number | null
          audience_filters?: Json | null
          audience_type?: string | null
          bounced_count?: number | null
          campaign_type: string
          channel: string
          clicked_count?: number | null
          company_id: string
          completed_at?: string | null
          connection_id?: string | null
          consent_required?: boolean | null
          created_at?: string
          created_by?: string | null
          delivered_count?: number | null
          description?: string | null
          failed_count?: number | null
          id?: string
          language?: string | null
          marketing_template_id?: string | null
          max_retries?: number | null
          name: string
          opened_count?: number | null
          phone_number_id?: string | null
          priority?: number | null
          rate_limit_per_second?: number | null
          retry_count?: number | null
          scheduled_at?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string
          template_content?: Json | null
          template_id?: string | null
          timezone?: string | null
          total_recipients?: number | null
          updated_at?: string
          whatsapp_template_id?: string | null
        }
        Update: {
          audience_count?: number | null
          audience_filters?: Json | null
          audience_type?: string | null
          bounced_count?: number | null
          campaign_type?: string
          channel?: string
          clicked_count?: number | null
          company_id?: string
          completed_at?: string | null
          connection_id?: string | null
          consent_required?: boolean | null
          created_at?: string
          created_by?: string | null
          delivered_count?: number | null
          description?: string | null
          failed_count?: number | null
          id?: string
          language?: string | null
          marketing_template_id?: string | null
          max_retries?: number | null
          name?: string
          opened_count?: number | null
          phone_number_id?: string | null
          priority?: number | null
          rate_limit_per_second?: number | null
          retry_count?: number | null
          scheduled_at?: string | null
          sent_count?: number | null
          started_at?: string | null
          status?: string
          template_content?: Json | null
          template_id?: string | null
          timezone?: string | null
          total_recipients?: number | null
          updated_at?: string
          whatsapp_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "marketing_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_marketing_template_id_fkey"
            columns: ["marketing_template_id"]
            isOneToOne: false
            referencedRelation: "marketing_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_phone_number_id_fkey"
            columns: ["phone_number_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_phone_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_whatsapp_template_id_fkey"
            columns: ["whatsapp_template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_analytics: {
        Row: {
          avg_response_time_ms: number | null
          chatbot_id: string
          company_id: string
          created_at: string | null
          date: string
          id: string
          messages_delivered: number | null
          messages_failed: number | null
          messages_read: number | null
          messages_received: number | null
          messages_sent: number | null
          new_leads_created: number | null
          unique_leads: number | null
        }
        Insert: {
          avg_response_time_ms?: number | null
          chatbot_id: string
          company_id: string
          created_at?: string | null
          date?: string
          id?: string
          messages_delivered?: number | null
          messages_failed?: number | null
          messages_read?: number | null
          messages_received?: number | null
          messages_sent?: number | null
          new_leads_created?: number | null
          unique_leads?: number | null
        }
        Update: {
          avg_response_time_ms?: number | null
          chatbot_id?: string
          company_id?: string
          created_at?: string | null
          date?: string
          id?: string
          messages_delivered?: number | null
          messages_failed?: number | null
          messages_read?: number | null
          messages_received?: number | null
          messages_sent?: number | null
          new_leads_created?: number | null
          unique_leads?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_analytics_chatbot_id_fkey"
            columns: ["chatbot_id"]
            isOneToOne: false
            referencedRelation: "chatbots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_analytics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_interactions: {
        Row: {
          chatbot_id: string
          company_id: string
          created_at: string | null
          direction: string
          error_message: string | null
          id: string
          lead_id: string | null
          message_content: string | null
          message_data: Json | null
          message_type: string | null
          meta_message_id: string | null
          phone_number: string
          response_time_ms: number | null
          status: string | null
          trigger_id: string | null
        }
        Insert: {
          chatbot_id: string
          company_id: string
          created_at?: string | null
          direction: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          message_content?: string | null
          message_data?: Json | null
          message_type?: string | null
          meta_message_id?: string | null
          phone_number: string
          response_time_ms?: number | null
          status?: string | null
          trigger_id?: string | null
        }
        Update: {
          chatbot_id?: string
          company_id?: string
          created_at?: string | null
          direction?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          message_content?: string | null
          message_data?: Json | null
          message_type?: string | null
          meta_message_id?: string | null
          phone_number?: string
          response_time_ms?: number | null
          status?: string | null
          trigger_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_interactions_chatbot_id_fkey"
            columns: ["chatbot_id"]
            isOneToOne: false
            referencedRelation: "chatbots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_interactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_interactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_interactions_trigger_id_fkey"
            columns: ["trigger_id"]
            isOneToOne: false
            referencedRelation: "chatbot_triggers"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_logs: {
        Row: {
          action_type: string
          chatbot_id: string | null
          company_id: string
          created_at: string | null
          description: string
          details: Json | null
          id: string
          performed_by: string | null
        }
        Insert: {
          action_type: string
          chatbot_id?: string | null
          company_id: string
          created_at?: string | null
          description: string
          details?: Json | null
          id?: string
          performed_by?: string | null
        }
        Update: {
          action_type?: string
          chatbot_id?: string | null
          company_id?: string
          created_at?: string | null
          description?: string
          details?: Json | null
          id?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_logs_chatbot_id_fkey"
            columns: ["chatbot_id"]
            isOneToOne: false
            referencedRelation: "chatbots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_messages: {
        Row: {
          chatbot_id: string
          company_id: string
          condition_rules: Json | null
          content: Json
          created_at: string | null
          delay_seconds: number | null
          id: string
          is_active: boolean | null
          message_type: string
          sequence_order: number
          updated_at: string | null
        }
        Insert: {
          chatbot_id: string
          company_id: string
          condition_rules?: Json | null
          content: Json
          created_at?: string | null
          delay_seconds?: number | null
          id?: string
          is_active?: boolean | null
          message_type?: string
          sequence_order?: number
          updated_at?: string | null
        }
        Update: {
          chatbot_id?: string
          company_id?: string
          condition_rules?: Json | null
          content?: Json
          created_at?: string | null
          delay_seconds?: number | null
          id?: string
          is_active?: boolean | null
          message_type?: string
          sequence_order?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_messages_chatbot_id_fkey"
            columns: ["chatbot_id"]
            isOneToOne: false
            referencedRelation: "chatbots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_sessions: {
        Row: {
          awaiting_input: boolean | null
          chatbot_id: string
          company_id: string
          created_at: string | null
          current_sequence_step: number | null
          expires_at: string | null
          id: string
          last_message_at: string | null
          lead_id: string | null
          phone_number: string
          session_state: Json | null
        }
        Insert: {
          awaiting_input?: boolean | null
          chatbot_id: string
          company_id: string
          created_at?: string | null
          current_sequence_step?: number | null
          expires_at?: string | null
          id?: string
          last_message_at?: string | null
          lead_id?: string | null
          phone_number: string
          session_state?: Json | null
        }
        Update: {
          awaiting_input?: boolean | null
          chatbot_id?: string
          company_id?: string
          created_at?: string | null
          current_sequence_step?: number | null
          expires_at?: string | null
          id?: string
          last_message_at?: string | null
          lead_id?: string | null
          phone_number?: string
          session_state?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_sessions_chatbot_id_fkey"
            columns: ["chatbot_id"]
            isOneToOne: false
            referencedRelation: "chatbots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_sessions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_triggers: {
        Row: {
          chatbot_id: string
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          keywords: string[] | null
          priority: number | null
          response_action: string | null
          response_message_id: string | null
          trigger_type: string
          trigger_value: string | null
          updated_at: string | null
        }
        Insert: {
          chatbot_id: string
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          priority?: number | null
          response_action?: string | null
          response_message_id?: string | null
          trigger_type: string
          trigger_value?: string | null
          updated_at?: string | null
        }
        Update: {
          chatbot_id?: string
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          priority?: number | null
          response_action?: string | null
          response_message_id?: string | null
          trigger_type?: string
          trigger_value?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_triggers_chatbot_id_fkey"
            columns: ["chatbot_id"]
            isOneToOne: false
            referencedRelation: "chatbots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_triggers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_triggers_response_message_id_fkey"
            columns: ["response_message_id"]
            isOneToOne: false
            referencedRelation: "chatbot_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbots: {
        Row: {
          assigned_lead_group_id: string | null
          auto_create_leads: boolean | null
          business_hours: Json | null
          business_hours_only: boolean | null
          company_id: string | null
          created_at: string
          created_by: string | null
          deployed_at: string | null
          description: string | null
          fallback_message: string | null
          id: string
          is_active: boolean | null
          llm_api_key_encrypted: string | null
          llm_model: string
          llm_provider: string
          max_tokens: number | null
          name: string
          qualification_questions: Json | null
          status: string | null
          system_prompt: string | null
          temperature: number | null
          updated_at: string
          welcome_message: string | null
          whatsapp_connection_id: string | null
          whatsapp_phone_number_id: string | null
        }
        Insert: {
          assigned_lead_group_id?: string | null
          auto_create_leads?: boolean | null
          business_hours?: Json | null
          business_hours_only?: boolean | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          deployed_at?: string | null
          description?: string | null
          fallback_message?: string | null
          id?: string
          is_active?: boolean | null
          llm_api_key_encrypted?: string | null
          llm_model?: string
          llm_provider?: string
          max_tokens?: number | null
          name: string
          qualification_questions?: Json | null
          status?: string | null
          system_prompt?: string | null
          temperature?: number | null
          updated_at?: string
          welcome_message?: string | null
          whatsapp_connection_id?: string | null
          whatsapp_phone_number_id?: string | null
        }
        Update: {
          assigned_lead_group_id?: string | null
          auto_create_leads?: boolean | null
          business_hours?: Json | null
          business_hours_only?: boolean | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          deployed_at?: string | null
          description?: string | null
          fallback_message?: string | null
          id?: string
          is_active?: boolean | null
          llm_api_key_encrypted?: string | null
          llm_model?: string
          llm_provider?: string
          max_tokens?: number | null
          name?: string
          qualification_questions?: Json | null
          status?: string | null
          system_prompt?: string | null
          temperature?: number | null
          updated_at?: string
          welcome_message?: string | null
          whatsapp_connection_id?: string | null
          whatsapp_phone_number_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbots_whatsapp_connection_id_fkey"
            columns: ["whatsapp_connection_id"]
            isOneToOne: false
            referencedRelation: "marketing_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbots_whatsapp_phone_number_id_fkey"
            columns: ["whatsapp_phone_number_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_phone_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          country: string
          created_at: string
          created_by: string | null
          currency: string
          default_language: string
          default_timezone: string
          id: string
          industry: string
          lead_sources: string[] | null
          name: string
          updated_at: string
        }
        Insert: {
          country: string
          created_at?: string
          created_by?: string | null
          currency?: string
          default_language?: string
          default_timezone?: string
          id?: string
          industry: string
          lead_sources?: string[] | null
          name: string
          updated_at?: string
        }
        Update: {
          country?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          default_language?: string
          default_timezone?: string
          id?: string
          industry?: string
          lead_sources?: string[] | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          assignment_method: string | null
          auto_assign_leads: boolean | null
          company_id: string
          created_at: string
          default_lead_stage: string | null
          default_listing_status: string | null
          email_signature: string | null
          id: string
          logo_url: string | null
          new_lead_animation: string | null
          new_lead_background_color: string | null
          new_lead_badge_color: string | null
          notification_settings: Json | null
          pdf_template: string | null
          primary_color: string | null
          secondary_color: string | null
          updated_at: string
          whatsapp_default_message: string | null
          working_hours: Json | null
        }
        Insert: {
          assignment_method?: string | null
          auto_assign_leads?: boolean | null
          company_id: string
          created_at?: string
          default_lead_stage?: string | null
          default_listing_status?: string | null
          email_signature?: string | null
          id?: string
          logo_url?: string | null
          new_lead_animation?: string | null
          new_lead_background_color?: string | null
          new_lead_badge_color?: string | null
          notification_settings?: Json | null
          pdf_template?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
          whatsapp_default_message?: string | null
          working_hours?: Json | null
        }
        Update: {
          assignment_method?: string | null
          auto_assign_leads?: boolean | null
          company_id?: string
          created_at?: string
          default_lead_stage?: string | null
          default_listing_status?: string | null
          email_signature?: string | null
          id?: string
          logo_url?: string | null
          new_lead_animation?: string | null
          new_lead_background_color?: string | null
          new_lead_badge_color?: string | null
          notification_settings?: Json | null
          pdf_template?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
          whatsapp_default_message?: string | null
          working_hours?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_subscriptions: {
        Row: {
          billing_cycle: string
          company_id: string
          created_at: string
          current_period_end: string | null
          current_period_start: string
          id: string
          plan_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          company_id: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          id?: string
          plan_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          company_id?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string
          id?: string
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "pricing_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_health_checks: {
        Row: {
          check_type: string
          company_id: string
          connection_id: string | null
          created_at: string | null
          details: Json | null
          error_message: string | null
          id: string
          response_time_ms: number | null
          status: string
        }
        Insert: {
          check_type: string
          company_id: string
          connection_id?: string | null
          created_at?: string | null
          details?: Json | null
          error_message?: string | null
          id?: string
          response_time_ms?: number | null
          status: string
        }
        Update: {
          check_type?: string
          company_id?: string
          connection_id?: string | null
          created_at?: string | null
          details?: Json | null
          error_message?: string | null
          id?: string
          response_time_ms?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "connection_health_checks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_health_checks_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "marketing_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_logs: {
        Row: {
          action_type: string
          company_id: string
          connection_id: string | null
          created_at: string | null
          description: string
          details: Json | null
          id: string
          ip_address: string | null
          performed_by: string | null
          user_agent: string | null
        }
        Insert: {
          action_type: string
          company_id: string
          connection_id?: string | null
          created_at?: string | null
          description: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          performed_by?: string | null
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          company_id?: string
          connection_id?: string | null
          created_at?: string | null
          description?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          performed_by?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connection_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "marketing_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_logs: {
        Row: {
          action: string
          channel: string
          company_id: string
          created_at: string | null
          id: string
          ip_address: string | null
          lead_id: string
          source: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          channel: string
          company_id: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          lead_id: string
          source?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          channel?: string
          company_id?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          lead_id?: string
          source?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          account_id: string | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          country: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          department: string | null
          description: string | null
          email: string | null
          first_name: string
          id: string
          is_deleted: boolean
          job_title: string | null
          last_name: string | null
          linkedin_url: string | null
          metadata: Json | null
          mobile: string | null
          organization_id: string
          owner_id: string | null
          phone: string | null
          postal_code: string | null
          source: string | null
          state: string | null
          twitter_url: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          department?: string | null
          description?: string | null
          email?: string | null
          first_name: string
          id?: string
          is_deleted?: boolean
          job_title?: string | null
          last_name?: string | null
          linkedin_url?: string | null
          metadata?: Json | null
          mobile?: string | null
          organization_id: string
          owner_id?: string | null
          phone?: string | null
          postal_code?: string | null
          source?: string | null
          state?: string | null
          twitter_url?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          department?: string | null
          description?: string | null
          email?: string | null
          first_name?: string
          id?: string
          is_deleted?: boolean
          job_title?: string | null
          last_name?: string | null
          linkedin_url?: string | null
          metadata?: Json | null
          mobile?: string | null
          organization_id?: string
          owner_id?: string | null
          phone?: string | null
          postal_code?: string | null
          source?: string | null
          state?: string | null
          twitter_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          address_line1: string | null
          city: string | null
          company_name: string | null
          converted_account_id: string | null
          converted_at: string | null
          converted_contact_id: string | null
          converted_deal_id: string | null
          country: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          email: string | null
          first_name: string
          id: string
          is_deleted: boolean
          job_title: string | null
          last_name: string | null
          metadata: Json | null
          organization_id: string
          owner_id: string | null
          phone: string | null
          postal_code: string | null
          rating: string | null
          source: string | null
          state: string | null
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address_line1?: string | null
          city?: string | null
          company_name?: string | null
          converted_account_id?: string | null
          converted_at?: string | null
          converted_contact_id?: string | null
          converted_deal_id?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          email?: string | null
          first_name: string
          id?: string
          is_deleted?: boolean
          job_title?: string | null
          last_name?: string | null
          metadata?: Json | null
          organization_id: string
          owner_id?: string | null
          phone?: string | null
          postal_code?: string | null
          rating?: string | null
          source?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address_line1?: string | null
          city?: string | null
          company_name?: string | null
          converted_account_id?: string | null
          converted_at?: string | null
          converted_contact_id?: string | null
          converted_deal_id?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          email?: string | null
          first_name?: string
          id?: string
          is_deleted?: boolean
          job_title?: string | null
          last_name?: string | null
          metadata?: Json | null
          organization_id?: string
          owner_id?: string | null
          phone?: string | null
          postal_code?: string | null
          rating?: string | null
          source?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_converted_account_id_fkey"
            columns: ["converted_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_converted_contact_id_fkey"
            columns: ["converted_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_converted_deal_id_fkey"
            columns: ["converted_deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_definitions: {
        Row: {
          created_at: string
          default_value: string | null
          entity_type: Database["public"]["Enums"]["entity_type"]
          field_label: string
          field_name: string
          field_type: string
          id: string
          is_active: boolean
          is_required: boolean
          options: Json | null
          organization_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_value?: string | null
          entity_type: Database["public"]["Enums"]["entity_type"]
          field_label: string
          field_name: string
          field_type: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          options?: Json | null
          organization_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_value?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type"]
          field_label?: string
          field_name?: string
          field_type?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          options?: Json | null
          organization_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_definitions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_values: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          field_id: string
          id: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          field_id: string
          id?: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["entity_type"]
          field_id?: string
          id?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "custom_field_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          account_id: string | null
          actual_close_date: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          deleted_at: string | null
          description: string | null
          expected_close_date: string | null
          id: string
          is_deleted: boolean
          lost_reason: string | null
          metadata: Json | null
          name: string
          organization_id: string
          owner_id: string | null
          pipeline_id: string
          probability: number | null
          source: string | null
          stage_id: string
          status: Database["public"]["Enums"]["deal_status"]
          updated_at: string
          value: number | null
        }
        Insert: {
          account_id?: string | null
          actual_close_date?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          deleted_at?: string | null
          description?: string | null
          expected_close_date?: string | null
          id?: string
          is_deleted?: boolean
          lost_reason?: string | null
          metadata?: Json | null
          name: string
          organization_id: string
          owner_id?: string | null
          pipeline_id: string
          probability?: number | null
          source?: string | null
          stage_id: string
          status?: Database["public"]["Enums"]["deal_status"]
          updated_at?: string
          value?: number | null
        }
        Update: {
          account_id?: string | null
          actual_close_date?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          deleted_at?: string | null
          description?: string | null
          expected_close_date?: string | null
          id?: string
          is_deleted?: boolean
          lost_reason?: string | null
          metadata?: Json | null
          name?: string
          organization_id?: string
          owner_id?: string | null
          pipeline_id?: string
          probability?: number | null
          source?: string | null
          stage_id?: string
          status?: Database["public"]["Enums"]["deal_status"]
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      email_accounts: {
        Row: {
          company_id: string
          connection_id: string | null
          created_at: string | null
          daily_limit: number | null
          domain: string | null
          emails_sent_today: number | null
          error_message: string | null
          id: string
          last_email_at: string | null
          provider: string
          reply_to_email: string | null
          sender_email: string
          sender_name: string | null
          smtp_host: string | null
          smtp_port: number | null
          smtp_secure: boolean | null
          status: string | null
          updated_at: string | null
          verified_domain: boolean | null
        }
        Insert: {
          company_id: string
          connection_id?: string | null
          created_at?: string | null
          daily_limit?: number | null
          domain?: string | null
          emails_sent_today?: number | null
          error_message?: string | null
          id?: string
          last_email_at?: string | null
          provider: string
          reply_to_email?: string | null
          sender_email: string
          sender_name?: string | null
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          status?: string | null
          updated_at?: string | null
          verified_domain?: boolean | null
        }
        Update: {
          company_id?: string
          connection_id?: string | null
          created_at?: string | null
          daily_limit?: number | null
          domain?: string | null
          emails_sent_today?: number | null
          error_message?: string | null
          id?: string
          last_email_at?: string | null
          provider?: string
          reply_to_email?: string | null
          sender_email?: string
          sender_name?: string | null
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_secure?: boolean | null
          status?: string | null
          updated_at?: string | null
          verified_domain?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "email_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_accounts_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "marketing_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_tags: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id?: string
          tag_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["entity_type"]
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: Database["public"]["Enums"]["entity_type"] | null
          id: string
          mime_type: string | null
          name: string
          organization_id: string
          size_bytes: number | null
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type"] | null
          id?: string
          mime_type?: string | null
          name: string
          organization_id: string
          size_bytes?: number | null
          storage_path: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type"] | null
          id?: string
          mime_type?: string | null
          name?: string
          organization_id?: string
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      import_row_errors: {
        Row: {
          created_at: string
          error_message: string
          error_type: string
          id: string
          import_job_id: string
          raw_row_data: Json | null
          row_number: number
        }
        Insert: {
          created_at?: string
          error_message: string
          error_type?: string
          id?: string
          import_job_id: string
          raw_row_data?: Json | null
          row_number: number
        }
        Update: {
          created_at?: string
          error_message?: string
          error_type?: string
          id?: string
          import_job_id?: string
          raw_row_data?: Json | null
          row_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "import_row_errors_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "lead_import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_logs: {
        Row: {
          action: string
          company_id: string
          created_at: string
          error_message: string | null
          id: string
          portal_integration_id: string | null
          records_processed: number | null
          request_data: Json | null
          response_data: Json | null
          source_integration_id: string | null
          status: string
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          portal_integration_id?: string | null
          records_processed?: number | null
          request_data?: Json | null
          response_data?: Json | null
          source_integration_id?: string | null
          status: string
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          portal_integration_id?: string | null
          records_processed?: number | null
          request_data?: Json | null
          response_data?: Json | null
          source_integration_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_logs_portal_integration_id_fkey"
            columns: ["portal_integration_id"]
            isOneToOne: false
            referencedRelation: "portal_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_logs_source_integration_id_fkey"
            columns: ["source_integration_id"]
            isOneToOne: false
            referencedRelation: "source_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          agent_id: string | null
          agent_name: string
          attachments: Json | null
          attachments_count: number | null
          audio_url: string | null
          company_id: string | null
          created_at: string
          description: string | null
          duration: string | null
          id: string
          import_job_id: string | null
          lead_id: string
          title: string
          type: string
        }
        Insert: {
          agent_id?: string | null
          agent_name: string
          attachments?: Json | null
          attachments_count?: number | null
          audio_url?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          import_job_id?: string | null
          lead_id: string
          title: string
          type: string
        }
        Update: {
          agent_id?: string | null
          agent_name?: string
          attachments?: Json | null
          attachments_count?: number | null
          audio_url?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          import_job_id?: string | null
          lead_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "lead_import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_assignment_logs: {
        Row: {
          assigned_by: string | null
          assignment_method: string
          can_undo: boolean | null
          change_reason: string | null
          company_id: string
          created_at: string
          from_agent_id: string | null
          id: string
          lead_id: string
          notification_sent: boolean | null
          notification_sent_at: string | null
          reason: string | null
          rule_id: string | null
          to_agent_id: string | null
          undone_at: string | null
          undone_by: string | null
        }
        Insert: {
          assigned_by?: string | null
          assignment_method: string
          can_undo?: boolean | null
          change_reason?: string | null
          company_id: string
          created_at?: string
          from_agent_id?: string | null
          id?: string
          lead_id: string
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          reason?: string | null
          rule_id?: string | null
          to_agent_id?: string | null
          undone_at?: string | null
          undone_by?: string | null
        }
        Update: {
          assigned_by?: string | null
          assignment_method?: string
          can_undo?: boolean | null
          change_reason?: string | null
          company_id?: string
          created_at?: string
          from_agent_id?: string | null
          id?: string
          lead_id?: string
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          reason?: string | null
          rule_id?: string | null
          to_agent_id?: string | null
          undone_at?: string | null
          undone_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_assignment_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignment_logs_from_agent_id_fkey"
            columns: ["from_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignment_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignment_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "lead_assignment_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignment_logs_to_agent_id_fkey"
            columns: ["to_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_assignment_rules: {
        Row: {
          assigned_agents: string[] | null
          company_id: string
          conditions: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          match_all_conditions: boolean | null
          name: string
          priority: number
          round_robin_index: number | null
          rule_order: number | null
          rule_type: string
          updated_at: string
        }
        Insert: {
          assigned_agents?: string[] | null
          company_id: string
          conditions?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          match_all_conditions?: boolean | null
          name: string
          priority?: number
          round_robin_index?: number | null
          rule_order?: number | null
          rule_type: string
          updated_at?: string
        }
        Update: {
          assigned_agents?: string[] | null
          company_id?: string
          conditions?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          match_all_conditions?: boolean | null
          name?: string
          priority?: number
          round_robin_index?: number | null
          rule_order?: number | null
          rule_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_assignment_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_chatbot_assignment: {
        Row: {
          assigned_by: string | null
          chatbot_id: string
          company_id: string
          created_at: string | null
          id: string
          last_interaction_at: string | null
          lead_id: string
          messages_received: number | null
          messages_sent: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_by?: string | null
          chatbot_id: string
          company_id: string
          created_at?: string | null
          id?: string
          last_interaction_at?: string | null
          lead_id: string
          messages_received?: number | null
          messages_sent?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_by?: string | null
          chatbot_id?: string
          company_id?: string
          created_at?: string | null
          id?: string
          last_interaction_at?: string | null
          lead_id?: string
          messages_received?: number | null
          messages_sent?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_chatbot_assignment_chatbot_id_fkey"
            columns: ["chatbot_id"]
            isOneToOne: false
            referencedRelation: "chatbots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_chatbot_assignment_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_chatbot_assignment_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_followups: {
        Row: {
          assigned_agent_id: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string
          id: string
          lead_id: string
          priority: string | null
          reminder_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_agent_id?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date: string
          id?: string
          lead_id: string
          priority?: string | null
          reminder_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_agent_id?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string
          id?: string
          lead_id?: string
          priority?: string | null
          reminder_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_followups_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_followups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_followups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_groups: {
        Row: {
          color: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_groups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_import_jobs: {
        Row: {
          column_mapping: Json | null
          company_id: string
          completed_at: string | null
          created_at: string | null
          default_agent_id: string | null
          default_group_id: string | null
          default_stage: string | null
          duplicate_action: string | null
          duplicate_rows: number | null
          error_details: Json | null
          failed_rows: number | null
          file_name: string
          id: string
          imported_rows: number | null
          preview_rows: Json | null
          rollback_until: string | null
          rolled_back_at: string | null
          skipped_rows: number | null
          source_label: string | null
          status: string | null
          total_rows: number | null
          uploaded_by: string
          valid_rows: number | null
        }
        Insert: {
          column_mapping?: Json | null
          company_id: string
          completed_at?: string | null
          created_at?: string | null
          default_agent_id?: string | null
          default_group_id?: string | null
          default_stage?: string | null
          duplicate_action?: string | null
          duplicate_rows?: number | null
          error_details?: Json | null
          failed_rows?: number | null
          file_name: string
          id?: string
          imported_rows?: number | null
          preview_rows?: Json | null
          rollback_until?: string | null
          rolled_back_at?: string | null
          skipped_rows?: number | null
          source_label?: string | null
          status?: string | null
          total_rows?: number | null
          uploaded_by: string
          valid_rows?: number | null
        }
        Update: {
          column_mapping?: Json | null
          company_id?: string
          completed_at?: string | null
          created_at?: string | null
          default_agent_id?: string | null
          default_group_id?: string | null
          default_stage?: string | null
          duplicate_action?: string | null
          duplicate_rows?: number | null
          error_details?: Json | null
          failed_rows?: number | null
          file_name?: string
          id?: string
          imported_rows?: number | null
          preview_rows?: Json | null
          rollback_until?: string | null
          rolled_back_at?: string | null
          skipped_rows?: number | null
          source_label?: string | null
          status?: string | null
          total_rows?: number | null
          uploaded_by?: string
          valid_rows?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_import_jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_pipeline_entries: {
        Row: {
          added_at: string
          added_by: string | null
          assigned_agent_id: string | null
          current_stage_id: string
          id: string
          last_stage_change_at: string | null
          lead_id: string
          notes: string | null
          pipeline_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          assigned_agent_id?: string | null
          current_stage_id: string
          id?: string
          last_stage_change_at?: string | null
          lead_id: string
          notes?: string | null
          pipeline_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          assigned_agent_id?: string | null
          current_stage_id?: string
          id?: string
          last_stage_change_at?: string | null
          lead_id?: string
          notes?: string | null
          pipeline_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_pipeline_entries_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_pipeline_entries_current_stage_id_fkey"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "lead_pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_pipeline_entries_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_pipeline_entries_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "lead_pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_pipeline_history: {
        Row: {
          change_type: string
          changed_at: string
          changed_by: string | null
          id: string
          new_agent_id: string | null
          new_stage_id: string
          notes: string | null
          old_agent_id: string | null
          old_stage_id: string | null
          pipeline_entry_id: string
        }
        Insert: {
          change_type?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_agent_id?: string | null
          new_stage_id: string
          notes?: string | null
          old_agent_id?: string | null
          old_stage_id?: string | null
          pipeline_entry_id: string
        }
        Update: {
          change_type?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_agent_id?: string | null
          new_stage_id?: string
          notes?: string | null
          old_agent_id?: string | null
          old_stage_id?: string | null
          pipeline_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_pipeline_history_new_agent_id_fkey"
            columns: ["new_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_pipeline_history_new_stage_id_fkey"
            columns: ["new_stage_id"]
            isOneToOne: false
            referencedRelation: "lead_pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_pipeline_history_old_agent_id_fkey"
            columns: ["old_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_pipeline_history_old_stage_id_fkey"
            columns: ["old_stage_id"]
            isOneToOne: false
            referencedRelation: "lead_pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_pipeline_history_pipeline_entry_id_fkey"
            columns: ["pipeline_entry_id"]
            isOneToOne: false
            referencedRelation: "lead_pipeline_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_pipeline_stages: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_lost: boolean | null
          is_won: boolean | null
          pipeline_id: string
          stage_name: string
          stage_order: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_lost?: boolean | null
          is_won?: boolean | null
          pipeline_id: string
          stage_name: string
          stage_order?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_lost?: boolean | null
          is_won?: boolean | null
          pipeline_id?: string
          stage_name?: string
          stage_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "lead_pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_pipelines: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_pipelines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_pool_members: {
        Row: {
          added_at: string
          added_by: string | null
          id: string
          lead_id: string
          pool_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          id?: string
          lead_id: string
          pool_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          id?: string
          lead_id?: string
          pool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_pool_members_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_pool_members_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "lead_pools"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_pools: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          pool_name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          pool_name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          pool_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_pools_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_source_logs: {
        Row: {
          action: string
          company_id: string
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          leads_created: number | null
          leads_processed: number | null
          leads_skipped: number | null
          leads_updated: number | null
          request_data: Json | null
          response_data: Json | null
          source_id: string | null
          status: string
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          leads_created?: number | null
          leads_processed?: number | null
          leads_skipped?: number | null
          leads_updated?: number | null
          request_data?: Json | null
          response_data?: Json | null
          source_id?: string | null
          status: string
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          leads_created?: number | null
          leads_processed?: number | null
          leads_skipped?: number | null
          leads_updated?: number | null
          request_data?: Json | null
          response_data?: Json | null
          source_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_source_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_source_logs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_sources: {
        Row: {
          company_id: string
          connection_details: Json | null
          connection_type: string
          created_at: string
          created_by: string | null
          display_name: string
          field_mapping: Json | null
          id: string
          is_active: boolean | null
          last_error: string | null
          last_fetched_at: string | null
          source_name: string
          status: string
          total_leads_fetched: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          connection_details?: Json | null
          connection_type?: string
          created_at?: string
          created_by?: string | null
          display_name: string
          field_mapping?: Json | null
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_fetched_at?: string | null
          source_name: string
          status?: string
          total_leads_fetched?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          connection_details?: Json | null
          connection_type?: string
          created_at?: string
          created_by?: string | null
          display_name?: string
          field_mapping?: Json | null
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_fetched_at?: string | null
          source_name?: string
          status?: string
          total_leads_fetched?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_sources_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_stages: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          id: string
          is_default: boolean | null
          is_lost: boolean | null
          is_won: boolean | null
          name: string
          position: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          is_lost?: boolean | null
          is_won?: boolean | null
          name: string
          position?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          is_lost?: boolean | null
          is_won?: boolean | null
          name?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_stages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_webhooks: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean | null
          last_received_at: string | null
          secret_key: string
          source_id: string
          total_received: number | null
          updated_at: string
          verify_token: string | null
          webhook_url: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_received_at?: string | null
          secret_key?: string
          source_id: string
          total_received?: number | null
          updated_at?: string
          verify_token?: string | null
          webhook_url: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_received_at?: string | null
          secret_key?: string
          source_id?: string
          total_received?: number | null
          updated_at?: string
          verify_token?: string | null
          webhook_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_webhooks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_webhooks_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          ad_name: string | null
          ad_set_name: string | null
          assigned_agent_id: string | null
          assignment_priority: string | null
          attachments: Json | null
          bedrooms: string | null
          budget: string | null
          campaign_name: string | null
          company_id: string | null
          consent_updated_at: string | null
          created_at: string
          custom_fields: Json | null
          email: string | null
          external_id: string | null
          fetched_at: string | null
          form_data: Json | null
          form_id: string | null
          form_name: string | null
          furnished: string | null
          gender: string | null
          id: string
          import_job_id: string | null
          imported_from: string | null
          internal_listing_id: string | null
          is_new: boolean | null
          is_opted_in: boolean | null
          is_pf_lead: boolean | null
          is_unmapped: boolean | null
          language: string | null
          last_assignment_id: string | null
          last_contacted_at: string | null
          lead_group_id: string | null
          lead_score: number | null
          lead_source_id: string | null
          location: string | null
          mapped_fields: Json | null
          move_in_date: string | null
          name: string
          nationality: string | null
          normalized_phone: string | null
          notification_sent: boolean | null
          opted_in: boolean | null
          opted_in_email: boolean | null
          opted_in_sms: boolean | null
          opted_in_whatsapp: boolean | null
          pf_lead_id: string | null
          phone: string | null
          portal_listing_id: string | null
          preferred_contact_time: string | null
          previous_agent_id: string | null
          property_type: string | null
          publication_id: string | null
          purpose: string | null
          reassignment_due_at: string | null
          received_at: string | null
          requirements: string | null
          source: string | null
          source_form_id: string | null
          source_metadata: Json | null
          stage: string | null
          stage_id: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          ad_name?: string | null
          ad_set_name?: string | null
          assigned_agent_id?: string | null
          assignment_priority?: string | null
          attachments?: Json | null
          bedrooms?: string | null
          budget?: string | null
          campaign_name?: string | null
          company_id?: string | null
          consent_updated_at?: string | null
          created_at?: string
          custom_fields?: Json | null
          email?: string | null
          external_id?: string | null
          fetched_at?: string | null
          form_data?: Json | null
          form_id?: string | null
          form_name?: string | null
          furnished?: string | null
          gender?: string | null
          id?: string
          import_job_id?: string | null
          imported_from?: string | null
          internal_listing_id?: string | null
          is_new?: boolean | null
          is_opted_in?: boolean | null
          is_pf_lead?: boolean | null
          is_unmapped?: boolean | null
          language?: string | null
          last_assignment_id?: string | null
          last_contacted_at?: string | null
          lead_group_id?: string | null
          lead_score?: number | null
          lead_source_id?: string | null
          location?: string | null
          mapped_fields?: Json | null
          move_in_date?: string | null
          name: string
          nationality?: string | null
          normalized_phone?: string | null
          notification_sent?: boolean | null
          opted_in?: boolean | null
          opted_in_email?: boolean | null
          opted_in_sms?: boolean | null
          opted_in_whatsapp?: boolean | null
          pf_lead_id?: string | null
          phone?: string | null
          portal_listing_id?: string | null
          preferred_contact_time?: string | null
          previous_agent_id?: string | null
          property_type?: string | null
          publication_id?: string | null
          purpose?: string | null
          reassignment_due_at?: string | null
          received_at?: string | null
          requirements?: string | null
          source?: string | null
          source_form_id?: string | null
          source_metadata?: Json | null
          stage?: string | null
          stage_id?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          ad_name?: string | null
          ad_set_name?: string | null
          assigned_agent_id?: string | null
          assignment_priority?: string | null
          attachments?: Json | null
          bedrooms?: string | null
          budget?: string | null
          campaign_name?: string | null
          company_id?: string | null
          consent_updated_at?: string | null
          created_at?: string
          custom_fields?: Json | null
          email?: string | null
          external_id?: string | null
          fetched_at?: string | null
          form_data?: Json | null
          form_id?: string | null
          form_name?: string | null
          furnished?: string | null
          gender?: string | null
          id?: string
          import_job_id?: string | null
          imported_from?: string | null
          internal_listing_id?: string | null
          is_new?: boolean | null
          is_opted_in?: boolean | null
          is_pf_lead?: boolean | null
          is_unmapped?: boolean | null
          language?: string | null
          last_assignment_id?: string | null
          last_contacted_at?: string | null
          lead_group_id?: string | null
          lead_score?: number | null
          lead_source_id?: string | null
          location?: string | null
          mapped_fields?: Json | null
          move_in_date?: string | null
          name?: string
          nationality?: string | null
          normalized_phone?: string | null
          notification_sent?: boolean | null
          opted_in?: boolean | null
          opted_in_email?: boolean | null
          opted_in_sms?: boolean | null
          opted_in_whatsapp?: boolean | null
          pf_lead_id?: string | null
          phone?: string | null
          portal_listing_id?: string | null
          preferred_contact_time?: string | null
          previous_agent_id?: string | null
          property_type?: string | null
          publication_id?: string | null
          purpose?: string | null
          reassignment_due_at?: string | null
          received_at?: string | null
          requirements?: string | null
          source?: string | null
          source_form_id?: string | null
          source_metadata?: Json | null
          stage?: string | null
          stage_id?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_internal_listing_id_fkey"
            columns: ["internal_listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_lead_group_id_fkey"
            columns: ["lead_group_id"]
            isOneToOne: false
            referencedRelation: "lead_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_lead_source_id_fkey"
            columns: ["lead_source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_previous_agent_id_fkey"
            columns: ["previous_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "portal_listing_publications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_source_form_id_fkey"
            columns: ["source_form_id"]
            isOneToOne: false
            referencedRelation: "website_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "lead_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_analytics: {
        Row: {
          clicks_count: number | null
          company_id: string
          created_at: string | null
          date: string | null
          email_inquiries: number | null
          favorites_count: number | null
          id: string
          inquiries_count: number | null
          listing_id: string
          phone_reveals: number | null
          portal_name: string | null
          shares_count: number | null
          unique_views: number | null
          updated_at: string | null
          views_count: number | null
          whatsapp_clicks: number | null
        }
        Insert: {
          clicks_count?: number | null
          company_id: string
          created_at?: string | null
          date?: string | null
          email_inquiries?: number | null
          favorites_count?: number | null
          id?: string
          inquiries_count?: number | null
          listing_id: string
          phone_reveals?: number | null
          portal_name?: string | null
          shares_count?: number | null
          unique_views?: number | null
          updated_at?: string | null
          views_count?: number | null
          whatsapp_clicks?: number | null
        }
        Update: {
          clicks_count?: number | null
          company_id?: string
          created_at?: string | null
          date?: string | null
          email_inquiries?: number | null
          favorites_count?: number | null
          id?: string
          inquiries_count?: number | null
          listing_id?: string
          phone_reveals?: number | null
          portal_name?: string | null
          shares_count?: number | null
          unique_views?: number | null
          updated_at?: string | null
          views_count?: number | null
          whatsapp_clicks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_analytics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_analytics_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_audit_logs: {
        Row: {
          action_type: string
          changes: Json | null
          company_id: string
          created_at: string | null
          description: string
          id: string
          ip_address: string | null
          listing_id: string | null
          performed_by: string | null
          user_agent: string | null
        }
        Insert: {
          action_type: string
          changes?: Json | null
          company_id: string
          created_at?: string | null
          description: string
          id?: string
          ip_address?: string | null
          listing_id?: string | null
          performed_by?: string | null
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          changes?: Json | null
          company_id?: string
          created_at?: string | null
          description?: string
          id?: string
          ip_address?: string | null
          listing_id?: string | null
          performed_by?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_audit_logs_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_inquiries: {
        Row: {
          assigned_to: string | null
          company_id: string
          created_at: string | null
          email: string | null
          external_id: string | null
          id: string
          lead_id: string | null
          listing_id: string
          message: string | null
          name: string | null
          phone: string | null
          portal_name: string | null
          responded_at: string | null
          source_url: string | null
          status: string | null
        }
        Insert: {
          assigned_to?: string | null
          company_id: string
          created_at?: string | null
          email?: string | null
          external_id?: string | null
          id?: string
          lead_id?: string | null
          listing_id: string
          message?: string | null
          name?: string | null
          phone?: string | null
          portal_name?: string | null
          responded_at?: string | null
          source_url?: string | null
          status?: string | null
        }
        Update: {
          assigned_to?: string | null
          company_id?: string
          created_at?: string | null
          email?: string | null
          external_id?: string | null
          id?: string
          lead_id?: string | null
          listing_id?: string
          message?: string | null
          name?: string | null
          phone?: string | null
          portal_name?: string | null
          responded_at?: string | null
          source_url?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_inquiries_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_inquiries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_inquiries_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_inquiries_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_notifications: {
        Row: {
          created_at: string
          id: string
          listing_id: string | null
          message: string | null
          metadata: Json | null
          notification_type: string
          read_status: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id?: string | null
          message?: string | null
          metadata?: Json | null
          notification_type: string
          read_status?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string | null
          message?: string | null
          metadata?: Json | null
          notification_type?: string
          read_status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_notifications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_platform_compliance: {
        Row: {
          agent_brn: string | null
          broker_id: string | null
          building_id: string | null
          company_id: string
          created_at: string
          developer_id: string | null
          id: string
          listing_platform_id: string
          permit_number: string | null
          project_id: string | null
          qr_code_url: string | null
          rera_number: string | null
          updated_at: string
        }
        Insert: {
          agent_brn?: string | null
          broker_id?: string | null
          building_id?: string | null
          company_id: string
          created_at?: string
          developer_id?: string | null
          id?: string
          listing_platform_id: string
          permit_number?: string | null
          project_id?: string | null
          qr_code_url?: string | null
          rera_number?: string | null
          updated_at?: string
        }
        Update: {
          agent_brn?: string | null
          broker_id?: string | null
          building_id?: string | null
          company_id?: string
          created_at?: string
          developer_id?: string | null
          id?: string
          listing_platform_id?: string
          permit_number?: string | null
          project_id?: string | null
          qr_code_url?: string | null
          rera_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_platform_compliance_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_platform_compliance_listing_platform_id_fkey"
            columns: ["listing_platform_id"]
            isOneToOne: true
            referencedRelation: "listing_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_platform_content: {
        Row: {
          company_id: string
          created_at: string
          currency_override: string | null
          description: string | null
          id: string
          language: string | null
          listing_platform_id: string
          price_override: number | null
          rent_frequency: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          currency_override?: string | null
          description?: string | null
          id?: string
          language?: string | null
          listing_platform_id: string
          price_override?: number | null
          rent_frequency?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          currency_override?: string | null
          description?: string | null
          id?: string
          language?: string | null
          listing_platform_id?: string
          price_override?: number | null
          rent_frequency?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_platform_content_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_platform_content_listing_platform_id_fkey"
            columns: ["listing_platform_id"]
            isOneToOne: false
            referencedRelation: "listing_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_platforms: {
        Row: {
          company_id: string
          created_at: string
          id: string
          last_error: string | null
          last_synced_at: string | null
          listing_id: string
          platform_code: string
          platform_property_id: string | null
          platform_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          listing_id: string
          platform_code: string
          platform_property_id?: string | null
          platform_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          listing_id?: string
          platform_code?: string
          platform_property_id?: string | null
          platform_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_platforms_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_platforms_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_portal_mappings: {
        Row: {
          company_id: string
          created_at: string | null
          crm_listing_id: string | null
          id: string
          portal: string
          portal_listing_id: string
          portal_reference: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          crm_listing_id?: string | null
          id?: string
          portal: string
          portal_listing_id: string
          portal_reference?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          crm_listing_id?: string | null
          id?: string
          portal?: string
          portal_listing_id?: string
          portal_reference?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_portal_mappings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_portal_mappings_crm_listing_id_fkey"
            columns: ["crm_listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_portals: {
        Row: {
          company_id: string
          connection_id: string | null
          created_at: string | null
          customizations: Json | null
          error_message: string | null
          id: string
          last_sync_at: string | null
          listing_id: string
          next_retry_at: string | null
          portal_listing_id: string | null
          portal_name: string
          portal_url: string | null
          publish_status: string | null
          publish_time: string | null
          retry_count: number | null
          sync_status: string | null
          unpublish_time: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          connection_id?: string | null
          created_at?: string | null
          customizations?: Json | null
          error_message?: string | null
          id?: string
          last_sync_at?: string | null
          listing_id: string
          next_retry_at?: string | null
          portal_listing_id?: string | null
          portal_name: string
          portal_url?: string | null
          publish_status?: string | null
          publish_time?: string | null
          retry_count?: number | null
          sync_status?: string | null
          unpublish_time?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          connection_id?: string | null
          created_at?: string | null
          customizations?: Json | null
          error_message?: string | null
          id?: string
          last_sync_at?: string | null
          listing_id?: string
          next_retry_at?: string | null
          portal_listing_id?: string | null
          portal_name?: string
          portal_url?: string | null
          publish_status?: string | null
          publish_time?: string | null
          retry_count?: number | null
          sync_status?: string | null
          unpublish_time?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_portals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_portals_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "marketing_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_portals_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_shares: {
        Row: {
          company_id: string
          created_at: string | null
          id: string
          lead_id: string | null
          listing_id: string
          opened_at: string | null
          pdf_url: string | null
          recipient_contact: string | null
          recipient_name: string | null
          share_type: string
          share_url: string | null
          shared_by: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          id?: string
          lead_id?: string | null
          listing_id: string
          opened_at?: string | null
          pdf_url?: string | null
          recipient_contact?: string | null
          recipient_name?: string | null
          share_type: string
          share_url?: string | null
          shared_by: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          id?: string
          lead_id?: string | null
          listing_id?: string
          opened_at?: string | null
          pdf_url?: string | null
          recipient_contact?: string | null
          recipient_name?: string | null
          share_type?: string
          share_url?: string | null
          shared_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_shares_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_shares_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_shares_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_version_history: {
        Row: {
          change_summary: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          id: string
          listing_id: string
          snapshot: Json
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          listing_id: string
          snapshot: Json
          version_number: number
        }
        Update: {
          change_summary?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          listing_id?: string
          snapshot?: Json
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "listing_version_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_version_history_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          address: string | null
          amenities: Json | null
          area_size: number | null
          area_unit: string | null
          assigned_agent_id: string | null
          assigned_agents: Json | null
          building_name: string | null
          city: string | null
          company_id: string
          completion_status: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          developer: string | null
          documents: Json | null
          expires_at: string | null
          featured: boolean | null
          floor_number: number | null
          floor_plans: Json | null
          furnished: string | null
          handover_date: string | null
          id: string
          images: Json | null
          latitude: number | null
          listing_type: string | null
          longitude: number | null
          number_of_bathrooms: number | null
          number_of_bedrooms: number | null
          ownership_type: string | null
          parking_spaces: number | null
          permit_number: string | null
          plot_size: number | null
          premium: boolean | null
          price: number | null
          price_per_sqft: number | null
          project_name: string | null
          property_type: string
          published_at: string | null
          reference_number: string | null
          rent_frequency: string | null
          rera_number: string | null
          service_charge: number | null
          state: string | null
          status: string | null
          tags: Json | null
          title: string
          title_ar: string | null
          description_ar: string | null
          updated_at: string | null
          videos: Json | null
          view_type: string | null
          virtual_tour_url: string | null
        }
        Insert: {
          address?: string | null
          amenities?: Json | null
          area_size?: number | null
          area_unit?: string | null
          assigned_agent_id?: string | null
          assigned_agents?: Json | null
          building_name?: string | null
          city?: string | null
          company_id: string
          completion_status?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          developer?: string | null
          documents?: Json | null
          expires_at?: string | null
          featured?: boolean | null
          floor_number?: number | null
          floor_plans?: Json | null
          furnished?: string | null
          handover_date?: string | null
          id?: string
          images?: Json | null
          latitude?: number | null
          listing_type?: string | null
          longitude?: number | null
          number_of_bathrooms?: number | null
          number_of_bedrooms?: number | null
          ownership_type?: string | null
          parking_spaces?: number | null
          permit_number?: string | null
          plot_size?: number | null
          premium?: boolean | null
          price?: number | null
          price_per_sqft?: number | null
          project_name?: string | null
          property_type?: string
          published_at?: string | null
          reference_number?: string | null
          rent_frequency?: string | null
          rera_number?: string | null
          service_charge?: number | null
          state?: string | null
          status?: string | null
          tags?: Json | null
          title: string
          title_ar?: string | null
          description_ar?: string | null
          updated_at?: string | null
          videos?: Json | null
          view_type?: string | null
          virtual_tour_url?: string | null
        }
        Update: {
          address?: string | null
          amenities?: Json | null
          area_size?: number | null
          area_unit?: string | null
          assigned_agent_id?: string | null
          assigned_agents?: Json | null
          building_name?: string | null
          city?: string | null
          company_id?: string
          completion_status?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          developer?: string | null
          documents?: Json | null
          expires_at?: string | null
          featured?: boolean | null
          floor_number?: number | null
          floor_plans?: Json | null
          furnished?: string | null
          handover_date?: string | null
          id?: string
          images?: Json | null
          latitude?: number | null
          listing_type?: string | null
          longitude?: number | null
          number_of_bathrooms?: number | null
          number_of_bedrooms?: number | null
          ownership_type?: string | null
          parking_spaces?: number | null
          permit_number?: string | null
          plot_size?: number | null
          premium?: boolean | null
          price?: number | null
          price_per_sqft?: number | null
          project_name?: string | null
          property_type?: string
          published_at?: string | null
          reference_number?: string | null
          rent_frequency?: string | null
          rera_number?: string | null
          service_charge?: number | null
          state?: string | null
          status?: string | null
          tags?: Json | null
          title?: string
          title_ar?: string | null
          description_ar?: string | null
          updated_at?: string | null
          videos?: Json | null
          view_type?: string | null
          virtual_tour_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          building: string | null
          city: string
          community: string | null
          country: string
          created_at: string | null
          full_location: string
          id: string
          is_active: boolean | null
          latitude: number | null
          location_type: string
          longitude: number | null
          updated_at: string | null
        }
        Insert: {
          building?: string | null
          city: string
          community?: string | null
          country: string
          created_at?: string | null
          full_location: string
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          location_type?: string
          longitude?: number | null
          updated_at?: string | null
        }
        Update: {
          building?: string | null
          city?: string
          community?: string | null
          country?: string
          created_at?: string | null
          full_location?: string
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          location_type?: string
          longitude?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      marketing_connections: {
        Row: {
          access_token_expires_at: string | null
          channel: string
          company_id: string | null
          created_at: string
          created_by: string | null
          credentials: Json | null
          display_name: string
          error_message: string | null
          health_status: string | null
          id: string
          identifier: string
          is_default: boolean | null
          last_health_check: string | null
          last_sync: string | null
          messaging_limit: number | null
          meta_business_id: string | null
          phone_number_id: string | null
          provider: string
          quality_rating: string | null
          sender_id: string | null
          service_name: string | null
          status: string
          updated_at: string
          verified: boolean | null
          verified_domain: boolean | null
          webhook_token: string | null
          webhook_url: string | null
        }
        Insert: {
          access_token_expires_at?: string | null
          channel: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          credentials?: Json | null
          display_name: string
          error_message?: string | null
          health_status?: string | null
          id?: string
          identifier: string
          is_default?: boolean | null
          last_health_check?: string | null
          last_sync?: string | null
          messaging_limit?: number | null
          meta_business_id?: string | null
          phone_number_id?: string | null
          provider: string
          quality_rating?: string | null
          sender_id?: string | null
          service_name?: string | null
          status?: string
          updated_at?: string
          verified?: boolean | null
          verified_domain?: boolean | null
          webhook_token?: string | null
          webhook_url?: string | null
        }
        Update: {
          access_token_expires_at?: string | null
          channel?: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          credentials?: Json | null
          display_name?: string
          error_message?: string | null
          health_status?: string | null
          id?: string
          identifier?: string
          is_default?: boolean | null
          last_health_check?: string | null
          last_sync?: string | null
          messaging_limit?: number | null
          meta_business_id?: string | null
          phone_number_id?: string | null
          provider?: string
          quality_rating?: string | null
          sender_id?: string | null
          service_name?: string | null
          status?: string
          updated_at?: string
          verified?: boolean | null
          verified_domain?: boolean | null
          webhook_token?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_connections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_templates: {
        Row: {
          body: string
          buttons_json: Json | null
          category: string | null
          channel: string
          company_id: string
          created_at: string | null
          created_by: string | null
          footer_text: string | null
          header_content: string | null
          header_type: string | null
          id: string
          language: string | null
          meta_template_id: string | null
          rejection_reason: string | null
          status: string | null
          subject: string | null
          template_key: string | null
          template_name: string
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          body: string
          buttons_json?: Json | null
          category?: string | null
          channel: string
          company_id: string
          created_at?: string | null
          created_by?: string | null
          footer_text?: string | null
          header_content?: string | null
          header_type?: string | null
          id?: string
          language?: string | null
          meta_template_id?: string | null
          rejection_reason?: string | null
          status?: string | null
          subject?: string | null
          template_key?: string | null
          template_name: string
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          body?: string
          buttons_json?: Json | null
          category?: string | null
          channel?: string
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          footer_text?: string | null
          header_content?: string | null
          header_type?: string | null
          id?: string
          language?: string | null
          meta_template_id?: string | null
          rejection_reason?: string | null
          status?: string | null
          subject?: string | null
          template_key?: string | null
          template_name?: string
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_webhooks: {
        Row: {
          campaign_id: string | null
          company_id: string
          created_at: string | null
          error_message: string | null
          event_type: string
          id: string
          message_id: string | null
          payload: Json
          processed: boolean | null
          processed_at: string | null
          provider: string
          recipient_id: string | null
          status: string
        }
        Insert: {
          campaign_id?: string | null
          company_id: string
          created_at?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          message_id?: string | null
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          provider: string
          recipient_id?: string | null
          status: string
        }
        Update: {
          campaign_id?: string | null
          company_id?: string
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          message_id?: string | null
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          provider?: string
          recipient_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_webhooks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_webhooks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_webhooks_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "campaign_recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_ad_accounts: {
        Row: {
          account_name: string | null
          ad_account_id: string
          business_id: string | null
          company_id: string
          created_at: string
          currency: string | null
          id: string
          lead_source_id: string | null
          permissions: Json | null
          status: string
          timezone: string | null
          updated_at: string
        }
        Insert: {
          account_name?: string | null
          ad_account_id: string
          business_id?: string | null
          company_id: string
          created_at?: string
          currency?: string | null
          id?: string
          lead_source_id?: string | null
          permissions?: Json | null
          status?: string
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          account_name?: string | null
          ad_account_id?: string
          business_id?: string | null
          company_id?: string
          created_at?: string
          currency?: string | null
          id?: string
          lead_source_id?: string | null
          permissions?: Json | null
          status?: string
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_ad_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_ad_accounts_lead_source_id_fkey"
            columns: ["lead_source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_form_agent_mappings: {
        Row: {
          agent_id: string
          company_id: string
          created_at: string
          form_id: string
          id: string
          is_active: boolean | null
          last_assigned_at: string | null
          leads_assigned: number | null
          priority: number | null
        }
        Insert: {
          agent_id: string
          company_id: string
          created_at?: string
          form_id: string
          id?: string
          is_active?: boolean | null
          last_assigned_at?: string | null
          leads_assigned?: number | null
          priority?: number | null
        }
        Update: {
          agent_id?: string
          company_id?: string
          created_at?: string
          form_id?: string
          id?: string
          is_active?: boolean | null
          last_assigned_at?: string | null
          leads_assigned?: number | null
          priority?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_form_agent_mappings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_form_agent_mappings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_form_agent_mappings_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "meta_lead_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_lead_forms: {
        Row: {
          assigned_agent_id: string | null
          assigned_group_id: string | null
          auto_assignment_enabled: boolean | null
          company_id: string
          created_at: string
          field_mapping: Json | null
          form_id: string
          form_name: string | null
          id: string
          lead_source_id: string | null
          leads_count: number | null
          page_id: string
          page_name: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_agent_id?: string | null
          assigned_group_id?: string | null
          auto_assignment_enabled?: boolean | null
          company_id: string
          created_at?: string
          field_mapping?: Json | null
          form_id: string
          form_name?: string | null
          id?: string
          lead_source_id?: string | null
          leads_count?: number | null
          page_id: string
          page_name?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_agent_id?: string | null
          assigned_group_id?: string | null
          auto_assignment_enabled?: boolean | null
          company_id?: string
          created_at?: string
          field_mapping?: Json | null
          form_id?: string
          form_name?: string | null
          id?: string
          lead_source_id?: string | null
          leads_count?: number | null
          page_id?: string
          page_name?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_lead_forms_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_lead_forms_assigned_group_id_fkey"
            columns: ["assigned_group_id"]
            isOneToOne: false
            referencedRelation: "lead_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_lead_forms_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_lead_forms_lead_source_id_fkey"
            columns: ["lead_source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_webhook_events: {
        Row: {
          ad_id: string | null
          adgroup_id: string | null
          campaign_id: string | null
          company_id: string
          created_at: string
          created_lead_id: string | null
          event_type: string
          form_id: string | null
          id: string
          last_error: string | null
          lead_id_meta: string | null
          lead_source_id: string | null
          page_id: string | null
          payload: Json
          processed: boolean
          processed_at: string | null
          processing_attempts: number
          received_at: string
        }
        Insert: {
          ad_id?: string | null
          adgroup_id?: string | null
          campaign_id?: string | null
          company_id: string
          created_at?: string
          created_lead_id?: string | null
          event_type?: string
          form_id?: string | null
          id?: string
          last_error?: string | null
          lead_id_meta?: string | null
          lead_source_id?: string | null
          page_id?: string | null
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          processing_attempts?: number
          received_at?: string
        }
        Update: {
          ad_id?: string | null
          adgroup_id?: string | null
          campaign_id?: string | null
          company_id?: string
          created_at?: string
          created_lead_id?: string | null
          event_type?: string
          form_id?: string | null
          id?: string
          last_error?: string | null
          lead_id_meta?: string | null
          lead_source_id?: string | null
          page_id?: string | null
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          processing_attempts?: number
          received_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_webhook_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_webhook_events_created_lead_id_fkey"
            columns: ["created_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_webhook_events_lead_source_id_fkey"
            columns: ["lead_source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_webhook_logs: {
        Row: {
          action: string
          company_id: string
          created_at: string
          details: Json | null
          error_message: string | null
          id: string
          processing_time_ms: number | null
          success: boolean
          webhook_event_id: string | null
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          details?: Json | null
          error_message?: string | null
          id?: string
          processing_time_ms?: number | null
          success?: boolean
          webhook_event_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          details?: Json | null
          error_message?: string | null
          id?: string
          processing_time_ms?: number | null
          success?: boolean
          webhook_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_webhook_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_webhook_logs_webhook_event_id_fkey"
            columns: ["webhook_event_id"]
            isOneToOne: false
            referencedRelation: "meta_webhook_events"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          account_id: string | null
          contact_id: string | null
          content: string
          created_at: string
          created_by: string
          deal_id: string | null
          id: string
          is_pinned: boolean
          lead_id: string | null
          organization_id: string
          related_to_id: string
          related_to_type: Database["public"]["Enums"]["entity_type"]
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          contact_id?: string | null
          content: string
          created_at?: string
          created_by: string
          deal_id?: string | null
          id?: string
          is_pinned?: boolean
          lead_id?: string | null
          organization_id: string
          related_to_id: string
          related_to_type: Database["public"]["Enums"]["entity_type"]
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          contact_id?: string | null
          content?: string
          created_at?: string
          created_by?: string
          deal_id?: string | null
          id?: string
          is_pinned?: boolean
          lead_id?: string | null
          organization_id?: string
          related_to_id?: string
          related_to_type?: Database["public"]["Enums"]["entity_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          invited_at: string | null
          invited_by: string | null
          is_active: boolean
          joined_at: string | null
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean
          joined_at?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean
          joined_at?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          created_at: string
          date_format: string | null
          deal_auto_probability: boolean | null
          default_currency: string | null
          default_pipeline_id: string | null
          default_timezone: string | null
          email_notifications: boolean | null
          id: string
          lead_auto_assignment: boolean | null
          metadata: Json | null
          organization_id: string
          primary_color: string | null
          secondary_color: string | null
          time_format: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_format?: string | null
          deal_auto_probability?: boolean | null
          default_currency?: string | null
          default_pipeline_id?: string | null
          default_timezone?: string | null
          email_notifications?: boolean | null
          id?: string
          lead_auto_assignment?: boolean | null
          metadata?: Json | null
          organization_id: string
          primary_color?: string | null
          secondary_color?: string | null
          time_format?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_format?: string | null
          deal_auto_probability?: boolean | null
          default_currency?: string | null
          default_pipeline_id?: string | null
          default_timezone?: string | null
          email_notifications?: boolean | null
          id?: string
          lead_auto_assignment?: boolean | null
          metadata?: Json | null
          organization_id?: string
          primary_color?: string | null
          secondary_color?: string | null
          time_format?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_default_pipeline_id_fkey"
            columns: ["default_pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          settings: Json | null
          size: string | null
          slug: string
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          settings?: Json | null
          size?: string | null
          slug: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          settings?: Json | null
          size?: string | null
          slug?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      pf_agent_mappings: {
        Row: {
          agent_email: string | null
          agent_id: string
          agent_name: string | null
          agent_phone: string | null
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          portal_account_id: string
          portal_agent_id: string
          updated_at: string | null
        }
        Insert: {
          agent_email?: string | null
          agent_id: string
          agent_name?: string | null
          agent_phone?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          portal_account_id: string
          portal_agent_id: string
          updated_at?: string | null
        }
        Update: {
          agent_email?: string | null
          agent_id?: string
          agent_name?: string | null
          agent_phone?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          portal_account_id?: string
          portal_agent_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pf_agent_mappings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pf_agent_mappings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pf_agent_mappings_portal_account_id_fkey"
            columns: ["portal_account_id"]
            isOneToOne: false
            referencedRelation: "portal_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_lost: boolean
          is_won: boolean
          name: string
          organization_id: string
          pipeline_id: string
          probability: number | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_lost?: boolean
          is_won?: boolean
          name: string
          organization_id: string
          pipeline_id: string
          probability?: number | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_lost?: boolean
          is_won?: boolean
          name?: string
          organization_id?: string
          pipeline_id?: string
          probability?: number | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          organization_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          organization_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          organization_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipelines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_accounts: {
        Row: {
          access_token_encrypted: string | null
          account_name: string
          api_key_encrypted: string | null
          api_secret_encrypted: string | null
          auto_publish: boolean | null
          company_id: string
          created_at: string
          created_by: string | null
          credentials: Json
          error_message: string | null
          id: string
          last_error_message: string | null
          last_health_check_at: string | null
          last_sync_at: string | null
          portal_id: string
          portal_type: string | null
          status: string
          sync_schedule: string | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token_encrypted?: string | null
          account_name: string
          api_key_encrypted?: string | null
          api_secret_encrypted?: string | null
          auto_publish?: boolean | null
          company_id: string
          created_at?: string
          created_by?: string | null
          credentials?: Json
          error_message?: string | null
          id?: string
          last_error_message?: string | null
          last_health_check_at?: string | null
          last_sync_at?: string | null
          portal_id: string
          portal_type?: string | null
          status?: string
          sync_schedule?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token_encrypted?: string | null
          account_name?: string
          api_key_encrypted?: string | null
          api_secret_encrypted?: string | null
          auto_publish?: boolean | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          credentials?: Json
          error_message?: string | null
          id?: string
          last_error_message?: string | null
          last_health_check_at?: string | null
          last_sync_at?: string | null
          portal_id?: string
          portal_type?: string | null
          status?: string
          sync_schedule?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_accounts_portal_id_fkey"
            columns: ["portal_id"]
            isOneToOne: false
            referencedRelation: "portals"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_agent_mappings: {
        Row: {
          company_id: string
          created_at: string | null
          crm_agent_id: string | null
          id: string
          is_verified: boolean | null
          portal: string
          portal_agent_email: string | null
          portal_agent_id: string
          portal_agent_name: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          crm_agent_id?: string | null
          id?: string
          is_verified?: boolean | null
          portal: string
          portal_agent_email?: string | null
          portal_agent_id: string
          portal_agent_name?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          crm_agent_id?: string | null
          id?: string
          is_verified?: boolean | null
          portal?: string
          portal_agent_email?: string | null
          portal_agent_id?: string
          portal_agent_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_agent_mappings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_agent_mappings_crm_agent_id_fkey"
            columns: ["crm_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_import_errors: {
        Row: {
          company_id: string
          created_at: string
          error_message: string
          error_type: string | null
          id: string
          lead_data: Json
          portal_name: string
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          error_message: string
          error_type?: string | null
          id?: string
          lead_data: Json
          portal_name: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          error_message?: string
          error_type?: string | null
          id?: string
          lead_data?: Json
          portal_name?: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_import_errors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_import_errors_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_integrations: {
        Row: {
          api_key_encrypted: string | null
          auto_sync: boolean | null
          company_id: string
          created_at: string
          credentials: Json | null
          default_agent_id: string | null
          error_message: string | null
          id: string
          is_connected: boolean | null
          last_sync_at: string | null
          portal_id: string
          sync_frequency: string | null
          sync_status: string | null
          updated_at: string
        }
        Insert: {
          api_key_encrypted?: string | null
          auto_sync?: boolean | null
          company_id: string
          created_at?: string
          credentials?: Json | null
          default_agent_id?: string | null
          error_message?: string | null
          id?: string
          is_connected?: boolean | null
          last_sync_at?: string | null
          portal_id: string
          sync_frequency?: string | null
          sync_status?: string | null
          updated_at?: string
        }
        Update: {
          api_key_encrypted?: string | null
          auto_sync?: boolean | null
          company_id?: string
          created_at?: string
          credentials?: Json | null
          default_agent_id?: string | null
          error_message?: string | null
          id?: string
          is_connected?: boolean | null
          last_sync_at?: string | null
          portal_id?: string
          sync_frequency?: string | null
          sync_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_integrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_integrations_default_agent_id_fkey"
            columns: ["default_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_integrations_portal_id_fkey"
            columns: ["portal_id"]
            isOneToOne: false
            referencedRelation: "portals"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_leads: {
        Row: {
          assigned_agent_id: string | null
          company_id: string
          created_at: string
          email: string | null
          error_message: string | null
          group_id: string | null
          id: string
          listing_id: string | null
          message: string | null
          name: string
          opted_in: boolean | null
          phone: string | null
          portal_lead_id: string
          portal_name: string
          raw_data: Json | null
          source: string | null
          stage_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_agent_id?: string | null
          company_id: string
          created_at?: string
          email?: string | null
          error_message?: string | null
          group_id?: string | null
          id?: string
          listing_id?: string | null
          message?: string | null
          name: string
          opted_in?: boolean | null
          phone?: string | null
          portal_lead_id: string
          portal_name: string
          raw_data?: Json | null
          source?: string | null
          stage_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_agent_id?: string | null
          company_id?: string
          created_at?: string
          email?: string | null
          error_message?: string | null
          group_id?: string | null
          id?: string
          listing_id?: string | null
          message?: string | null
          name?: string
          opted_in?: boolean | null
          phone?: string | null
          portal_lead_id?: string
          portal_name?: string
          raw_data?: Json | null
          source?: string | null
          stage_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_leads_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_leads_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "lead_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_leads_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_leads_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "lead_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_listing_publications: {
        Row: {
          agent_id: string
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          expires_at: string | null
          id: string
          is_deleted: boolean
          last_error_details: Json | null
          last_error_message: string | null
          last_synced_at: string | null
          listing_id: string
          pf_listing_id: string | null
          pf_reference: string | null
          portal_account_id: string | null
          portal_currency: string | null
          portal_description: string | null
          portal_id: string
          portal_images: Json | null
          portal_listing_id: string | null
          portal_metadata: Json | null
          portal_price: number | null
          portal_title: string
          portal_url: string | null
          published_at: string | null
          queued_at: string | null
          sent_at: string | null
          status: string
          unpublished_at: string | null
          updated_at: string
          validation_errors: Json | null
        }
        Insert: {
          agent_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          is_deleted?: boolean
          last_error_details?: Json | null
          last_error_message?: string | null
          last_synced_at?: string | null
          listing_id: string
          pf_listing_id?: string | null
          pf_reference?: string | null
          portal_account_id?: string | null
          portal_currency?: string | null
          portal_description?: string | null
          portal_id: string
          portal_images?: Json | null
          portal_listing_id?: string | null
          portal_metadata?: Json | null
          portal_price?: number | null
          portal_title: string
          portal_url?: string | null
          published_at?: string | null
          queued_at?: string | null
          sent_at?: string | null
          status?: string
          unpublished_at?: string | null
          updated_at?: string
          validation_errors?: Json | null
        }
        Update: {
          agent_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          is_deleted?: boolean
          last_error_details?: Json | null
          last_error_message?: string | null
          last_synced_at?: string | null
          listing_id?: string
          pf_listing_id?: string | null
          pf_reference?: string | null
          portal_account_id?: string | null
          portal_currency?: string | null
          portal_description?: string | null
          portal_id?: string
          portal_images?: Json | null
          portal_listing_id?: string | null
          portal_metadata?: Json | null
          portal_price?: number | null
          portal_title?: string
          portal_url?: string | null
          published_at?: string | null
          queued_at?: string | null
          sent_at?: string | null
          status?: string
          unpublished_at?: string | null
          updated_at?: string
          validation_errors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_listing_publications_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_listing_publications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_listing_publications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_listing_publications_portal_account_id_fkey"
            columns: ["portal_account_id"]
            isOneToOne: false
            referencedRelation: "portal_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_listing_publications_portal_id_fkey"
            columns: ["portal_id"]
            isOneToOne: false
            referencedRelation: "portals"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_publish_logs: {
        Row: {
          action: string
          company_id: string
          created_at: string | null
          error_message: string | null
          id: string
          listing_id: string
          portal: string
          portal_account_id: string | null
          portal_listing_id: string | null
          request_payload: Json | null
          response_payload: Json | null
          success: boolean
          user_id: string | null
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          listing_id: string
          portal?: string
          portal_account_id?: string | null
          portal_listing_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          success?: boolean
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          listing_id?: string
          portal?: string
          portal_account_id?: string | null
          portal_listing_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          success?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_publish_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_publish_logs_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_publish_logs_portal_account_id_fkey"
            columns: ["portal_account_id"]
            isOneToOne: false
            referencedRelation: "portal_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_publish_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_webhook_events: {
        Row: {
          company_id: string
          created_at: string
          created_lead_id: string | null
          event_type: string
          id: string
          ip_address: string | null
          next_retry_at: string | null
          payload: Json
          portal: string
          portal_agent_id: string | null
          portal_lead_id: string | null
          portal_listing_id: string | null
          processed: boolean
          processed_at: string | null
          processing_error: string | null
          received_at: string
          retry_count: number
          signature: string | null
          user_agent: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_lead_id?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          next_retry_at?: string | null
          payload: Json
          portal: string
          portal_agent_id?: string | null
          portal_lead_id?: string | null
          portal_listing_id?: string | null
          processed?: boolean
          processed_at?: string | null
          processing_error?: string | null
          received_at?: string
          retry_count?: number
          signature?: string | null
          user_agent?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_lead_id?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          next_retry_at?: string | null
          payload?: Json
          portal?: string
          portal_agent_id?: string | null
          portal_lead_id?: string | null
          portal_listing_id?: string | null
          processed?: boolean
          processed_at?: string | null
          processing_error?: string | null
          received_at?: string
          retry_count?: number
          signature?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_webhook_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_webhook_events_created_lead_id_fkey"
            columns: ["created_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_webhook_logs: {
        Row: {
          action: string
          company_id: string
          created_at: string
          details: Json | null
          error_code: string | null
          error_message: string | null
          id: string
          portal: string
          processing_time_ms: number | null
          success: boolean
          webhook_event_id: string | null
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          details?: Json | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          portal: string
          processing_time_ms?: number | null
          success: boolean
          webhook_event_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          details?: Json | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          portal?: string
          processing_time_ms?: number | null
          success?: boolean
          webhook_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_webhook_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_webhook_logs_webhook_event_id_fkey"
            columns: ["webhook_event_id"]
            isOneToOne: false
            referencedRelation: "portal_webhook_events"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_webhooks: {
        Row: {
          company_id: string
          created_at: string
          id: string
          last_verified_at: string | null
          metadata: Json | null
          portal: string
          secret_token: string | null
          status: string
          updated_at: string
          verification_error: string | null
          webhook_url: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          last_verified_at?: string | null
          metadata?: Json | null
          portal: string
          secret_token?: string | null
          status?: string
          updated_at?: string
          verification_error?: string | null
          webhook_url: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          last_verified_at?: string | null
          metadata?: Json | null
          portal?: string
          secret_token?: string | null
          status?: string
          updated_at?: string
          verification_error?: string | null
          webhook_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_webhooks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      portals: {
        Row: {
          base_url: string | null
          country: string | null
          created_at: string
          display_name: string
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
        }
        Insert: {
          base_url?: string | null
          country?: string | null
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
        }
        Update: {
          base_url?: string | null
          country?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
      pricing_plans: {
        Row: {
          can_activate_chatbots: boolean
          can_manage_team: boolean
          can_send_campaigns: boolean
          can_use_advanced_assignment: boolean
          can_use_automations: boolean
          can_use_custom_roles: boolean
          created_at: string
          has_dedicated_manager: boolean
          has_priority_support: boolean
          id: string
          lead_limit: number | null
          listing_limit: number | null
          name: string
          plan_type: Database["public"]["Enums"]["plan_type"]
          price_monthly: number
          price_yearly: number
          user_limit: number
        }
        Insert: {
          can_activate_chatbots?: boolean
          can_manage_team?: boolean
          can_send_campaigns?: boolean
          can_use_advanced_assignment?: boolean
          can_use_automations?: boolean
          can_use_custom_roles?: boolean
          created_at?: string
          has_dedicated_manager?: boolean
          has_priority_support?: boolean
          id?: string
          lead_limit?: number | null
          listing_limit?: number | null
          name: string
          plan_type: Database["public"]["Enums"]["plan_type"]
          price_monthly?: number
          price_yearly?: number
          user_limit?: number
        }
        Update: {
          can_activate_chatbots?: boolean
          can_manage_team?: boolean
          can_send_campaigns?: boolean
          can_use_advanced_assignment?: boolean
          can_use_automations?: boolean
          can_use_custom_roles?: boolean
          created_at?: string
          has_dedicated_manager?: boolean
          has_priority_support?: boolean
          id?: string
          lead_limit?: number | null
          listing_limit?: number | null
          name?: string
          plan_type?: Database["public"]["Enums"]["plan_type"]
          price_monthly?: number
          price_yearly?: number
          user_limit?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          currency: string
          dashboard_preferences: Json | null
          first_name: string | null
          id: string
          job_title: string | null
          language: string
          last_name: string | null
          onboarding_completed: boolean
          phone: string | null
          product_mode: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          currency?: string
          dashboard_preferences?: Json | null
          first_name?: string | null
          id: string
          job_title?: string | null
          language?: string
          last_name?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          product_mode?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          currency?: string
          dashboard_preferences?: Json | null
          first_name?: string | null
          id?: string
          job_title?: string | null
          language?: string
          last_name?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          product_mode?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          agent_id: string | null
          amenities: string[] | null
          area: string | null
          bathrooms: number | null
          bedrooms: number | null
          city: string | null
          company_id: string | null
          completion_status: string | null
          country: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          description: string | null
          description_ar: string | null
          features: string[] | null
          furnishing: string | null
          id: string
          inquiries_count: number | null
          is_company_listing: boolean | null
          is_featured: boolean | null
          latitude: number | null
          listing_type: string
          location: string | null
          longitude: number | null
          permit_number: string | null
          price: number | null
          price_frequency: string | null
          property_type: string
          ref_number: string | null
          size: number | null
          size_unit: string | null
          status: string
          title: string
          title_ar: string | null
          updated_at: string
          views_count: number | null
        }
        Insert: {
          agent_id?: string | null
          amenities?: string[] | null
          area?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          company_id?: string | null
          completion_status?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          description_ar?: string | null
          features?: string[] | null
          furnishing?: string | null
          id?: string
          inquiries_count?: number | null
          is_company_listing?: boolean | null
          is_featured?: boolean | null
          latitude?: number | null
          listing_type: string
          location?: string | null
          longitude?: number | null
          permit_number?: string | null
          price?: number | null
          price_frequency?: string | null
          property_type: string
          ref_number?: string | null
          size?: number | null
          size_unit?: string | null
          status?: string
          title: string
          title_ar?: string | null
          updated_at?: string
          views_count?: number | null
        }
        Update: {
          agent_id?: string | null
          amenities?: string[] | null
          area?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          company_id?: string | null
          completion_status?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string | null
          description_ar?: string | null
          features?: string[] | null
          furnishing?: string | null
          id?: string
          inquiries_count?: number | null
          is_company_listing?: boolean | null
          is_featured?: boolean | null
          latitude?: number | null
          listing_type?: string
          location?: string | null
          longitude?: number | null
          permit_number?: string | null
          price?: number | null
          price_frequency?: string | null
          property_type?: string
          ref_number?: string | null
          size?: number | null
          size_unit?: string | null
          status?: string
          title?: string
          title_ar?: string | null
          updated_at?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      property_finder_accounts: {
        Row: {
          api_key_encrypted: string | null
          company_id: string
          created_at: string
          id: string
          last_sync_at: string | null
          pf_company_id: string | null
          status: string
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          api_key_encrypted?: string | null
          company_id: string
          created_at?: string
          id?: string
          last_sync_at?: string | null
          pf_company_id?: string | null
          status?: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          api_key_encrypted?: string | null
          company_id?: string
          created_at?: string
          id?: string
          last_sync_at?: string | null
          pf_company_id?: string | null
          status?: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_finder_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      property_finder_agents: {
        Row: {
          company_id: string
          created_at: string
          crm_agent_id: string | null
          id: string
          is_active: boolean
          pf_agent_email: string | null
          pf_agent_id: string
          pf_agent_name: string | null
          pf_agent_phone: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          crm_agent_id?: string | null
          id?: string
          is_active?: boolean
          pf_agent_email?: string | null
          pf_agent_id: string
          pf_agent_name?: string | null
          pf_agent_phone?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          crm_agent_id?: string | null
          id?: string
          is_active?: boolean
          pf_agent_email?: string | null
          pf_agent_id?: string
          pf_agent_name?: string | null
          pf_agent_phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_finder_agents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_finder_agents_crm_agent_id_fkey"
            columns: ["crm_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      property_finder_field_mappings: {
        Row: {
          company_id: string
          created_at: string
          crm_field_name: string
          id: string
          is_active: boolean
          pf_field_name: string
          transform_rule: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          crm_field_name: string
          id?: string
          is_active?: boolean
          pf_field_name: string
          transform_rule?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          crm_field_name?: string
          id?: string
          is_active?: boolean
          pf_field_name?: string
          transform_rule?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_finder_field_mappings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      property_finder_logs: {
        Row: {
          company_id: string
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          lead_id: string | null
          listing_id: string | null
          pf_agent_id: string | null
          processed_data: Json | null
          processing_time_ms: number | null
          raw_payload: Json | null
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          lead_id?: string | null
          listing_id?: string | null
          pf_agent_id?: string | null
          processed_data?: Json | null
          processing_time_ms?: number | null
          raw_payload?: Json | null
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          lead_id?: string | null
          listing_id?: string | null
          pf_agent_id?: string | null
          processed_data?: Json | null
          processing_time_ms?: number | null
          raw_payload?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_finder_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_finder_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      property_media: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          file_size: number | null
          id: string
          is_cover: boolean | null
          media_type: string
          mime_type: string | null
          position: number | null
          property_id: string
          thumbnail_url: string | null
          title: string | null
          url: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          file_size?: number | null
          id?: string
          is_cover?: boolean | null
          media_type: string
          mime_type?: string | null
          position?: number | null
          property_id: string
          thumbnail_url?: string | null
          title?: string | null
          url: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          file_size?: number | null
          id?: string
          is_cover?: boolean | null
          media_type?: string
          mime_type?: string | null
          position?: number | null
          property_id?: string
          thumbnail_url?: string | null
          title?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_media_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_media_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_pdfs: {
        Row: {
          company_id: string
          created_at: string
          file_size: number | null
          generated_by: string | null
          id: string
          language: string | null
          pdf_url: string
          property_id: string
          template_type: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          file_size?: number | null
          generated_by?: string | null
          id?: string
          language?: string | null
          pdf_url: string
          property_id: string
          template_type?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          file_size?: number | null
          generated_by?: string | null
          id?: string
          language?: string | null
          pdf_url?: string
          property_id?: string
          template_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_pdfs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_pdfs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_publications: {
        Row: {
          assigned_agent_id: string | null
          company_id: string
          created_at: string
          custom_description: string | null
          custom_images: string[] | null
          custom_price: number | null
          custom_title: string | null
          error_message: string | null
          id: string
          last_sync_at: string | null
          portal_id: string
          portal_listing_id: string | null
          portal_url: string | null
          property_id: string
          published_at: string | null
          status: string
          unpublished_at: string | null
          updated_at: string
        }
        Insert: {
          assigned_agent_id?: string | null
          company_id: string
          created_at?: string
          custom_description?: string | null
          custom_images?: string[] | null
          custom_price?: number | null
          custom_title?: string | null
          error_message?: string | null
          id?: string
          last_sync_at?: string | null
          portal_id: string
          portal_listing_id?: string | null
          portal_url?: string | null
          property_id: string
          published_at?: string | null
          status?: string
          unpublished_at?: string | null
          updated_at?: string
        }
        Update: {
          assigned_agent_id?: string | null
          company_id?: string
          created_at?: string
          custom_description?: string | null
          custom_images?: string[] | null
          custom_price?: number | null
          custom_title?: string | null
          error_message?: string | null
          id?: string
          last_sync_at?: string | null
          portal_id?: string
          portal_listing_id?: string | null
          portal_url?: string | null
          property_id?: string
          published_at?: string | null
          status?: string
          unpublished_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_publications_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_publications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_publications_portal_id_fkey"
            columns: ["portal_id"]
            isOneToOne: false
            referencedRelation: "portals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_publications_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      publication_activity_logs: {
        Row: {
          action: string
          company_id: string
          created_at: string
          details: Json | null
          id: string
          new_status: string | null
          old_status: string | null
          performed_by: string | null
          publication_id: string
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          details?: Json | null
          id?: string
          new_status?: string | null
          old_status?: string | null
          performed_by?: string | null
          publication_id: string
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          new_status?: string | null
          old_status?: string | null
          performed_by?: string | null
          publication_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publication_activity_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publication_activity_logs_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "portal_listing_publications"
            referencedColumns: ["id"]
          },
        ]
      }
      publish_jobs: {
        Row: {
          attempts: number
          company_id: string
          completed_at: string | null
          created_at: string
          id: string
          job_type: string
          last_error: string | null
          max_attempts: number
          payload: Json | null
          portal_id: string
          priority: number
          publication_id: string
          result: Json | null
          scheduled_at: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          company_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          job_type: string
          last_error?: string | null
          max_attempts?: number
          payload?: Json | null
          portal_id: string
          priority?: number
          publication_id: string
          result?: Json | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          company_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          job_type?: string
          last_error?: string | null
          max_attempts?: number
          payload?: Json | null
          portal_id?: string
          priority?: number
          publication_id?: string
          result?: Json | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "publish_jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publish_jobs_portal_id_fkey"
            columns: ["portal_id"]
            isOneToOne: false
            referencedRelation: "portals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publish_jobs_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "portal_listing_publications"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          permission_key?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      sms_accounts: {
        Row: {
          account_sid: string | null
          company_id: string
          connection_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          last_message_at: string | null
          message_limit: number | null
          messages_sent_today: number | null
          phone_number: string | null
          provider: string
          sender_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          account_sid?: string | null
          company_id: string
          connection_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_message_at?: string | null
          message_limit?: number | null
          messages_sent_today?: number | null
          phone_number?: string | null
          provider: string
          sender_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          account_sid?: string | null
          company_id?: string
          connection_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          last_message_at?: string | null
          message_limit?: number | null
          messages_sent_today?: number | null
          phone_number?: string | null
          provider?: string
          sender_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_accounts_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "marketing_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      source_integrations: {
        Row: {
          company_id: string
          created_at: string
          credentials: Json | null
          error_message: string | null
          id: string
          integration_type: string
          is_connected: boolean | null
          last_sync_at: string | null
          lead_source_id: string
          settings: Json | null
          sync_status: string | null
          updated_at: string
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          credentials?: Json | null
          error_message?: string | null
          id?: string
          integration_type: string
          is_connected?: boolean | null
          last_sync_at?: string | null
          lead_source_id: string
          settings?: Json | null
          sync_status?: string | null
          updated_at?: string
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          credentials?: Json | null
          error_message?: string | null
          id?: string
          integration_type?: string
          is_connected?: boolean | null
          last_sync_at?: string | null
          lead_source_id?: string
          settings?: Json | null
          sync_status?: string | null
          updated_at?: string
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "source_integrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          account_id: string | null
          assigned_to: string | null
          completed_at: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          description: string | null
          due_date: string | null
          id: string
          lead_id: string | null
          organization_id: string
          priority: Database["public"]["Enums"]["task_priority"]
          related_to_id: string | null
          related_to_type: Database["public"]["Enums"]["entity_type"] | null
          reminder_at: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          organization_id: string
          priority?: Database["public"]["Enums"]["task_priority"]
          related_to_id?: string | null
          related_to_type?: Database["public"]["Enums"]["entity_type"] | null
          reminder_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          organization_id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          related_to_id?: string | null
          related_to_type?: Database["public"]["Enums"]["entity_type"] | null
          reminder_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          agent_id: string
          id: string
          joined_at: string
          role: string | null
          team_id: string
        }
        Insert: {
          agent_id: string
          id?: string
          joined_at?: string
          role?: string | null
          team_id: string
        }
        Update: {
          agent_id?: string
          id?: string
          joined_at?: string
          role?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          leader_id: string | null
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          leader_id?: string | null
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          leader_id?: string | null
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tiktok_accounts: {
        Row: {
          access_token: string | null
          advertiser_id: string | null
          client_key: string | null
          client_secret: string | null
          company_id: string
          created_at: string
          id: string
          oauth_state: string | null
          refresh_token: string | null
          status: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          advertiser_id?: string | null
          client_key?: string | null
          client_secret?: string | null
          company_id: string
          created_at?: string
          id?: string
          oauth_state?: string | null
          refresh_token?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          advertiser_id?: string | null
          client_key?: string | null
          client_secret?: string | null
          company_id?: string
          created_at?: string
          id?: string
          oauth_state?: string | null
          refresh_token?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tiktok_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tiktok_lead_forms: {
        Row: {
          advertiser_id: string
          company_id: string
          created_at: string
          form_id: string
          form_name: string | null
          id: string
          last_synced_at: string | null
          leads_count: number | null
          status: string | null
          tiktok_account_id: string
        }
        Insert: {
          advertiser_id: string
          company_id: string
          created_at?: string
          form_id: string
          form_name?: string | null
          id?: string
          last_synced_at?: string | null
          leads_count?: number | null
          status?: string | null
          tiktok_account_id: string
        }
        Update: {
          advertiser_id?: string
          company_id?: string
          created_at?: string
          form_id?: string
          form_name?: string | null
          id?: string
          last_synced_at?: string | null
          leads_count?: number | null
          status?: string | null
          tiktok_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tiktok_lead_forms_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tiktok_lead_forms_tiktok_account_id_fkey"
            columns: ["tiktok_account_id"]
            isOneToOne: false
            referencedRelation: "tiktok_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      tiktok_webhook_events: {
        Row: {
          company_id: string
          created_at: string
          error_message: string | null
          event_type: string | null
          id: string
          payload: Json
          processed_at: string | null
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          error_message?: string | null
          event_type?: string | null
          id?: string
          payload: Json
          processed_at?: string | null
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          error_message?: string | null
          event_type?: string | null
          id?: string
          payload?: Json
          processed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "tiktok_webhook_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tiktok_webhooks: {
        Row: {
          company_id: string
          created_at: string
          events_received: number | null
          id: string
          last_event_at: string | null
          secret_key: string
          status: string
          updated_at: string
          webhook_url: string
        }
        Insert: {
          company_id: string
          created_at?: string
          events_received?: number | null
          id?: string
          last_event_at?: string | null
          secret_key: string
          status?: string
          updated_at?: string
          webhook_url: string
        }
        Update: {
          company_id?: string
          created_at?: string
          events_received?: number | null
          id?: string
          last_event_at?: string | null
          secret_key?: string
          status?: string
          updated_at?: string
          webhook_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "tiktok_webhooks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      website_form_fields: {
        Row: {
          created_at: string
          field_label: string | null
          field_name: string
          field_type: string
          form_id: string
          id: string
          is_required: boolean | null
          mapped_to: string | null
          options: Json | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          field_label?: string | null
          field_name: string
          field_type?: string
          form_id: string
          id?: string
          is_required?: boolean | null
          mapped_to?: string | null
          options?: Json | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          field_label?: string | null
          field_name?: string
          field_type?: string
          form_id?: string
          id?: string
          is_required?: boolean | null
          mapped_to?: string | null
          options?: Json | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "website_form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "website_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      website_form_submissions: {
        Row: {
          company_id: string
          created_at: string
          error_message: string | null
          form_id: string
          id: string
          ip_address: string | null
          lead_id: string | null
          page_url: string | null
          referrer_url: string | null
          status: string
          submission_data: Json
          user_agent: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          error_message?: string | null
          form_id: string
          id?: string
          ip_address?: string | null
          lead_id?: string | null
          page_url?: string | null
          referrer_url?: string | null
          status?: string
          submission_data: Json
          user_agent?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          error_message?: string | null
          form_id?: string
          id?: string
          ip_address?: string | null
          lead_id?: string | null
          page_url?: string | null
          referrer_url?: string | null
          status?: string
          submission_data?: Json
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "website_form_submissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "website_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_form_submissions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      website_forms: {
        Row: {
          auto_assign_rules: Json | null
          company_id: string
          created_at: string
          created_by: string | null
          field_mapping: Json | null
          form_name: string
          form_type: string
          id: string
          spam_protection: Json | null
          status: string
          success_redirect_url: string | null
          thank_you_message: string | null
          updated_at: string
        }
        Insert: {
          auto_assign_rules?: Json | null
          company_id: string
          created_at?: string
          created_by?: string | null
          field_mapping?: Json | null
          form_name: string
          form_type?: string
          id?: string
          spam_protection?: Json | null
          status?: string
          success_redirect_url?: string | null
          thank_you_message?: string | null
          updated_at?: string
        }
        Update: {
          auto_assign_rules?: Json | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          field_mapping?: Json | null
          form_name?: string
          form_type?: string
          id?: string
          spam_protection?: Json | null
          status?: string
          success_redirect_url?: string | null
          thank_you_message?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_forms_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_forms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_business_accounts: {
        Row: {
          access_token_encrypted: string | null
          business_name: string | null
          company_id: string
          created_at: string | null
          id: string
          meta_business_id: string
          status: string
          updated_at: string | null
          verified: boolean | null
        }
        Insert: {
          access_token_encrypted?: string | null
          business_name?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          meta_business_id: string
          status?: string
          updated_at?: string | null
          verified?: boolean | null
        }
        Update: {
          access_token_encrypted?: string | null
          business_name?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          meta_business_id?: string
          status?: string
          updated_at?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_business_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_phone_numbers: {
        Row: {
          code_verification_status: string | null
          company_id: string
          connection_id: string | null
          created_at: string | null
          display_name: string | null
          display_phone_number: string | null
          id: string
          last_webhook_at: string | null
          messaging_limit: string | null
          phone_number: string
          phone_number_id: string
          quality_rating: string | null
          status: string
          updated_at: string | null
          verified: boolean | null
          verified_name: string | null
          webhook_url: string | null
          webhook_verify_token: string | null
          whatsapp_business_account_id: string
        }
        Insert: {
          code_verification_status?: string | null
          company_id: string
          connection_id?: string | null
          created_at?: string | null
          display_name?: string | null
          display_phone_number?: string | null
          id?: string
          last_webhook_at?: string | null
          messaging_limit?: string | null
          phone_number: string
          phone_number_id: string
          quality_rating?: string | null
          status?: string
          updated_at?: string | null
          verified?: boolean | null
          verified_name?: string | null
          webhook_url?: string | null
          webhook_verify_token?: string | null
          whatsapp_business_account_id: string
        }
        Update: {
          code_verification_status?: string | null
          company_id?: string
          connection_id?: string | null
          created_at?: string | null
          display_name?: string | null
          display_phone_number?: string | null
          id?: string
          last_webhook_at?: string | null
          messaging_limit?: string | null
          phone_number?: string
          phone_number_id?: string
          quality_rating?: string | null
          status?: string
          updated_at?: string | null
          verified?: boolean | null
          verified_name?: string | null
          webhook_url?: string | null
          webhook_verify_token?: string | null
          whatsapp_business_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_phone_numbers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_phone_numbers_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "marketing_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_phone_numbers_whatsapp_business_account_id_fkey"
            columns: ["whatsapp_business_account_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_business_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          body: string
          buttons_json: Json | null
          category: string
          company_id: string
          created_at: string | null
          example_values: Json | null
          footer: string | null
          header_content: string | null
          header_type: string | null
          id: string
          language: string
          rejection_reason: string | null
          status: string
          template_id: string | null
          template_name: string
          updated_at: string | null
          whatsapp_business_account_id: string | null
        }
        Insert: {
          body: string
          buttons_json?: Json | null
          category: string
          company_id: string
          created_at?: string | null
          example_values?: Json | null
          footer?: string | null
          header_content?: string | null
          header_type?: string | null
          id?: string
          language?: string
          rejection_reason?: string | null
          status?: string
          template_id?: string | null
          template_name: string
          updated_at?: string | null
          whatsapp_business_account_id?: string | null
        }
        Update: {
          body?: string
          buttons_json?: Json | null
          category?: string
          company_id?: string
          created_at?: string | null
          example_values?: Json | null
          footer?: string | null
          header_content?: string | null
          header_type?: string | null
          id?: string
          language?: string
          rejection_reason?: string | null
          status?: string
          template_id?: string | null
          template_name?: string
          updated_at?: string | null
          whatsapp_business_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_templates_whatsapp_business_account_id_fkey"
            columns: ["whatsapp_business_account_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_business_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      dashboard_activities_summary: {
        Row: {
          activities_today: number | null
          activities_week: number | null
          calls_made: number | null
          company_id: string | null
          emails_sent: number | null
          meetings: number | null
          notes_added: number | null
          total_activities: number | null
          voice_notes_added: number | null
          whatsapp_actions: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_followups_summary: {
        Row: {
          company_id: string | null
          completed_followups: number | null
          missed_followups: number | null
          this_week_followups: number | null
          today_followups: number | null
          total_followups: number | null
          upcoming_followups: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_followups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_leads_by_agent: {
        Row: {
          agent_name: string | null
          assigned_agent_id: string | null
          company_id: string | null
          lost_leads: number | null
          new_today: number | null
          total_leads: number | null
          won_leads: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_leads_by_source: {
        Row: {
          company_id: string | null
          count: number | null
          source: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_leads_summary: {
        Row: {
          company_id: string | null
          hot_leads: number | null
          new_leads_month: number | null
          new_leads_today: number | null
          new_leads_week: number | null
          stage_contacted: number | null
          stage_lost: number | null
          stage_negotiation: number | null
          stage_new: number | null
          stage_proposal: number | null
          stage_qualified: number | null
          stage_won: number | null
          total_leads: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_listings_summary: {
        Row: {
          active_listings: number | null
          archived_listings: number | null
          company_id: string | null
          draft_listings: number | null
          new_this_week: number | null
          new_today: number | null
          rented_listings: number | null
          sold_listings: number | null
          total_listings: number | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      apply_assignment_rules: { Args: { p_lead_id: string }; Returns: string }
      assign_lead_to_agent: {
        Args: {
          p_assigned_by?: string
          p_change_reason?: string
          p_lead_id: string
          p_rule_id?: string
          p_to_agent_id: string
        }
        Returns: string
      }
      assign_pipeline_lead_agent: {
        Args: { p_entry_id: string; p_new_agent_id: string; p_notes?: string }
        Returns: boolean
      }
      bulk_assign_leads: {
        Args: {
          p_agent_id: string
          p_change_reason?: string
          p_lead_ids: string[]
        }
        Returns: number
      }
      can_add_user: { Args: { p_company_id: string }; Returns: boolean }
      can_publish_listing: { Args: { p_listing_id: string }; Returns: boolean }
      check_lead_consent: {
        Args: { p_channel: string; p_lead_id: string }
        Returns: boolean
      }
      check_lead_duplicate: {
        Args: { p_company_id: string; p_phone: string }
        Returns: string
      }
      check_lead_duplicate_v2: {
        Args: { p_company_id: string; p_email: string; p_phone: string }
        Returns: {
          lead_id: string
          match_type: string
        }[]
      }
      check_lead_source_duplicate: {
        Args: {
          p_company_id: string
          p_email: string
          p_external_id: string
          p_phone: string
        }
        Returns: {
          lead_id: string
          match_type: string
        }[]
      }
      check_pf_duplicate_lead: {
        Args: {
          p_company_id: string
          p_email?: string
          p_pf_lead_id?: string
          p_phone?: string
        }
        Returns: string
      }
      create_default_pf_field_mappings: {
        Args: { p_company_id: string }
        Returns: undefined
      }
      create_default_stages_for_company: {
        Args: { p_company_id: string }
        Returns: undefined
      }
      ensure_company_for_profile: {
        Args: { p_profile_id: string }
        Returns: string
      }
      expire_old_listings: { Args: never; Returns: undefined }
      find_or_create_lead_from_phone: {
        Args: {
          p_company_id: string
          p_name?: string
          p_phone_number: string
          p_source?: string
        }
        Returns: string
      }
      find_pf_lead_agent: {
        Args: {
          p_company_id: string
          p_pf_agent_email?: string
          p_pf_agent_id?: string
          p_portal_listing_id?: string
        }
        Returns: string
      }
      generate_api_key: { Args: never; Returns: string }
      generate_webhook_url: {
        Args: { p_company_id: string; p_portal: string }
        Returns: string
      }
      get_active_chatbot_for_phone: {
        Args: { p_company_id: string; p_phone_number: string }
        Returns: {
          chatbot_id: string
          chatbot_name: string
          fallback_message: string
          llm_model: string
          llm_provider: string
          max_tokens: number
          system_prompt: string
          temperature: number
          welcome_message: string
          whatsapp_connection_id: string
        }[]
      }
      get_agent_performance: {
        Args: { p_company_id: string }
        Returns: {
          activities_count: number
          agent_id: string
          agent_name: string
          conversion_rate: number
          total_leads: number
          won_leads: number
        }[]
      }
      get_assignment_analytics: {
        Args: { p_company_id: string }
        Returns: {
          active_leads: number
          agent_id: string
          agent_name: string
          assignments_today: number
          assignments_week: number
          conversion_rate: number
          is_available: boolean
          lost_leads: number
          pending_followups: number
          total_leads: number
          won_leads: number
        }[]
      }
      get_company_plan: {
        Args: { p_company_id: string }
        Returns: {
          can_activate_chatbots: boolean
          can_manage_team: boolean
          can_send_campaigns: boolean
          can_use_advanced_assignment: boolean
          can_use_automations: boolean
          can_use_custom_roles: boolean
          current_user_count: number
          has_dedicated_manager: boolean
          has_priority_support: boolean
          lead_limit: number
          listing_limit: number
          plan_name: string
          plan_type: Database["public"]["Enums"]["plan_type"]
          user_limit: number
        }[]
      }
      get_company_user_count: {
        Args: { p_company_id: string }
        Returns: number
      }
      get_connection_health_summary: {
        Args: { p_company_id: string }
        Returns: Json
      }
      get_dashboard_metrics: { Args: { p_company_id: string }; Returns: Json }
      get_default_connection: {
        Args: { p_channel: string; p_company_id: string }
        Returns: string
      }
      get_default_stage_id: { Args: { p_company_id: string }; Returns: string }
      get_lead_source_analytics: {
        Args: { p_company_id: string }
        Returns: {
          display_name: string
          last_error: string
          last_fetched_at: string
          leads_this_month: number
          leads_this_week: number
          leads_today: number
          source_id: string
          source_name: string
          status: string
          total_leads: number
        }[]
      }
      get_lead_trends: {
        Args: { p_company_id: string; p_days?: number }
        Returns: {
          count: number
          date: string
        }[]
      }
      get_leads_by_source: {
        Args: { p_company_id: string }
        Returns: {
          count: number
          source: string
        }[]
      }
      get_leads_by_stage: {
        Args: { p_company_id: string }
        Returns: {
          count: number
          stage: string
        }[]
      }
      get_listing_analytics_summary: {
        Args: { p_listing_id: string }
        Returns: Json
      }
      get_meta_webhook_stats: { Args: { p_company_id: string }; Returns: Json }
      get_next_meta_lead_agent: {
        Args: { p_company_id: string; p_form_id?: string }
        Returns: string
      }
      get_or_create_chatbot_session: {
        Args: {
          p_chatbot_id: string
          p_company_id: string
          p_lead_id?: string
          p_phone_number: string
        }
        Returns: string
      }
      get_or_create_pf_stage: {
        Args: { p_company_id: string }
        Returns: string
      }
      get_pipeline_stats: {
        Args: { p_pipeline_id: string }
        Returns: {
          lead_count: number
          percentage: number
          stage_id: string
          stage_name: string
          stage_order: number
        }[]
      }
      get_portal_webhook_stats_v2: {
        Args: { p_company_id: string; p_days?: number }
        Returns: Json
      }
      get_unassigned_portal_leads: {
        Args: { p_company_id: string; p_limit?: number }
        Returns: {
          created_at: string
          email: string
          error_message: string
          id: string
          name: string
          phone: string
          portal_name: string
        }[]
      }
      get_user_agent_id: { Args: never; Returns: string }
      get_user_company_id:
      | { Args: never; Returns: string }
      | { Args: { p_user_id: string }; Returns: string }
      get_user_org_ids: { Args: { _user_id: string }; Returns: string[] }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_webhook_stats: {
        Args: { p_company_id: string; p_days?: number; p_portal?: string }
        Returns: Json
      }
      has_org_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["org_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insert_lead_from_source: {
        Args: {
          p_ad_name?: string
          p_ad_set_name?: string
          p_campaign_name?: string
          p_company_id: string
          p_duplicate_action?: string
          p_email: string
          p_external_id: string
          p_form_id?: string
          p_form_name?: string
          p_name: string
          p_phone: string
          p_source_id: string
          p_source_metadata?: Json
        }
        Returns: Json
      }
      is_company_admin_or_manager:
      | { Args: never; Returns: boolean }
      | { Args: { p_company_id: string }; Returns: boolean }
      is_connection_admin: { Args: never; Returns: boolean }
      is_listing_admin: { Args: never; Returns: boolean }
      is_marketing_admin: {
        Args: { p_company_id: string; p_user_id: string }
        Returns: boolean
      }
      is_org_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      log_campaign_action: {
        Args: {
          p_action: string
          p_action_type: string
          p_campaign_id: string
          p_company_id: string
          p_details?: Json
          p_performed_by?: string
          p_recipient_id?: string
        }
        Returns: string
      }
      log_chatbot_action: {
        Args: {
          p_action_type: string
          p_chatbot_id: string
          p_company_id: string
          p_description: string
          p_details?: Json
          p_performed_by?: string
        }
        Returns: string
      }
      log_connection_action: {
        Args: {
          p_action_type: string
          p_company_id: string
          p_connection_id: string
          p_description: string
          p_details?: Json
        }
        Returns: string
      }
      log_lead_source_activity: {
        Args: {
          p_action: string
          p_company_id: string
          p_duration_ms?: number
          p_error_message?: string
          p_leads_created?: number
          p_leads_processed?: number
          p_leads_skipped?: number
          p_leads_updated?: number
          p_request_data?: Json
          p_response_data?: Json
          p_source_id: string
          p_status: string
        }
        Returns: string
      }
      log_listing_action: {
        Args: {
          p_action_type: string
          p_changes?: Json
          p_company_id: string
          p_description: string
          p_listing_id: string
        }
        Returns: string
      }
      log_pf_publish_action: {
        Args: {
          p_action: string
          p_company_id: string
          p_error_message?: string
          p_listing_id: string
          p_portal_account_id: string
          p_portal_listing_id?: string
          p_request_payload?: Json
          p_response_payload?: Json
          p_success: boolean
        }
        Returns: string
      }
      log_stage_mapping: {
        Args: {
          p_company_id: string
          p_lead_id: string
          p_mapped_stage_id: string
          p_original_stage: string
        }
        Returns: undefined
      }
      map_stage_name_to_id: {
        Args: { p_company_id: string; p_stage_name: string }
        Returns: string
      }
      match_chatbot_trigger: {
        Args: {
          p_chatbot_id: string
          p_is_first_message?: boolean
          p_message: string
        }
        Returns: {
          response_action: string
          response_message_id: string
          trigger_id: string
          trigger_type: string
        }[]
      }
      merge_lead_data: {
        Args: { p_force_agent?: boolean; p_lead_id: string; p_new_data: Json }
        Returns: boolean
      }
      move_pipeline_lead_stage: {
        Args: { p_entry_id: string; p_new_stage_id: string; p_notes?: string }
        Returns: boolean
      }
      normalize_phone: { Args: { phone_input: string }; Returns: string }
      normalize_phone_v2: { Args: { phone_input: string }; Returns: string }
      pf_auto_assign_lead: {
        Args: { p_company_id: string; p_listing_id: string }
        Returns: {
          agent_id: string
          assignment_reason: string
          assignment_source: string
        }[]
      }
      pf_get_listing_agent: {
        Args: { p_company_id: string; p_listing_id: string }
        Returns: string
      }
      pf_get_round_robin_agent: {
        Args: { p_company_id: string }
        Returns: string
      }
      process_listing_webhook_event: {
        Args: {
          p_company_id: string
          p_event_type: string
          p_payload: Json
          p_portal: string
          p_portal_listing_id: string
        }
        Returns: Json
      }
      process_meta_lead_webhook:
      | {
        Args: {
          p_ad_id?: string
          p_adgroup_id?: string
          p_campaign_id?: string
          p_company_id: string
          p_form_id: string
          p_lead_data?: Json
          p_lead_id_meta: string
          p_lead_source_id: string
          p_page_id: string
          p_raw_payload?: Json
        }
        Returns: Json
      }
      | {
        Args: {
          p_company_id: string
          p_created_time: number
          p_form_id: string
          p_lead_data?: Json
          p_lead_source_id?: string
          p_leadgen_id: string
          p_page_id: string
        }
        Returns: Json
      }
      process_pf_webhook: {
        Args: { p_company_id: string; p_payload: Json }
        Returns: Json
      }
      process_portal_lead: {
        Args: {
          p_company_id: string
          p_email: string
          p_listing_ref?: string
          p_message: string
          p_name: string
          p_phone: string
          p_portal_lead_id: string
          p_portal_name: string
          p_raw_data?: Json
        }
        Returns: Json
      }
      process_portal_lead_v2: {
        Args: {
          p_company_id: string
          p_email?: string
          p_message?: string
          p_name?: string
          p_phone?: string
          p_portal: string
          p_portal_agent_id?: string
          p_portal_lead_id: string
          p_portal_listing_id?: string
          p_raw_data?: Json
        }
        Returns: Json
      }
      process_portal_webhook_event: {
        Args: { p_event_id: string }
        Returns: Json
      }
      process_website_form_submission: {
        Args: {
          p_company_id: string
          p_form_id: string
          p_ip_address?: string
          p_page_url?: string
          p_referrer_url?: string
          p_submission_data: Json
          p_user_agent?: string
        }
        Returns: Json
      }
      queue_failed_for_retry: {
        Args: { p_campaign_id: string; p_max_retries?: number }
        Returns: number
      }
      retry_failed_meta_webhooks: {
        Args: { p_company_id: string; p_max_retries?: number }
        Returns: Json
      }
      retry_failed_webhook_events: {
        Args: { p_max_retries?: number }
        Returns: number
      }
      rollback_import: {
        Args: { p_job_id: string; p_user_id: string }
        Returns: Json
      }
      set_default_connection: {
        Args: {
          p_channel: string
          p_company_id: string
          p_connection_id: string
        }
        Returns: boolean
      }
      sync_meta_lead_form: {
        Args: {
          p_company_id: string
          p_form_id: string
          p_form_name: string
          p_lead_source_id: string
          p_page_id: string
          p_page_name: string
          p_status?: string
        }
        Returns: string
      }
      undo_lead_assignment: { Args: { p_lead_id: string }; Returns: boolean }
      update_agent_load: { Args: { p_agent_id: string }; Returns: undefined }
      update_chatbot_analytics: {
        Args: {
          p_chatbot_id: string
          p_company_id: string
          p_field: string
          p_increment?: number
        }
        Returns: undefined
      }
      update_connection_status: {
        Args: {
          p_connection_id: string
          p_error_message?: string
          p_status: string
        }
        Returns: boolean
      }
      validate_campaign_audience: {
        Args: { p_campaign_id: string }
        Returns: {
          duplicates: number
          missing_contact: number
          opted_out: number
          total_recipients: number
          valid_recipients: number
        }[]
      }
      validate_pf_publish_requirements: {
        Args: { p_listing_id: string; p_portal_account_id: string }
        Returns: Json
      }
      validate_portal_webhook: {
        Args: { p_company_id: string; p_portal: string; p_signature: string }
        Returns: boolean
      }
      validate_webhook_signature: {
        Args: { p_company_id: string; p_portal: string; p_signature: string }
        Returns: boolean
      }
    }
    Enums: {
      activity_type:
      | "call"
      | "email"
      | "meeting"
      | "note"
      | "task_completed"
      | "stage_change"
      | "other"
      agent_role: "admin" | "manager" | "team_leader" | "agent"
      agent_status: "invited" | "active" | "inactive" | "on_leave"
      app_role: "admin" | "manager" | "team_leader" | "agent"
      deal_status: "open" | "won" | "lost"
      entity_type: "contact" | "account" | "lead" | "deal" | "task" | "activity"
      org_role: "owner" | "admin" | "member" | "viewer"
      plan_type: "free" | "starter" | "growth" | "business"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "pending" | "in_progress" | "completed" | "cancelled"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {
      activity_type: [
        "call",
        "email",
        "meeting",
        "note",
        "task_completed",
        "stage_change",
        "other",
      ],
      agent_role: ["admin", "manager", "team_leader", "agent"],
      agent_status: ["invited", "active", "inactive", "on_leave"],
      app_role: ["admin", "manager", "team_leader", "agent"],
      deal_status: ["open", "won", "lost"],
      entity_type: ["contact", "account", "lead", "deal", "task", "activity"],
      org_role: ["owner", "admin", "member", "viewer"],
      plan_type: ["free", "starter", "growth", "business"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["pending", "in_progress", "completed", "cancelled"],
    },
  },
} as const
