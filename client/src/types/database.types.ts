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
    PostgrestVersion: "14.18"
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
      appointments: {
        Row: {
          branch_id: string
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string | null
          end_at: string
          id: string
          notes: string | null
          recurrence_group_id: string | null
          reminder_sent_at: string | null
          rescheduled_from_id: string | null
          room_id: string | null
          start_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          student_id: string
          therapist_id: string
          therapy_type: Database["public"]["Enums"]["therapy_type"]
          updated_at: string
        }
        Insert: {
          branch_id: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          end_at: string
          id?: string
          notes?: string | null
          recurrence_group_id?: string | null
          reminder_sent_at?: string | null
          rescheduled_from_id?: string | null
          room_id?: string | null
          start_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          student_id: string
          therapist_id: string
          therapy_type: Database["public"]["Enums"]["therapy_type"]
          updated_at?: string
        }
        Update: {
          branch_id?: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          end_at?: string
          id?: string
          notes?: string | null
          recurrence_group_id?: string | null
          reminder_sent_at?: string | null
          rescheduled_from_id?: string | null
          room_id?: string | null
          start_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          student_id?: string
          therapist_id?: string
          therapy_type?: Database["public"]["Enums"]["therapy_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_students_by_branch"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "appointments_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_recurrence_group_id_fkey"
            columns: ["recurrence_group_id"]
            isOneToOne: false
            referencedRelation: "recurrence_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_rescheduled_from_id_fkey"
            columns: ["rescheduled_from_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          assessment_date: string
          branch_id: string
          created_at: string
          finalized_at: string | null
          id: string
          recommendations: string | null
          responses: Json
          scores: Json | null
          status: Database["public"]["Enums"]["record_status"]
          student_id: string
          summary: string | null
          template_id: string
          template_version: number
          therapist_id: string
          therapy_type: Database["public"]["Enums"]["therapy_type"]
          updated_at: string
        }
        Insert: {
          assessment_date?: string
          branch_id: string
          created_at?: string
          finalized_at?: string | null
          id?: string
          recommendations?: string | null
          responses?: Json
          scores?: Json | null
          status?: Database["public"]["Enums"]["record_status"]
          student_id: string
          summary?: string | null
          template_id: string
          template_version: number
          therapist_id: string
          therapy_type: Database["public"]["Enums"]["therapy_type"]
          updated_at?: string
        }
        Update: {
          assessment_date?: string
          branch_id?: string
          created_at?: string
          finalized_at?: string | null
          id?: string
          recommendations?: string | null
          responses?: Json
          scores?: Json | null
          status?: Database["public"]["Enums"]["record_status"]
          student_id?: string
          summary?: string | null
          template_id?: string
          template_version?: number
          therapist_id?: string
          therapy_type?: Database["public"]["Enums"]["therapy_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_students_by_branch"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "assessments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          branch_id: string | null
          id: number
          new_data: Json | null
          occurred_at: string
          old_data: Json | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          branch_id?: string | null
          id?: never
          new_data?: Json | null
          occurred_at?: string
          old_data?: Json | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          branch_id?: string | null
          id?: never
          new_data?: Json | null
          occurred_at?: string
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      branch_holidays: {
        Row: {
          branch_id: string
          created_at: string
          holiday_date: string
          id: string
          reason: string | null
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          holiday_date: string
          id?: string
          reason?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          holiday_date?: string
          id?: string
          reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_holidays_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_holidays_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_students_by_branch"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          city: string | null
          code: string
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          is_active: boolean
          name: string
          opening_hours: Json
          phone: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          code: string
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          opening_hours?: Json
          phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          opening_hours?: Json
          phone?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      fee_plans: {
        Row: {
          amount: number
          billing_unit: Database["public"]["Enums"]["billing_unit"]
          branch_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          sessions_count: number | null
          therapy_type: Database["public"]["Enums"]["therapy_type"] | null
          updated_at: string
          validity_days: number | null
        }
        Insert: {
          amount: number
          billing_unit: Database["public"]["Enums"]["billing_unit"]
          branch_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sessions_count?: number | null
          therapy_type?: Database["public"]["Enums"]["therapy_type"] | null
          updated_at?: string
          validity_days?: number | null
        }
        Update: {
          amount?: number
          billing_unit?: Database["public"]["Enums"]["billing_unit"]
          branch_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sessions_count?: number | null
          therapy_type?: Database["public"]["Enums"]["therapy_type"] | null
          updated_at?: string
          validity_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_plans_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_plans_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_students_by_branch"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      form_templates: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["form_kind"]
          name: string
          schema: Json
          therapy_type: Database["public"]["Enums"]["therapy_type"] | null
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          kind: Database["public"]["Enums"]["form_kind"]
          name: string
          schema: Json
          therapy_type?: Database["public"]["Enums"]["therapy_type"] | null
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["form_kind"]
          name?: string
          schema?: Json
          therapy_type?: Database["public"]["Enums"]["therapy_type"] | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "form_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_progress: {
        Row: {
          goal_id: string
          id: string
          note: string | null
          prompt_level: string | null
          recorded_at: string
          recorded_by: string | null
          session_id: string | null
          successes: number | null
          trials: number | null
          value: number | null
        }
        Insert: {
          goal_id: string
          id?: string
          note?: string | null
          prompt_level?: string | null
          recorded_at?: string
          recorded_by?: string | null
          session_id?: string | null
          successes?: number | null
          trials?: number | null
          value?: number | null
        }
        Update: {
          goal_id?: string
          id?: string
          note?: string | null
          prompt_level?: string | null
          recorded_at?: string
          recorded_by?: string | null
          session_id?: string | null
          successes?: number | null
          trials?: number | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "goal_progress_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "therapy_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_progress_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_progress_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "therapy_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_counters: {
        Row: {
          branch_id: string
          last_no: number
          year: number
        }
        Insert: {
          branch_id: string
          last_no: number
          year: number
        }
        Update: {
          branch_id?: string
          last_no?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_counters_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_counters_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_students_by_branch"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          amount: number | null
          created_at: string
          description: string
          fee_plan_id: string | null
          id: string
          invoice_id: string
          quantity: number
          session_id: string | null
          unit_price: number
        }
        Insert: {
          amount?: number | null
          created_at?: string
          description: string
          fee_plan_id?: string | null
          id?: string
          invoice_id: string
          quantity?: number
          session_id?: string | null
          unit_price: number
        }
        Update: {
          amount?: number | null
          created_at?: string
          description?: string
          fee_plan_id?: string | null
          id?: string
          invoice_id?: string
          quantity?: number
          session_id?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_fee_plan_id_fkey"
            columns: ["fee_plan_id"]
            isOneToOne: false
            referencedRelation: "fee_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_outstanding_dues"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "invoice_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "therapy_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          balance: number | null
          branch_id: string
          created_at: string
          created_by: string | null
          discount: number
          due_date: string | null
          id: string
          invoice_no: string
          issue_date: string
          last_reminder_at: string | null
          notes: string | null
          period_end: string | null
          period_start: string | null
          reminder_count: number
          status: Database["public"]["Enums"]["invoice_status"]
          student_id: string
          subtotal: number
          total: number | null
          updated_at: string
          void_reason: string | null
          voided_at: string | null
        }
        Insert: {
          amount_paid?: number
          balance?: number | null
          branch_id: string
          created_at?: string
          created_by?: string | null
          discount?: number
          due_date?: string | null
          id?: string
          invoice_no: string
          issue_date?: string
          last_reminder_at?: string | null
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          reminder_count?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          student_id: string
          subtotal?: number
          total?: number | null
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
        }
        Update: {
          amount_paid?: number
          balance?: number | null
          branch_id?: string
          created_at?: string
          created_by?: string | null
          discount?: number
          due_date?: string | null
          id?: string
          invoice_no?: string
          issue_date?: string
          last_reminder_at?: string | null
          notes?: string | null
          period_end?: string | null
          period_start?: string | null
          reminder_count?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          student_id?: string
          subtotal?: number
          total?: number | null
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_students_by_branch"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          body_preview: string | null
          created_at: string
          id: string
          is_active: boolean
          language: string
          name: string
          provider_template_name: string
          purpose: Database["public"]["Enums"]["message_purpose"]
          updated_at: string
          variables: Json
        }
        Insert: {
          body_preview?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          language?: string
          name: string
          provider_template_name: string
          purpose: Database["public"]["Enums"]["message_purpose"]
          updated_at?: string
          variables?: Json
        }
        Update: {
          body_preview?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          language?: string
          name?: string
          provider_template_name?: string
          purpose?: Database["public"]["Enums"]["message_purpose"]
          updated_at?: string
          variables?: Json
        }
        Relationships: []
      }
      notification_schedules: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          is_active: boolean
          max_repeats: number | null
          offset_minutes: number
          purpose: Database["public"]["Enums"]["message_purpose"]
          repeat_every_days: number | null
          template_id: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          max_repeats?: number | null
          offset_minutes: number
          purpose: Database["public"]["Enums"]["message_purpose"]
          repeat_every_days?: number | null
          template_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          max_repeats?: number | null
          offset_minutes?: number
          purpose?: Database["public"]["Enums"]["message_purpose"]
          repeat_every_days?: number | null
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_schedules_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_schedules_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_students_by_branch"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "notification_schedules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          address: string | null
          created_at: string
          currency: string
          default_timezone: string
          email: string | null
          id: boolean
          legal_name: string | null
          logo_url: string | null
          name: string
          phone: string | null
          settings: Json
          updated_at: string
          website: string | null
          whatsapp_business_account_id: string | null
          whatsapp_phone_number_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          currency: string
          default_timezone: string
          email?: string | null
          id?: boolean
          legal_name?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          settings?: Json
          updated_at?: string
          website?: string | null
          whatsapp_business_account_id?: string | null
          whatsapp_phone_number_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          currency?: string
          default_timezone?: string
          email?: string | null
          id?: boolean
          legal_name?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          settings?: Json
          updated_at?: string
          website?: string | null
          whatsapp_business_account_id?: string | null
          whatsapp_phone_number_id?: string | null
        }
        Relationships: []
      }
      parents: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email: string | null
          full_name: string
          id: string
          national_id: string | null
          notes: string | null
          occupation: string | null
          opt_in_at: string | null
          phone: string | null
          preferred_language: string
          updated_at: string
          whatsapp_number: string | null
          whatsapp_opt_in: boolean
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          national_id?: string | null
          notes?: string | null
          occupation?: string | null
          opt_in_at?: string | null
          phone?: string | null
          preferred_language?: string
          updated_at?: string
          whatsapp_number?: string | null
          whatsapp_opt_in?: boolean
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          national_id?: string | null
          notes?: string | null
          occupation?: string | null
          opt_in_at?: string | null
          phone?: string | null
          preferred_language?: string
          updated_at?: string
          whatsapp_number?: string | null
          whatsapp_opt_in?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "parents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          branch_id: string
          created_at: string
          id: string
          invoice_id: string
          is_void: boolean
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          paid_at: string
          received_by: string | null
          reference_no: string | null
          student_id: string
          updated_at: string
          void_reason: string | null
          voided_at: string | null
        }
        Insert: {
          amount: number
          branch_id: string
          created_at?: string
          id?: string
          invoice_id: string
          is_void?: boolean
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          paid_at?: string
          received_by?: string | null
          reference_no?: string | null
          student_id: string
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
        }
        Update: {
          amount?: number
          branch_id?: string
          created_at?: string
          id?: string
          invoice_id?: string
          is_void?: boolean
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          paid_at?: string
          received_by?: string | null
          reference_no?: string | null
          student_id?: string
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_students_by_branch"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_outstanding_dues"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "payments_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          description: string | null
          key: string
          module: string
        }
        Insert: {
          description?: string | null
          key: string
          module: string
        }
        Update: {
          description?: string | null
          key?: string
          module?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string
          id: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      progress_reports: {
        Row: {
          branch_id: string
          content: Json
          created_at: string
          finalized_at: string | null
          id: string
          pdf_path: string | null
          period_end: string
          period_start: string
          shared_via_whatsapp_at: string | null
          status: Database["public"]["Enums"]["record_status"]
          student_id: string
          summary: string | null
          template_id: string | null
          therapist_id: string
          therapy_type: Database["public"]["Enums"]["therapy_type"]
          updated_at: string
        }
        Insert: {
          branch_id: string
          content?: Json
          created_at?: string
          finalized_at?: string | null
          id?: string
          pdf_path?: string | null
          period_end: string
          period_start: string
          shared_via_whatsapp_at?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          student_id: string
          summary?: string | null
          template_id?: string | null
          therapist_id: string
          therapy_type: Database["public"]["Enums"]["therapy_type"]
          updated_at?: string
        }
        Update: {
          branch_id?: string
          content?: Json
          created_at?: string
          finalized_at?: string | null
          id?: string
          pdf_path?: string | null
          period_end?: string
          period_start?: string
          shared_via_whatsapp_at?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          student_id?: string
          summary?: string | null
          template_id?: string | null
          therapist_id?: string
          therapy_type?: Database["public"]["Enums"]["therapy_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_reports_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_reports_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_students_by_branch"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "progress_reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_reports_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_reports_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recurrence_groups: {
        Row: {
          branch_id: string
          created_at: string
          created_by: string | null
          duration_min: number
          end_date: string
          id: string
          start_date: string
          start_time: string
          student_id: string
          therapist_id: string
          therapy_type: Database["public"]["Enums"]["therapy_type"]
          updated_at: string
          weekdays: number[]
        }
        Insert: {
          branch_id: string
          created_at?: string
          created_by?: string | null
          duration_min: number
          end_date: string
          id?: string
          start_date: string
          start_time: string
          student_id: string
          therapist_id: string
          therapy_type: Database["public"]["Enums"]["therapy_type"]
          updated_at?: string
          weekdays: number[]
        }
        Update: {
          branch_id?: string
          created_at?: string
          created_by?: string | null
          duration_min?: number
          end_date?: string
          id?: string
          start_date?: string
          start_time?: string
          student_id?: string
          therapist_id?: string
          therapy_type?: Database["public"]["Enums"]["therapy_type"]
          updated_at?: string
          weekdays?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "recurrence_groups_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurrence_groups_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_students_by_branch"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "recurrence_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurrence_groups_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurrence_groups_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          permission_key?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
        ]
      }
      rooms: {
        Row: {
          branch_id: string
          capacity: number
          created_at: string
          id: string
          is_active: boolean
          name: string
          therapy_type: Database["public"]["Enums"]["therapy_type"] | null
          updated_at: string
        }
        Insert: {
          branch_id: string
          capacity?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          therapy_type?: Database["public"]["Enums"]["therapy_type"] | null
          updated_at?: string
        }
        Update: {
          branch_id?: string
          capacity?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          therapy_type?: Database["public"]["Enums"]["therapy_type"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_students_by_branch"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      staff_attendance: {
        Row: {
          branch_id: string
          check_in: string | null
          check_out: string | null
          created_at: string
          id: string
          marked_by: string | null
          notes: string | null
          profile_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at: string
          work_date: string
        }
        Insert: {
          branch_id: string
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          id?: string
          marked_by?: string | null
          notes?: string | null
          profile_id: string
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
          work_date: string
        }
        Update: {
          branch_id?: string
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          id?: string
          marked_by?: string | null
          notes?: string | null
          profile_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_attendance_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_attendance_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_students_by_branch"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "staff_attendance_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_attendance_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_branches: {
        Row: {
          branch_id: string
          created_at: string
          is_primary: boolean
          profile_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          is_primary?: boolean
          profile_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          is_primary?: boolean
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_branches_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_branches_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_students_by_branch"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "staff_branches_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_details: {
        Row: {
          address: string | null
          calendar_color: string | null
          created_at: string
          date_of_birth: string | null
          designation: string | null
          emergency_contact: Json | null
          employee_code: string | null
          employment_type: string | null
          gender: Database["public"]["Enums"]["gender"] | null
          join_date: string | null
          license_expiry: string | null
          license_no: string | null
          notes: string | null
          profile_id: string
          qualifications: string | null
          therapy_types: Database["public"]["Enums"]["therapy_type"][]
          updated_at: string
        }
        Insert: {
          address?: string | null
          calendar_color?: string | null
          created_at?: string
          date_of_birth?: string | null
          designation?: string | null
          emergency_contact?: Json | null
          employee_code?: string | null
          employment_type?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          join_date?: string | null
          license_expiry?: string | null
          license_no?: string | null
          notes?: string | null
          profile_id: string
          qualifications?: string | null
          therapy_types?: Database["public"]["Enums"]["therapy_type"][]
          updated_at?: string
        }
        Update: {
          address?: string | null
          calendar_color?: string | null
          created_at?: string
          date_of_birth?: string | null
          designation?: string | null
          emergency_contact?: Json | null
          employee_code?: string | null
          employment_type?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          join_date?: string | null
          license_expiry?: string | null
          license_no?: string | null
          notes?: string | null
          profile_id?: string
          qualifications?: string | null
          therapy_types?: Database["public"]["Enums"]["therapy_type"][]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_details_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_leaves: {
        Row: {
          created_at: string
          from_date: string
          id: string
          leave_type: string
          profile_id: string
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["leave_status"]
          to_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_date: string
          id?: string
          leave_type?: string
          profile_id: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["leave_status"]
          to_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_date?: string
          id?: string
          leave_type?: string
          profile_id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["leave_status"]
          to_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_leaves_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_leaves_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_attendance: {
        Row: {
          appointment_id: string
          arrived_at: string | null
          attendance_date: string
          branch_id: string
          created_at: string
          id: string
          marked_by: string | null
          notes: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          appointment_id: string
          arrived_at?: string | null
          attendance_date: string
          branch_id: string
          created_at?: string
          id?: string
          marked_by?: string | null
          notes?: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          arrived_at?: string | null
          attendance_date?: string
          branch_id?: string
          created_at?: string
          id?: string
          marked_by?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_attendance_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_attendance_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_attendance_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_students_by_branch"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "student_attendance_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_documents: {
        Row: {
          created_at: string
          description: string | null
          doc_type: string | null
          file_name: string
          file_path: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          student_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          doc_type?: string | null
          file_name: string
          file_path: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          student_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          doc_type?: string | null
          file_name?: string
          file_path?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          student_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_documents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_fee_assignments: {
        Row: {
          branch_id: string
          created_at: string
          custom_amount: number | null
          discount_percent: number
          end_date: string | null
          fee_plan_id: string
          id: string
          notes: string | null
          start_date: string
          student_id: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          custom_amount?: number | null
          discount_percent?: number
          end_date?: string | null
          fee_plan_id: string
          id?: string
          notes?: string | null
          start_date?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          custom_amount?: number | null
          discount_percent?: number
          end_date?: string | null
          fee_plan_id?: string
          id?: string
          notes?: string | null
          start_date?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_fee_assignments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_fee_assignments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_students_by_branch"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "student_fee_assignments_fee_plan_id_fkey"
            columns: ["fee_plan_id"]
            isOneToOne: false
            referencedRelation: "fee_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_fee_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_parents: {
        Row: {
          created_at: string
          is_primary_contact: boolean
          parent_id: string
          receives_whatsapp: boolean
          relationship: string
          student_id: string
        }
        Insert: {
          created_at?: string
          is_primary_contact?: boolean
          parent_id: string
          receives_whatsapp?: boolean
          relationship: string
          student_id: string
        }
        Update: {
          created_at?: string
          is_primary_contact?: boolean
          parent_id?: string
          receives_whatsapp?: boolean
          relationship?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_parents_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_parents_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "v_outstanding_dues"
            referencedColumns: ["parent_id"]
          },
          {
            foreignKeyName: "student_parents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_therapists: {
        Row: {
          branch_id: string
          created_at: string
          end_date: string | null
          id: string
          start_date: string
          student_id: string
          therapist_id: string
          therapy_type: Database["public"]["Enums"]["therapy_type"]
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          start_date?: string
          student_id: string
          therapist_id: string
          therapy_type: Database["public"]["Enums"]["therapy_type"]
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          start_date?: string
          student_id?: string
          therapist_id?: string
          therapy_type?: Database["public"]["Enums"]["therapy_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_therapists_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_therapists_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_students_by_branch"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "student_therapists_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_therapists_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          allergies: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          deleted_at: string | null
          diagnosis: string[]
          discharge_date: string | null
          discharge_reason: string | null
          first_name: string
          gender: Database["public"]["Enums"]["gender"]
          grade: string | null
          home_branch_id: string
          id: string
          intake_date: string
          last_name: string | null
          medical_history: string | null
          medications: string | null
          notes: string | null
          photo_path: string | null
          preferred_name: string | null
          referral_source: string | null
          referred_by: string | null
          school_name: string | null
          status: Database["public"]["Enums"]["student_status"]
          student_code: string
          updated_at: string
        }
        Insert: {
          allergies?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          diagnosis?: string[]
          discharge_date?: string | null
          discharge_reason?: string | null
          first_name: string
          gender?: Database["public"]["Enums"]["gender"]
          grade?: string | null
          home_branch_id: string
          id?: string
          intake_date?: string
          last_name?: string | null
          medical_history?: string | null
          medications?: string | null
          notes?: string | null
          photo_path?: string | null
          preferred_name?: string | null
          referral_source?: string | null
          referred_by?: string | null
          school_name?: string | null
          status?: Database["public"]["Enums"]["student_status"]
          student_code?: string
          updated_at?: string
        }
        Update: {
          allergies?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          diagnosis?: string[]
          discharge_date?: string | null
          discharge_reason?: string | null
          first_name?: string
          gender?: Database["public"]["Enums"]["gender"]
          grade?: string | null
          home_branch_id?: string
          id?: string
          intake_date?: string
          last_name?: string | null
          medical_history?: string | null
          medications?: string | null
          notes?: string | null
          photo_path?: string | null
          preferred_name?: string | null
          referral_source?: string | null
          referred_by?: string | null
          school_name?: string | null
          status?: Database["public"]["Enums"]["student_status"]
          student_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_home_branch_id_fkey"
            columns: ["home_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_home_branch_id_fkey"
            columns: ["home_branch_id"]
            isOneToOne: false
            referencedRelation: "v_students_by_branch"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      therapist_availability: {
        Row: {
          branch_id: string
          created_at: string
          effective_from: string
          effective_to: string | null
          end_time: string
          id: string
          profile_id: string
          start_time: string
          updated_at: string
          weekday: number
        }
        Insert: {
          branch_id: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          end_time: string
          id?: string
          profile_id: string
          start_time: string
          updated_at?: string
          weekday: number
        }
        Update: {
          branch_id?: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          end_time?: string
          id?: string
          profile_id?: string
          start_time?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "therapist_availability_profile_id_branch_id_fkey"
            columns: ["profile_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "staff_branches"
            referencedColumns: ["profile_id", "branch_id"]
          },
        ]
      }
      therapy_goals: {
        Row: {
          achievable_notes: string | null
          achieved_at: string | null
          baseline_value: number | null
          created_at: string
          description: string
          domain: string | null
          id: string
          measurable_criteria: string | null
          plan_id: string
          relevance: string | null
          sort_order: number
          specific: string | null
          status: Database["public"]["Enums"]["goal_status"]
          target_date: string | null
          target_value: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          achievable_notes?: string | null
          achieved_at?: string | null
          baseline_value?: number | null
          created_at?: string
          description: string
          domain?: string | null
          id?: string
          measurable_criteria?: string | null
          plan_id: string
          relevance?: string | null
          sort_order?: number
          specific?: string | null
          status?: Database["public"]["Enums"]["goal_status"]
          target_date?: string | null
          target_value?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          achievable_notes?: string | null
          achieved_at?: string | null
          baseline_value?: number | null
          created_at?: string
          description?: string
          domain?: string | null
          id?: string
          measurable_criteria?: string | null
          plan_id?: string
          relevance?: string | null
          sort_order?: number
          specific?: string | null
          status?: Database["public"]["Enums"]["goal_status"]
          target_date?: string | null
          target_value?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "therapy_goals_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      therapy_sessions: {
        Row: {
          activities: string | null
          appointment_id: string | null
          branch_id: string
          created_at: string
          duration_min: number | null
          home_program: string | null
          id: string
          is_locked: boolean
          next_session_plan: string | null
          note_format: Database["public"]["Enums"]["note_format"]
          notes: Json
          parent_feedback: string | null
          plan_id: string | null
          session_date: string
          signed_at: string | null
          start_at: string | null
          student_id: string
          template_id: string | null
          therapist_id: string
          therapy_type: Database["public"]["Enums"]["therapy_type"]
          updated_at: string
        }
        Insert: {
          activities?: string | null
          appointment_id?: string | null
          branch_id: string
          created_at?: string
          duration_min?: number | null
          home_program?: string | null
          id?: string
          is_locked?: boolean
          next_session_plan?: string | null
          note_format?: Database["public"]["Enums"]["note_format"]
          notes?: Json
          parent_feedback?: string | null
          plan_id?: string | null
          session_date: string
          signed_at?: string | null
          start_at?: string | null
          student_id: string
          template_id?: string | null
          therapist_id: string
          therapy_type: Database["public"]["Enums"]["therapy_type"]
          updated_at?: string
        }
        Update: {
          activities?: string | null
          appointment_id?: string | null
          branch_id?: string
          created_at?: string
          duration_min?: number | null
          home_program?: string | null
          id?: string
          is_locked?: boolean
          next_session_plan?: string | null
          note_format?: Database["public"]["Enums"]["note_format"]
          notes?: Json
          parent_feedback?: string | null
          plan_id?: string | null
          session_date?: string
          signed_at?: string | null
          start_at?: string | null
          student_id?: string
          template_id?: string | null
          therapist_id?: string
          therapy_type?: Database["public"]["Enums"]["therapy_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "therapy_sessions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapy_sessions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapy_sessions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_students_by_branch"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "therapy_sessions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapy_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapy_sessions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapy_sessions_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_plans: {
        Row: {
          assessment_id: string | null
          branch_id: string
          created_at: string
          end_date: string | null
          id: string
          long_term_objective: string | null
          review_date: string | null
          start_date: string
          status: Database["public"]["Enums"]["plan_status"]
          student_id: string
          therapist_id: string
          therapy_type: Database["public"]["Enums"]["therapy_type"]
          title: string
          updated_at: string
        }
        Insert: {
          assessment_id?: string | null
          branch_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          long_term_objective?: string | null
          review_date?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["plan_status"]
          student_id: string
          therapist_id: string
          therapy_type: Database["public"]["Enums"]["therapy_type"]
          title: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string | null
          branch_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          long_term_objective?: string | null
          review_date?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["plan_status"]
          student_id?: string
          therapist_id?: string
          therapy_type?: Database["public"]["Enums"]["therapy_type"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plans_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_students_by_branch"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "treatment_plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permission_overrides: {
        Row: {
          created_at: string
          granted: boolean
          permission_key: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          granted: boolean
          permission_key: string
          profile_id: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          permission_key?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permission_overrides_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "user_permission_overrides_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          branch_id: string
          created_at: string
          delivered_at: string | null
          error_message: string | null
          failed_at: string | null
          id: string
          parent_id: string | null
          payload: Json
          provider_message_id: string | null
          purpose: Database["public"]["Enums"]["message_purpose"]
          queued_at: string
          read_at: string | null
          related_id: string | null
          related_type: string | null
          sent_at: string | null
          sent_by: string | null
          status: Database["public"]["Enums"]["msg_status"]
          student_id: string | null
          template_id: string | null
          to_number: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          parent_id?: string | null
          payload?: Json
          provider_message_id?: string | null
          purpose: Database["public"]["Enums"]["message_purpose"]
          queued_at?: string
          read_at?: string | null
          related_id?: string | null
          related_type?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: Database["public"]["Enums"]["msg_status"]
          student_id?: string | null
          template_id?: string | null
          to_number: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          parent_id?: string | null
          payload?: Json
          provider_message_id?: string | null
          purpose?: Database["public"]["Enums"]["message_purpose"]
          queued_at?: string
          read_at?: string | null
          related_id?: string | null
          related_type?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: Database["public"]["Enums"]["msg_status"]
          student_id?: string | null
          template_id?: string | null
          to_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_students_by_branch"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "whatsapp_messages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "v_outstanding_dues"
            referencedColumns: ["parent_id"]
          },
          {
            foreignKeyName: "whatsapp_messages_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_attendance_summary: {
        Row: {
          absent: number | null
          attendance_pct: number | null
          branch_id: string | null
          excused: number | null
          late: number | null
          month: string | null
          present: number | null
          student_id: string | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_attendance_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_attendance_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_students_by_branch"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "student_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      v_branch_dues_summary: {
        Row: {
          branch_id: string | null
          branch_name: string | null
          open_invoices: number | null
          overdue_amount: number | null
          total_outstanding: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_students_by_branch"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      v_branch_revenue_monthly: {
        Row: {
          branch_id: string | null
          branch_name: string | null
          month: string | null
          paying_students: number | null
          payments_count: number | null
          revenue: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_students_by_branch"
            referencedColumns: ["branch_id"]
          },
        ]
      }
      v_outstanding_dues: {
        Row: {
          amount_paid: number | null
          balance: number | null
          branch_id: string | null
          branch_name: string | null
          days_overdue: number | null
          due_date: string | null
          invoice_id: string | null
          invoice_no: string | null
          issue_date: string | null
          last_reminder_at: string | null
          parent_id: string | null
          parent_name: string | null
          reminder_count: number | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          student_code: string | null
          student_id: string | null
          student_name: string | null
          total: number | null
          whatsapp_number: string | null
          whatsapp_opt_in: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_students_by_branch"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      v_students_by_branch: {
        Row: {
          active_students: number | null
          branch_id: string | null
          branch_name: string | null
          new_this_month: number | null
          on_hold: number | null
          waitlist: number | null
        }
        Relationships: []
      }
      v_therapist_utilization: {
        Row: {
          branch_id: string | null
          cancelled: number | null
          completed: number | null
          completed_hours: number | null
          month: string | null
          no_show: number | null
          therapist_id: string | null
          therapist_name: string | null
          total_appointments: number | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "v_students_by_branch"
            referencedColumns: ["branch_id"]
          },
          {
            foreignKeyName: "appointments_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      my_permissions: { Args: never; Returns: string[] }
      refresh_invoice: { Args: { p_invoice_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "owner" | "admin" | "therapist"
      appointment_status:
        | "scheduled"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "no_show"
        | "rescheduled"
      attendance_status: "present" | "absent" | "late" | "excused"
      billing_unit: "per_session" | "monthly" | "package"
      form_kind: "assessment" | "soap" | "smart" | "progress_report"
      gender: "male" | "female" | "other" | "unspecified"
      goal_status: "active" | "achieved" | "discontinued" | "on_hold"
      invoice_status: "unpaid" | "partial" | "paid" | "void"
      leave_status: "pending" | "approved" | "rejected" | "cancelled"
      message_purpose:
        | "appointment_reminder"
        | "appointment_change"
        | "payment_reminder"
        | "absence_notice"
        | "report_ready"
        | "general"
      msg_status: "queued" | "sent" | "delivered" | "read" | "failed"
      note_format: "soap" | "smart"
      payment_method:
        | "cash"
        | "upi"
        | "bank_transfer"
        | "card"
        | "cheque"
        | "online"
        | "other"
      plan_status: "active" | "completed" | "on_hold" | "discontinued"
      record_status: "draft" | "final"
      student_status: "active" | "on_hold" | "discharged" | "waitlist"
      therapy_type: "speech" | "ot" | "physio" | "other"
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
      app_role: ["owner", "admin", "therapist"],
      appointment_status: [
        "scheduled",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
        "rescheduled",
      ],
      attendance_status: ["present", "absent", "late", "excused"],
      billing_unit: ["per_session", "monthly", "package"],
      form_kind: ["assessment", "soap", "smart", "progress_report"],
      gender: ["male", "female", "other", "unspecified"],
      goal_status: ["active", "achieved", "discontinued", "on_hold"],
      invoice_status: ["unpaid", "partial", "paid", "void"],
      leave_status: ["pending", "approved", "rejected", "cancelled"],
      message_purpose: [
        "appointment_reminder",
        "appointment_change",
        "payment_reminder",
        "absence_notice",
        "report_ready",
        "general",
      ],
      msg_status: ["queued", "sent", "delivered", "read", "failed"],
      note_format: ["soap", "smart"],
      payment_method: [
        "cash",
        "upi",
        "bank_transfer",
        "card",
        "cheque",
        "online",
        "other",
      ],
      plan_status: ["active", "completed", "on_hold", "discontinued"],
      record_status: ["draft", "final"],
      student_status: ["active", "on_hold", "discharged", "waitlist"],
      therapy_type: ["speech", "ot", "physio", "other"],
    },
  },
} as const
