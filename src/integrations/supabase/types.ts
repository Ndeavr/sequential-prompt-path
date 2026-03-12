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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agent_logs: {
        Row: {
          agent_name: string
          created_at: string
          id: string
          log_type: string
          message: string
          metadata: Json | null
          task_id: string | null
        }
        Insert: {
          agent_name: string
          created_at?: string
          id?: string
          log_type?: string
          message: string
          metadata?: Json | null
          task_id?: string | null
        }
        Update: {
          agent_name?: string
          created_at?: string
          id?: string
          log_type?: string
          message?: string
          metadata?: Json | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "agent_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_memory: {
        Row: {
          agent_key: string | null
          content: string
          created_at: string
          domain: string
          expires_at: string | null
          id: string
          importance: number | null
          memory_key: string
          memory_type: string
          metadata: Json | null
        }
        Insert: {
          agent_key?: string | null
          content: string
          created_at?: string
          domain?: string
          expires_at?: string | null
          id?: string
          importance?: number | null
          memory_key: string
          memory_type?: string
          metadata?: Json | null
        }
        Update: {
          agent_key?: string | null
          content?: string
          created_at?: string
          domain?: string
          expires_at?: string | null
          id?: string
          importance?: number | null
          memory_key?: string
          memory_type?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_memory_agent_key_fkey"
            columns: ["agent_key"]
            isOneToOne: false
            referencedRelation: "agent_registry"
            referencedColumns: ["agent_key"]
          },
        ]
      }
      agent_metrics: {
        Row: {
          id: string
          metadata: Json | null
          metric_category: string
          metric_name: string
          metric_value: number
          snapshot_at: string
        }
        Insert: {
          id?: string
          metadata?: Json | null
          metric_category?: string
          metric_name: string
          metric_value?: number
          snapshot_at?: string
        }
        Update: {
          id?: string
          metadata?: Json | null
          metric_category?: string
          metric_name?: string
          metric_value?: number
          snapshot_at?: string
        }
        Relationships: []
      }
      agent_registry: {
        Row: {
          actions: Json | null
          agent_key: string
          agent_name: string
          autonomy_level: string
          config: Json | null
          created_at: string
          created_by: string | null
          domain: string
          id: string
          inputs: Json | null
          layer: string
          mission: string | null
          outputs: Json | null
          parent_agent_key: string | null
          status: string
          success_metrics: Json | null
          success_rate: number | null
          tasks_executed: number | null
          tasks_succeeded: number | null
          tools: Json | null
          triggers: Json | null
          updated_at: string
        }
        Insert: {
          actions?: Json | null
          agent_key: string
          agent_name: string
          autonomy_level?: string
          config?: Json | null
          created_at?: string
          created_by?: string | null
          domain?: string
          id?: string
          inputs?: Json | null
          layer?: string
          mission?: string | null
          outputs?: Json | null
          parent_agent_key?: string | null
          status?: string
          success_metrics?: Json | null
          success_rate?: number | null
          tasks_executed?: number | null
          tasks_succeeded?: number | null
          tools?: Json | null
          triggers?: Json | null
          updated_at?: string
        }
        Update: {
          actions?: Json | null
          agent_key?: string
          agent_name?: string
          autonomy_level?: string
          config?: Json | null
          created_at?: string
          created_by?: string | null
          domain?: string
          id?: string
          inputs?: Json | null
          layer?: string
          mission?: string | null
          outputs?: Json | null
          parent_agent_key?: string | null
          status?: string
          success_metrics?: Json | null
          success_rate?: number | null
          tasks_executed?: number | null
          tasks_succeeded?: number | null
          tools?: Json | null
          triggers?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_registry_parent_agent_key_fkey"
            columns: ["parent_agent_key"]
            isOneToOne: false
            referencedRelation: "agent_registry"
            referencedColumns: ["agent_key"]
          },
        ]
      }
      agent_tasks: {
        Row: {
          action_plan: Json | null
          agent_domain: string
          agent_key: string | null
          agent_name: string
          auto_executable: boolean | null
          created_at: string
          executed_at: string | null
          execution_mode: string | null
          execution_result: Json | null
          id: string
          impact_score: number
          proposed_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          task_description: string | null
          task_title: string
          updated_at: string
          urgency: string
        }
        Insert: {
          action_plan?: Json | null
          agent_domain?: string
          agent_key?: string | null
          agent_name: string
          auto_executable?: boolean | null
          created_at?: string
          executed_at?: string | null
          execution_mode?: string | null
          execution_result?: Json | null
          id?: string
          impact_score?: number
          proposed_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          task_description?: string | null
          task_title: string
          updated_at?: string
          urgency?: string
        }
        Update: {
          action_plan?: Json | null
          agent_domain?: string
          agent_key?: string | null
          agent_name?: string
          auto_executable?: boolean | null
          created_at?: string
          executed_at?: string | null
          execution_mode?: string | null
          execution_result?: Json | null
          id?: string
          impact_score?: number
          proposed_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          task_description?: string | null
          task_title?: string
          updated_at?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_tasks_agent_key_fkey"
            columns: ["agent_key"]
            isOneToOne: false
            referencedRelation: "agent_registry"
            referencedColumns: ["agent_key"]
          },
        ]
      }
      aipp_scores: {
        Row: {
          calculated_at: string
          component_scores: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          overall_score: number
          user_id: string | null
        }
        Insert: {
          calculated_at?: string
          component_scores?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          overall_score?: number
          user_id?: string | null
        }
        Update: {
          calculated_at?: string
          component_scores?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          overall_score?: number
          user_id?: string | null
        }
        Relationships: []
      }
      alex_sessions: {
        Row: {
          created_at: string
          id: string
          intake_data: Json | null
          last_intent: string | null
          session_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          intake_data?: Json | null
          last_intent?: string | null
          session_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          intake_data?: Json | null
          last_intent?: string | null
          session_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      alignment_questions: {
        Row: {
          answer_options: Json
          category: string
          code: string
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean
          question_en: string
          question_fr: string
          updated_at: string
          weight: number
        }
        Insert: {
          answer_options?: Json
          category: string
          code: string
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          question_en: string
          question_fr: string
          updated_at?: string
          weight?: number
        }
        Update: {
          answer_options?: Json
          category?: string
          code?: string
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          question_en?: string
          question_fr?: string
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      appointments: {
        Row: {
          budget_range: string | null
          contact_preference: string | null
          contractor_id: string
          created_at: string
          homeowner_user_id: string
          id: string
          notes: string | null
          preferred_date: string | null
          preferred_time_window: string | null
          project_category: string | null
          property_id: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["appointment_status"]
          timeline: string | null
          updated_at: string
          urgency_level: string | null
        }
        Insert: {
          budget_range?: string | null
          contact_preference?: string | null
          contractor_id: string
          created_at?: string
          homeowner_user_id: string
          id?: string
          notes?: string | null
          preferred_date?: string | null
          preferred_time_window?: string | null
          project_category?: string | null
          property_id?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          timeline?: string | null
          updated_at?: string
          urgency_level?: string | null
        }
        Update: {
          budget_range?: string | null
          contact_preference?: string | null
          contractor_id?: string
          created_at?: string
          homeowner_user_id?: string
          id?: string
          notes?: string | null
          preferred_date?: string | null
          preferred_time_window?: string | null
          project_category?: string | null
          property_id?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          timeline?: string | null
          updated_at?: string
          urgency_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          population: number | null
          province: string
          province_slug: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          population?: number | null
          province: string
          province_slug: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          population?: number | null
          province?: string
          province_slug?: string
          slug?: string
        }
        Relationships: []
      }
      contractor_dna_profiles: {
        Row: {
          confidence: number
          contractor_id: string
          created_at: string
          dna_label_en: string
          dna_label_fr: string
          dna_type: string
          generated_by: string
          id: string
          scores: Json
          traits: Json
          updated_at: string
        }
        Insert: {
          confidence?: number
          contractor_id: string
          created_at?: string
          dna_label_en: string
          dna_label_fr: string
          dna_type: string
          generated_by?: string
          id?: string
          scores?: Json
          traits?: Json
          updated_at?: string
        }
        Update: {
          confidence?: number
          contractor_id?: string
          created_at?: string
          dna_label_en?: string
          dna_label_fr?: string
          dna_type?: string
          generated_by?: string
          id?: string
          scores?: Json
          traits?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_dna_profiles_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_dna_profiles_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_members: {
        Row: {
          contractor_id: string
          created_at: string
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contractor_id: string
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contractor_id?: string
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_members_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_members_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_performance_metrics: {
        Row: {
          appointment_show_rate: number | null
          cancellation_rate: number | null
          close_rate: number | null
          complaint_rate: number | null
          contractor_id: string
          created_at: string
          id: string
          last_calculated_at: string | null
          quote_submission_rate: number | null
          response_time_avg_hours: number | null
          review_sentiment_score: number | null
          updated_at: string
        }
        Insert: {
          appointment_show_rate?: number | null
          cancellation_rate?: number | null
          close_rate?: number | null
          complaint_rate?: number | null
          contractor_id: string
          created_at?: string
          id?: string
          last_calculated_at?: string | null
          quote_submission_rate?: number | null
          response_time_avg_hours?: number | null
          review_sentiment_score?: number | null
          updated_at?: string
        }
        Update: {
          appointment_show_rate?: number | null
          cancellation_rate?: number | null
          close_rate?: number | null
          complaint_rate?: number | null
          contractor_id?: string
          created_at?: string
          id?: string
          last_calculated_at?: string | null
          quote_submission_rate?: number | null
          response_time_avg_hours?: number | null
          review_sentiment_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_performance_metrics_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_performance_metrics_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_public_scores: {
        Row: {
          aipp_score: number | null
          contractor_id: string
          created_at: string
          id: string
          profile_completeness_score: number | null
          trust_score: number | null
          unpro_score: number | null
          updated_at: string
          visibility_score: number | null
        }
        Insert: {
          aipp_score?: number | null
          contractor_id: string
          created_at?: string
          id?: string
          profile_completeness_score?: number | null
          trust_score?: number | null
          unpro_score?: number | null
          updated_at?: string
          visibility_score?: number | null
        }
        Update: {
          aipp_score?: number | null
          contractor_id?: string
          created_at?: string
          id?: string
          profile_completeness_score?: number | null
          trust_score?: number | null
          unpro_score?: number | null
          updated_at?: string
          visibility_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_public_scores_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_public_scores_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_review_dimension_scores: {
        Row: {
          authenticity_adjusted_score: number | null
          confidence_level: string | null
          contractor_id: string
          created_at: string
          dimension_code: string
          id: string
          mention_count: number | null
          negative_count: number | null
          positive_count: number | null
          score_raw: number | null
          score_weighted: number | null
          summary_en: string | null
          summary_fr: string | null
          updated_at: string
        }
        Insert: {
          authenticity_adjusted_score?: number | null
          confidence_level?: string | null
          contractor_id: string
          created_at?: string
          dimension_code: string
          id?: string
          mention_count?: number | null
          negative_count?: number | null
          positive_count?: number | null
          score_raw?: number | null
          score_weighted?: number | null
          summary_en?: string | null
          summary_fr?: string | null
          updated_at?: string
        }
        Update: {
          authenticity_adjusted_score?: number | null
          confidence_level?: string | null
          contractor_id?: string
          created_at?: string
          dimension_code?: string
          id?: string
          mention_count?: number | null
          negative_count?: number | null
          positive_count?: number | null
          score_raw?: number | null
          score_weighted?: number | null
          summary_en?: string | null
          summary_fr?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_review_dimension_scores_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_review_dimension_scores_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_subscriptions: {
        Row: {
          billing_interval: string
          cancel_at_period_end: boolean | null
          contractor_id: string
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          billing_interval?: string
          cancel_at_period_end?: boolean | null
          contractor_id: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          billing_interval?: string
          cancel_at_period_end?: boolean | null
          contractor_id?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_subscriptions_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: true
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_subscriptions_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: true
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      contractors: {
        Row: {
          address: string | null
          admin_note: string | null
          aipp_score: number | null
          business_name: string
          city: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          insurance_info: string | null
          license_number: string | null
          logo_url: string | null
          phone: string | null
          portfolio_urls: string[] | null
          postal_code: string | null
          province: string | null
          rating: number | null
          review_count: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          specialty: string | null
          updated_at: string
          user_id: string
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at: string | null
          website: string | null
          years_experience: number | null
        }
        Insert: {
          address?: string | null
          admin_note?: string | null
          aipp_score?: number | null
          business_name: string
          city?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          insurance_info?: string | null
          license_number?: string | null
          logo_url?: string | null
          phone?: string | null
          portfolio_urls?: string[] | null
          postal_code?: string | null
          province?: string | null
          rating?: number | null
          review_count?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialty?: string | null
          updated_at?: string
          user_id: string
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at?: string | null
          website?: string | null
          years_experience?: number | null
        }
        Update: {
          address?: string | null
          admin_note?: string | null
          aipp_score?: number | null
          business_name?: string
          city?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          insurance_info?: string | null
          license_number?: string | null
          logo_url?: string | null
          phone?: string | null
          portfolio_urls?: string[] | null
          postal_code?: string | null
          province?: string | null
          rating?: number | null
          review_count?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialty?: string | null
          updated_at?: string
          user_id?: string
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at?: string | null
          website?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      conversation_memory: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          importance_score: number | null
          memory_text: string
          memory_type: string
          property_id: string | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          importance_score?: number | null
          memory_text: string
          memory_type?: string
          property_id?: string | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          importance_score?: number | null
          memory_text?: string
          memory_type?: string
          property_id?: string | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      dna_fit_results: {
        Row: {
          compatibility_label: string
          contractor_dna_type: string
          contractor_id: string
          created_at: string
          dna_fit_score: number
          explanation_en: Json
          explanation_fr: Json
          homeowner_dna_type: string
          id: string
          matching_traits: Json
          property_id: string | null
          updated_at: string
          user_id: string
          watchout_traits: Json
        }
        Insert: {
          compatibility_label?: string
          contractor_dna_type: string
          contractor_id: string
          created_at?: string
          dna_fit_score?: number
          explanation_en?: Json
          explanation_fr?: Json
          homeowner_dna_type: string
          id?: string
          matching_traits?: Json
          property_id?: string | null
          updated_at?: string
          user_id: string
          watchout_traits?: Json
        }
        Update: {
          compatibility_label?: string
          contractor_dna_type?: string
          contractor_id?: string
          created_at?: string
          dna_fit_score?: number
          explanation_en?: Json
          explanation_fr?: Json
          homeowner_dna_type?: string
          id?: string
          matching_traits?: Json
          property_id?: string | null
          updated_at?: string
          user_id?: string
          watchout_traits?: Json
        }
        Relationships: [
          {
            foreignKeyName: "dna_fit_results_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dna_fit_results_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      home_scores: {
        Row: {
          calculated_at: string
          created_at: string
          exterior_score: number | null
          id: string
          interior_score: number | null
          notes: string | null
          overall_score: number
          property_id: string
          structure_score: number | null
          systems_score: number | null
          user_id: string
        }
        Insert: {
          calculated_at?: string
          created_at?: string
          exterior_score?: number | null
          id?: string
          interior_score?: number | null
          notes?: string | null
          overall_score?: number
          property_id: string
          structure_score?: number | null
          systems_score?: number | null
          user_id: string
        }
        Update: {
          calculated_at?: string
          created_at?: string
          exterior_score?: number | null
          id?: string
          interior_score?: number | null
          notes?: string | null
          overall_score?: number
          property_id?: string
          structure_score?: number | null
          systems_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_scores_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      homeowner_dna_profiles: {
        Row: {
          confidence: number
          created_at: string
          dna_label_en: string
          dna_label_fr: string
          dna_type: string
          generated_by: string
          id: string
          property_id: string | null
          scores: Json
          traits: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          dna_label_en: string
          dna_label_fr: string
          dna_type: string
          generated_by?: string
          id?: string
          property_id?: string | null
          scores?: Json
          traits?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          dna_label_en?: string
          dna_label_fr?: string
          dna_type?: string
          generated_by?: string
          id?: string
          property_id?: string | null
          scores?: Json
          traits?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "homeowner_dna_profiles_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_qualifications: {
        Row: {
          appointment_id: string
          budget_range: string | null
          city: string | null
          contractor_id: string
          created_at: string
          description_length_score: number | null
          documents_uploaded: boolean | null
          homeowner_profile_completeness: number | null
          homeowner_user_id: string
          id: string
          project_category: string | null
          property_linked: boolean | null
          quote_uploaded: boolean | null
          score: number
          score_factors: Json | null
          timeline: string | null
          urgency_level: string | null
        }
        Insert: {
          appointment_id: string
          budget_range?: string | null
          city?: string | null
          contractor_id: string
          created_at?: string
          description_length_score?: number | null
          documents_uploaded?: boolean | null
          homeowner_profile_completeness?: number | null
          homeowner_user_id: string
          id?: string
          project_category?: string | null
          property_linked?: boolean | null
          quote_uploaded?: boolean | null
          score?: number
          score_factors?: Json | null
          timeline?: string | null
          urgency_level?: string | null
        }
        Update: {
          appointment_id?: string
          budget_range?: string | null
          city?: string | null
          contractor_id?: string
          created_at?: string
          description_length_score?: number | null
          documents_uploaded?: boolean | null
          homeowner_profile_completeness?: number | null
          homeowner_user_id?: string
          id?: string
          project_category?: string | null
          property_linked?: boolean | null
          quote_uploaded?: boolean | null
          score?: number
          score_factors?: Json | null
          timeline?: string | null
          urgency_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_qualifications_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_qualifications_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_qualifications_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      match_evaluations: {
        Row: {
          aipp_score_snapshot: number | null
          availability_score: number | null
          budget_fit_score: number | null
          ccai_score: number | null
          conflict_risk_score: number | null
          contractor_id: string
          created_at: string
          dna_fit_score: number | null
          explanations: Json | null
          id: string
          lead_id: string | null
          project_fit_score: number | null
          project_id: string | null
          property_fit_score: number | null
          property_id: string | null
          raw_review_fit_score: number | null
          recommendation_score: number | null
          risk_modifier: number | null
          success_probability: number | null
          unpro_score_snapshot: number | null
          updated_at: string
          user_id: string | null
          weighted_review_fit_score: number | null
        }
        Insert: {
          aipp_score_snapshot?: number | null
          availability_score?: number | null
          budget_fit_score?: number | null
          ccai_score?: number | null
          conflict_risk_score?: number | null
          contractor_id: string
          created_at?: string
          dna_fit_score?: number | null
          explanations?: Json | null
          id?: string
          lead_id?: string | null
          project_fit_score?: number | null
          project_id?: string | null
          property_fit_score?: number | null
          property_id?: string | null
          raw_review_fit_score?: number | null
          recommendation_score?: number | null
          risk_modifier?: number | null
          success_probability?: number | null
          unpro_score_snapshot?: number | null
          updated_at?: string
          user_id?: string | null
          weighted_review_fit_score?: number | null
        }
        Update: {
          aipp_score_snapshot?: number | null
          availability_score?: number | null
          budget_fit_score?: number | null
          ccai_score?: number | null
          conflict_risk_score?: number | null
          contractor_id?: string
          created_at?: string
          dna_fit_score?: number | null
          explanations?: Json | null
          id?: string
          lead_id?: string | null
          project_fit_score?: number | null
          project_id?: string | null
          property_fit_score?: number | null
          property_id?: string | null
          raw_review_fit_score?: number | null
          recommendation_score?: number | null
          risk_modifier?: number | null
          success_probability?: number | null
          unpro_score_snapshot?: number | null
          updated_at?: string
          user_id?: string | null
          weighted_review_fit_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "match_evaluations_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_evaluations_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_evaluations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_evaluations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      matching_runs: {
        Row: {
          created_at: string
          filters: Json | null
          id: string
          project_id: string | null
          property_id: string | null
          selected_top_contractors: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          filters?: Json | null
          id?: string
          project_id?: string | null
          property_id?: string | null
          selected_top_contractors?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          filters?: Json | null
          id?: string
          project_id?: string | null
          property_id?: string | null
          selected_top_contractors?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matching_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matching_runs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          alt_text: string | null
          approved_at: string | null
          approved_by: string | null
          aspect_ratio: string | null
          asset_type: string
          brand_consistency_score: number | null
          clarity_score: number | null
          color_palette: Json | null
          composition_score: number | null
          created_at: string
          error_message: string | null
          file_format: string | null
          file_size: number | null
          generated_at: string | null
          generation_strategy: string | null
          height: number | null
          id: string
          models_used: string[] | null
          optimized_prompt: string | null
          overall_score: number | null
          purpose: string
          realism_score: number | null
          request_prompt: string
          requested_by: string | null
          seo_metadata: Json | null
          status: string
          storage_path: string | null
          storage_url: string | null
          style_preset: string | null
          target_entity_id: string | null
          target_entity_type: string | null
          target_page: string | null
          thumbnail_url: string | null
          updated_at: string
          variations: Json | null
          variations_count: number | null
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          approved_at?: string | null
          approved_by?: string | null
          aspect_ratio?: string | null
          asset_type?: string
          brand_consistency_score?: number | null
          clarity_score?: number | null
          color_palette?: Json | null
          composition_score?: number | null
          created_at?: string
          error_message?: string | null
          file_format?: string | null
          file_size?: number | null
          generated_at?: string | null
          generation_strategy?: string | null
          height?: number | null
          id?: string
          models_used?: string[] | null
          optimized_prompt?: string | null
          overall_score?: number | null
          purpose?: string
          realism_score?: number | null
          request_prompt: string
          requested_by?: string | null
          seo_metadata?: Json | null
          status?: string
          storage_path?: string | null
          storage_url?: string | null
          style_preset?: string | null
          target_entity_id?: string | null
          target_entity_type?: string | null
          target_page?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          variations?: Json | null
          variations_count?: number | null
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          approved_at?: string | null
          approved_by?: string | null
          aspect_ratio?: string | null
          asset_type?: string
          brand_consistency_score?: number | null
          clarity_score?: number | null
          color_palette?: Json | null
          composition_score?: number | null
          created_at?: string
          error_message?: string | null
          file_format?: string | null
          file_size?: number | null
          generated_at?: string | null
          generation_strategy?: string | null
          height?: number | null
          id?: string
          models_used?: string[] | null
          optimized_prompt?: string | null
          overall_score?: number | null
          purpose?: string
          realism_score?: number | null
          request_prompt?: string
          requested_by?: string | null
          seo_metadata?: Json | null
          status?: string
          storage_path?: string | null
          storage_url?: string | null
          style_preset?: string | null
          target_entity_id?: string | null
          target_entity_type?: string | null
          target_page?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          variations?: Json | null
          variations_count?: number | null
          width?: number | null
        }
        Relationships: []
      }
      portfolio_properties: {
        Row: {
          added_at: string
          id: string
          portfolio_id: string
          property_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          portfolio_id: string
          property_id: string
        }
        Update: {
          added_at?: string
          id?: string
          portfolio_id?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_properties_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_properties_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolios: {
        Row: {
          created_at: string
          description: string | null
          id: string
          max_properties: number
          name: string
          plan_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          max_properties?: number
          name: string
          plan_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          max_properties?: number
          name?: string
          plan_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_alignment_answers: {
        Row: {
          answer_code: string
          confidence: number
          contractor_id: string | null
          created_at: string
          id: string
          property_id: string | null
          question_id: string
          source: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          answer_code: string
          confidence?: number
          contractor_id?: string | null
          created_at?: string
          id?: string
          property_id?: string | null
          question_id: string
          source?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          answer_code?: string
          confidence?: number
          contractor_id?: string | null
          created_at?: string
          id?: string
          property_id?: string | null
          question_id?: string
          source?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_alignment_answers_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_alignment_answers_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_alignment_answers_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_alignment_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "alignment_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_context_snapshots: {
        Row: {
          constraints: Json | null
          created_at: string
          declared_budget_max: number | null
          declared_budget_min: number | null
          id: string
          occupancy_status: string | null
          project_id: string | null
          project_type: string | null
          property_id: string | null
          subcategory: string | null
          timeline_preference: string | null
          urgency: string | null
          user_id: string | null
        }
        Insert: {
          constraints?: Json | null
          created_at?: string
          declared_budget_max?: number | null
          declared_budget_min?: number | null
          id?: string
          occupancy_status?: string | null
          project_id?: string | null
          project_type?: string | null
          property_id?: string | null
          subcategory?: string | null
          timeline_preference?: string | null
          urgency?: string | null
          user_id?: string | null
        }
        Update: {
          constraints?: Json | null
          created_at?: string
          declared_budget_max?: number | null
          declared_budget_min?: number | null
          id?: string
          occupancy_status?: string | null
          project_id?: string | null
          project_type?: string | null
          property_id?: string | null
          subcategory?: string | null
          timeline_preference?: string | null
          urgency?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_context_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_context_snapshots_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      project_matches: {
        Row: {
          contractor_id: string
          created_at: string
          explanation: Json | null
          id: string
          match_score: number | null
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          contractor_id: string
          created_at?: string
          explanation?: Json | null
          id?: string
          match_score?: number | null
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          contractor_id?: string
          created_at?: string
          explanation?: Json | null
          id?: string
          match_score?: number | null
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_matches_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_matches_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_matches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          category_id: string | null
          city_id: string | null
          created_at: string
          description: string | null
          id: string
          property_id: string
          status: string
          timeline: string | null
          title: string
          updated_at: string
          urgency: string | null
          user_id: string
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          category_id?: string | null
          city_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          property_id: string
          status?: string
          timeline?: string | null
          title: string
          updated_at?: string
          urgency?: string | null
          user_id: string
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          category_id?: string | null
          city_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          property_id?: string
          status?: string
          timeline?: string | null
          title?: string
          updated_at?: string
          urgency?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string
          city: string | null
          condition: Database["public"]["Enums"]["property_condition"] | null
          created_at: string
          id: string
          lot_size: number | null
          photo_url: string | null
          postal_code: string | null
          property_type: string | null
          province: string | null
          square_footage: number | null
          updated_at: string
          user_id: string
          year_built: number | null
        }
        Insert: {
          address: string
          city?: string | null
          condition?: Database["public"]["Enums"]["property_condition"] | null
          created_at?: string
          id?: string
          lot_size?: number | null
          photo_url?: string | null
          postal_code?: string | null
          property_type?: string | null
          province?: string | null
          square_footage?: number | null
          updated_at?: string
          user_id: string
          year_built?: number | null
        }
        Update: {
          address?: string
          city?: string | null
          condition?: Database["public"]["Enums"]["property_condition"] | null
          created_at?: string
          id?: string
          lot_size?: number | null
          photo_url?: string | null
          postal_code?: string | null
          property_type?: string | null
          province?: string | null
          square_footage?: number | null
          updated_at?: string
          user_id?: string
          year_built?: number | null
        }
        Relationships: []
      }
      property_documents: {
        Row: {
          created_at: string
          document_type: string
          file_size: number | null
          file_url: string | null
          id: string
          notes: string | null
          property_id: string
          storage_path: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_type?: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          notes?: string | null
          property_id: string
          storage_path?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_type?: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          notes?: string | null
          property_id?: string
          storage_path?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_events: {
        Row: {
          contractor_id: string | null
          cost: number | null
          created_at: string
          description: string | null
          event_date: string | null
          event_type: string
          id: string
          metadata: Json | null
          property_id: string
          title: string
          user_id: string
        }
        Insert: {
          contractor_id?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          event_date?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          property_id: string
          title: string
          user_id: string
        }
        Update: {
          contractor_id?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          event_date?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          property_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_events_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_events_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_insights: {
        Row: {
          contractor_category: string | null
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          property_id: string
          title: string
          type: string
          urgency: string | null
          user_id: string
        }
        Insert: {
          contractor_category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          property_id: string
          title: string
          type: string
          urgency?: string | null
          user_id: string
        }
        Update: {
          contractor_category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          property_id?: string
          title?: string
          type?: string
          urgency?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_insights_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_members: {
        Row: {
          created_at: string
          id: string
          property_id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_id: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_members_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_scores: {
        Row: {
          calculated_at: string
          component_scores: Json | null
          created_at: string
          id: string
          notes: string | null
          overall_score: number
          property_id: string
          score_type: string
          user_id: string
        }
        Insert: {
          calculated_at?: string
          component_scores?: Json | null
          created_at?: string
          id?: string
          notes?: string | null
          overall_score?: number
          property_id: string
          score_type?: string
          user_id: string
        }
        Update: {
          calculated_at?: string
          component_scores?: Json | null
          created_at?: string
          id?: string
          notes?: string | null
          overall_score?: number
          property_id?: string
          score_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_scores_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_analysis: {
        Row: {
          ai_model: string | null
          concerns: Json | null
          created_at: string
          fairness_score: number | null
          id: string
          line_items: Json | null
          market_comparison: Json | null
          missing_items: Json | null
          quote_id: string
          recommendations: string | null
          status: string
          strengths: Json | null
          summary: string | null
        }
        Insert: {
          ai_model?: string | null
          concerns?: Json | null
          created_at?: string
          fairness_score?: number | null
          id?: string
          line_items?: Json | null
          market_comparison?: Json | null
          missing_items?: Json | null
          quote_id: string
          recommendations?: string | null
          status?: string
          strengths?: Json | null
          summary?: string | null
        }
        Update: {
          ai_model?: string | null
          concerns?: Json | null
          created_at?: string
          fairness_score?: number | null
          id?: string
          line_items?: Json | null
          market_comparison?: Json | null
          missing_items?: Json | null
          quote_id?: string
          recommendations?: string | null
          status?: string
          strengths?: Json | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_analysis_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: true
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          amount: number | null
          analyzed_at: string | null
          contractor_id: string | null
          created_at: string
          description: string | null
          file_url: string | null
          id: string
          project_id: string | null
          property_id: string
          status: Database["public"]["Enums"]["quote_status"] | null
          submitted_at: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          analyzed_at?: string | null
          contractor_id?: string | null
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          project_id?: string | null
          property_id: string
          status?: Database["public"]["Enums"]["quote_status"] | null
          submitted_at?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          analyzed_at?: string | null
          contractor_id?: string | null
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          project_id?: string | null
          property_id?: string
          status?: Database["public"]["Enums"]["quote_status"] | null
          submitted_at?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      rag_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          id: string
          metadata_json: Json | null
          token_count: number | null
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
          metadata_json?: Json | null
          token_count?: number | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
          metadata_json?: Json | null
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rag_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "rag_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      rag_documents: {
        Row: {
          city: string | null
          contractor_id: string | null
          created_at: string
          id: string
          language: string
          metadata_json: Json | null
          namespace: string
          project_id: string | null
          property_id: string | null
          source_id: string | null
          source_type: string
          summary: string | null
          tags: Json | null
          title: string | null
          updated_at: string
          user_id: string | null
          visibility_scope: string
        }
        Insert: {
          city?: string | null
          contractor_id?: string | null
          created_at?: string
          id?: string
          language?: string
          metadata_json?: Json | null
          namespace: string
          project_id?: string | null
          property_id?: string | null
          source_id?: string | null
          source_type: string
          summary?: string | null
          tags?: Json | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
          visibility_scope?: string
        }
        Update: {
          city?: string | null
          contractor_id?: string | null
          created_at?: string
          id?: string
          language?: string
          metadata_json?: Json | null
          namespace?: string
          project_id?: string | null
          property_id?: string | null
          source_id?: string | null
          source_type?: string
          summary?: string | null
          tags?: Json | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
          visibility_scope?: string
        }
        Relationships: []
      }
      rag_queries_log: {
        Row: {
          created_at: string
          id: string
          namespace_filter: string[] | null
          query_text: string
          results_json: Json | null
          top_k: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          namespace_filter?: string[] | null
          query_text: string
          results_json?: Json | null
          top_k?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          namespace_filter?: string[] | null
          query_text?: string
          results_json?: Json | null
          top_k?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      review_insights: {
        Row: {
          authenticity_flags: Json | null
          authenticity_score: number | null
          confidence_level: string | null
          contextual_specificity_score: number | null
          contractor_id: string
          created_at: string
          cross_platform_consistency_score: number | null
          fake_review_risk: number | null
          id: string
          linguistic_authenticity_score: number | null
          manual_review_notes: string | null
          manual_review_status: string | null
          overall_sentiment_score: number | null
          period_end: string | null
          period_start: string | null
          platform_divergence_score: number | null
          rating_distribution_integrity_score: number | null
          recency_continuity_quality_score: number | null
          review_count_analyzed: number | null
          review_intelligence_score: number | null
          review_reliability_factor: number | null
          reviewer_credibility_score: number | null
          source_platform: string | null
          summary_en: string | null
          summary_fr: string | null
          temporal_authenticity_score: number | null
          theme_scores: Json | null
          top_negative_themes: Json | null
          top_positive_themes: Json | null
          updated_at: string
        }
        Insert: {
          authenticity_flags?: Json | null
          authenticity_score?: number | null
          confidence_level?: string | null
          contextual_specificity_score?: number | null
          contractor_id: string
          created_at?: string
          cross_platform_consistency_score?: number | null
          fake_review_risk?: number | null
          id?: string
          linguistic_authenticity_score?: number | null
          manual_review_notes?: string | null
          manual_review_status?: string | null
          overall_sentiment_score?: number | null
          period_end?: string | null
          period_start?: string | null
          platform_divergence_score?: number | null
          rating_distribution_integrity_score?: number | null
          recency_continuity_quality_score?: number | null
          review_count_analyzed?: number | null
          review_intelligence_score?: number | null
          review_reliability_factor?: number | null
          reviewer_credibility_score?: number | null
          source_platform?: string | null
          summary_en?: string | null
          summary_fr?: string | null
          temporal_authenticity_score?: number | null
          theme_scores?: Json | null
          top_negative_themes?: Json | null
          top_positive_themes?: Json | null
          updated_at?: string
        }
        Update: {
          authenticity_flags?: Json | null
          authenticity_score?: number | null
          confidence_level?: string | null
          contextual_specificity_score?: number | null
          contractor_id?: string
          created_at?: string
          cross_platform_consistency_score?: number | null
          fake_review_risk?: number | null
          id?: string
          linguistic_authenticity_score?: number | null
          manual_review_notes?: string | null
          manual_review_status?: string | null
          overall_sentiment_score?: number | null
          period_end?: string | null
          period_start?: string | null
          platform_divergence_score?: number | null
          rating_distribution_integrity_score?: number | null
          recency_continuity_quality_score?: number | null
          review_count_analyzed?: number | null
          review_intelligence_score?: number | null
          review_reliability_factor?: number | null
          reviewer_credibility_score?: number | null
          source_platform?: string | null
          summary_en?: string | null
          summary_fr?: string | null
          temporal_authenticity_score?: number | null
          theme_scores?: Json | null
          top_negative_themes?: Json | null
          top_positive_themes?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_insights_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_insights_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      review_items: {
        Row: {
          authenticity_score: number | null
          contextual_specificity_score: number | null
          contractor_id: string
          created_at: string
          detected_language: string | null
          external_review_id: string | null
          extracted_themes: Json | null
          id: string
          is_weighted_out: boolean
          linguistic_authenticity_score: number | null
          review_date: string | null
          review_rating: number
          review_text: string | null
          reviewer_credibility_score: number | null
          reviewer_local_guide_level: number | null
          reviewer_name: string | null
          reviewer_photo_count: number | null
          reviewer_profile_url: string | null
          reviewer_review_count: number | null
          sentiment_score: number | null
          source_platform: string
          suspicion_flags: Json | null
          temporal_suspicion_score: number | null
          weight_factor: number
        }
        Insert: {
          authenticity_score?: number | null
          contextual_specificity_score?: number | null
          contractor_id: string
          created_at?: string
          detected_language?: string | null
          external_review_id?: string | null
          extracted_themes?: Json | null
          id?: string
          is_weighted_out?: boolean
          linguistic_authenticity_score?: number | null
          review_date?: string | null
          review_rating: number
          review_text?: string | null
          reviewer_credibility_score?: number | null
          reviewer_local_guide_level?: number | null
          reviewer_name?: string | null
          reviewer_photo_count?: number | null
          reviewer_profile_url?: string | null
          reviewer_review_count?: number | null
          sentiment_score?: number | null
          source_platform?: string
          suspicion_flags?: Json | null
          temporal_suspicion_score?: number | null
          weight_factor?: number
        }
        Update: {
          authenticity_score?: number | null
          contextual_specificity_score?: number | null
          contractor_id?: string
          created_at?: string
          detected_language?: string | null
          external_review_id?: string | null
          extracted_themes?: Json | null
          id?: string
          is_weighted_out?: boolean
          linguistic_authenticity_score?: number | null
          review_date?: string | null
          review_rating?: number
          review_text?: string | null
          reviewer_credibility_score?: number | null
          reviewer_local_guide_level?: number | null
          reviewer_name?: string | null
          reviewer_photo_count?: number | null
          reviewer_profile_url?: string | null
          reviewer_review_count?: number | null
          sentiment_score?: number | null
          source_platform?: string
          suspicion_flags?: Json | null
          temporal_suspicion_score?: number | null
          weight_factor?: number
        }
        Relationships: [
          {
            foreignKeyName: "review_items_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_items_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      review_theme_taxonomy: {
        Row: {
          created_at: string
          default_weight: number
          description_en: string | null
          description_fr: string | null
          family_code: string
          id: string
          label_en: string
          label_fr: string
          matching_relevant: boolean
          negative_variant_of: string | null
          public_visible: boolean
          score_dimensions: Json | null
          theme_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_weight?: number
          description_en?: string | null
          description_fr?: string | null
          family_code: string
          id?: string
          label_en: string
          label_fr: string
          matching_relevant?: boolean
          negative_variant_of?: string | null
          public_visible?: boolean
          score_dimensions?: Json | null
          theme_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_weight?: number
          description_en?: string | null
          description_fr?: string | null
          family_code?: string
          id?: string
          label_en?: string
          label_fr?: string
          matching_relevant?: boolean
          negative_variant_of?: string | null
          public_visible?: boolean
          score_dimensions?: Json | null
          theme_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          content: string | null
          contractor_id: string
          created_at: string
          id: string
          is_published: boolean | null
          rating: number
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          contractor_id: string
          created_at?: string
          id?: string
          is_published?: boolean | null
          rating: number
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          contractor_id?: string
          created_at?: string
          id?: string
          is_published?: boolean | null
          rating?: number
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_pages: {
        Row: {
          category_id: string | null
          city_id: string | null
          content_data: Json | null
          created_at: string
          id: string
          is_published: boolean
          meta_description: string | null
          page_type: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          city_id?: string | null
          content_data?: Json | null
          created_at?: string
          id?: string
          is_published?: boolean
          meta_description?: string | null
          page_type: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          city_id?: string | null
          content_data?: Json | null
          created_at?: string
          id?: string
          is_published?: boolean
          meta_description?: string | null
          page_type?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_pages_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_pages_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_documents: {
        Row: {
          bucket: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          id: string
          storage_path: string
          user_id: string
        }
        Insert: {
          bucket: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          storage_path: string
          user_id: string
        }
        Update: {
          bucket?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_accounts: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          max_properties: number
          plan_type: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          max_properties?: number
          plan_type?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          max_properties?: number
          plan_type?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      territories: {
        Row: {
          category_name: string
          category_slug: string
          city_name: string
          city_slug: string
          created_at: string
          elite_slots: number
          id: string
          is_active: boolean
          max_contractors: number
          premium_slots: number
          signature_slots: number
          updated_at: string
        }
        Insert: {
          category_name: string
          category_slug: string
          city_name: string
          city_slug: string
          created_at?: string
          elite_slots?: number
          id?: string
          is_active?: boolean
          max_contractors?: number
          premium_slots?: number
          signature_slots?: number
          updated_at?: string
        }
        Update: {
          category_name?: string
          category_slug?: string
          city_name?: string
          city_slug?: string
          created_at?: string
          elite_slots?: number
          id?: string
          is_active?: boolean
          max_contractors?: number
          premium_slots?: number
          signature_slots?: number
          updated_at?: string
        }
        Relationships: []
      }
      territory_assignments: {
        Row: {
          active: boolean
          contractor_id: string
          created_at: string
          id: string
          plan_level: string
          slot_type: string
          territory_id: string
        }
        Insert: {
          active?: boolean
          contractor_id: string
          created_at?: string
          id?: string
          plan_level?: string
          slot_type?: string
          territory_id: string
        }
        Update: {
          active?: boolean
          contractor_id?: string
          created_at?: string
          id?: string
          plan_level?: string
          slot_type?: string
          territory_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "territory_assignments_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "territory_assignments_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "territory_assignments_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      territory_waitlist: {
        Row: {
          contractor_id: string
          created_at: string
          id: string
          territory_id: string
        }
        Insert: {
          contractor_id: string
          created_at?: string
          id?: string
          territory_id: string
        }
        Update: {
          contractor_id?: string
          created_at?: string
          id?: string
          territory_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "territory_waitlist_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "territory_waitlist_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "territory_waitlist_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      ccai_answer_matrix: {
        Row: {
          answer_code: string | null
          category: string | null
          confidence: number | null
          contractor_id: string | null
          created_at: string | null
          id: string | null
          property_id: string | null
          question_code: string | null
          question_en: string | null
          question_fr: string | null
          source: string | null
          updated_at: string | null
          user_id: string | null
          weight: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_alignment_answers_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_alignment_answers_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_alignment_answers_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      dna_profile_summary: {
        Row: {
          actor_id: string | null
          actor_type: string | null
          confidence: number | null
          contractor_id: string | null
          dna_label_en: string | null
          dna_label_fr: string | null
          dna_type: string | null
          property_id: string | null
          scores: Json | null
          traits: Json | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_contractor_public_profile: {
        Row: {
          aipp_score: number | null
          business_name: string | null
          city: string | null
          description: string | null
          id: string | null
          logo_url: string | null
          portfolio_urls: string[] | null
          profile_completeness_score: number | null
          province: string | null
          rating: number | null
          review_confidence: string | null
          review_count: number | null
          review_sentiment: number | null
          review_summary_en: string | null
          review_summary_fr: string | null
          specialty: string | null
          top_negative_themes: Json | null
          top_positive_themes: Json | null
          trust_score: number | null
          unpro_score: number | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
          visibility_score: number | null
          years_experience: number | null
        }
        Relationships: []
      }
      v_match_results_safe: {
        Row: {
          aipp_score_snapshot: number | null
          availability_score: number | null
          budget_fit_score: number | null
          business_name: string | null
          ccai_score: number | null
          city: string | null
          conflict_risk_score: number | null
          contractor_id: string | null
          created_at: string | null
          dna_fit_score: number | null
          explanations: Json | null
          id: string | null
          logo_url: string | null
          project_fit_score: number | null
          project_id: string | null
          property_fit_score: number | null
          property_id: string | null
          province: string | null
          rating: number | null
          recommendation_score: number | null
          review_count: number | null
          specialty: string | null
          success_probability: number | null
          unpro_score_snapshot: number | null
          user_id: string | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
          years_experience: number | null
        }
        Relationships: [
          {
            foreignKeyName: "match_evaluations_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_evaluations_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_evaluations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_evaluations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_ccai_answer_pairs: {
        Args: {
          p_contractor_id: string
          p_property_id?: string
          p_user_id: string
        }
        Returns: {
          category: string
          contractor_answer: string
          homeowner_answer: string
          is_match: boolean
          question_code: string
          weight: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      match_rag_chunks: {
        Args: {
          filter_namespaces?: string[]
          filter_user_id?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          chunk_content: string
          chunk_id: string
          chunk_index: number
          document_id: string
          document_summary: string
          document_title: string
          namespace: string
          similarity: number
        }[]
      }
      search_rag_chunks_text: {
        Args: {
          filter_namespaces?: string[]
          filter_user_id?: string
          match_count?: number
          search_query: string
        }
        Returns: {
          chunk_content: string
          chunk_id: string
          chunk_index: number
          document_id: string
          document_summary: string
          document_title: string
          namespace: string
          rank: number
        }[]
      }
    }
    Enums: {
      app_role: "homeowner" | "contractor" | "admin"
      appointment_status:
        | "requested"
        | "under_review"
        | "accepted"
        | "declined"
        | "scheduled"
        | "completed"
        | "cancelled"
      property_condition: "excellent" | "good" | "fair" | "poor" | "critical"
      quote_status: "pending" | "analyzed" | "accepted" | "rejected"
      verification_status: "unverified" | "pending" | "verified" | "rejected"
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
      app_role: ["homeowner", "contractor", "admin"],
      appointment_status: [
        "requested",
        "under_review",
        "accepted",
        "declined",
        "scheduled",
        "completed",
        "cancelled",
      ],
      property_condition: ["excellent", "good", "fair", "poor", "critical"],
      quote_status: ["pending", "analyzed", "accepted", "rejected"],
      verification_status: ["unverified", "pending", "verified", "rejected"],
    },
  },
} as const
