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
      answer_logs: {
        Row: {
          answer_mode: string
          city: string | null
          confidence_score: number | null
          created_at: string
          feedback_rating: number | null
          id: string
          matched_template_id: string | null
          property_type: string | null
          question: string
          response_time_ms: number | null
          session_id: string | null
          structured_answer: Json
          user_id: string | null
        }
        Insert: {
          answer_mode: string
          city?: string | null
          confidence_score?: number | null
          created_at?: string
          feedback_rating?: number | null
          id?: string
          matched_template_id?: string | null
          property_type?: string | null
          question: string
          response_time_ms?: number | null
          session_id?: string | null
          structured_answer: Json
          user_id?: string | null
        }
        Update: {
          answer_mode?: string
          city?: string | null
          confidence_score?: number | null
          created_at?: string
          feedback_rating?: number | null
          id?: string
          matched_template_id?: string | null
          property_type?: string | null
          question?: string
          response_time_ms?: number | null
          session_id?: string | null
          structured_answer?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "answer_logs_matched_template_id_fkey"
            columns: ["matched_template_id"]
            isOneToOne: false
            referencedRelation: "answer_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      answer_templates: {
        Row: {
          category: string
          causes: Json | null
          city_context: Json | null
          confidence_base: number | null
          cost_max: number | null
          cost_min: number | null
          cost_unit: string | null
          created_at: string
          explanation: string
          follow_up_question: string | null
          graph_problem_slug: string | null
          graph_profession_slugs: string[] | null
          graph_solution_slugs: string[] | null
          id: string
          is_published: boolean | null
          preventive_advice: Json | null
          property_types: string[] | null
          question_pattern: string
          recommended_professionals: string[] | null
          related_questions: Json | null
          seo_description: string | null
          seo_title: string | null
          short_answer: string
          solutions: Json | null
          updated_at: string
          urgency: string | null
          version: number | null
        }
        Insert: {
          category: string
          causes?: Json | null
          city_context?: Json | null
          confidence_base?: number | null
          cost_max?: number | null
          cost_min?: number | null
          cost_unit?: string | null
          created_at?: string
          explanation: string
          follow_up_question?: string | null
          graph_problem_slug?: string | null
          graph_profession_slugs?: string[] | null
          graph_solution_slugs?: string[] | null
          id?: string
          is_published?: boolean | null
          preventive_advice?: Json | null
          property_types?: string[] | null
          question_pattern: string
          recommended_professionals?: string[] | null
          related_questions?: Json | null
          seo_description?: string | null
          seo_title?: string | null
          short_answer: string
          solutions?: Json | null
          updated_at?: string
          urgency?: string | null
          version?: number | null
        }
        Update: {
          category?: string
          causes?: Json | null
          city_context?: Json | null
          confidence_base?: number | null
          cost_max?: number | null
          cost_min?: number | null
          cost_unit?: string | null
          created_at?: string
          explanation?: string
          follow_up_question?: string | null
          graph_problem_slug?: string | null
          graph_profession_slugs?: string[] | null
          graph_solution_slugs?: string[] | null
          id?: string
          is_published?: boolean | null
          preventive_advice?: Json | null
          property_types?: string[] | null
          question_pattern?: string
          recommended_professionals?: string[] | null
          related_questions?: Json | null
          seo_description?: string | null
          seo_title?: string | null
          short_answer?: string
          solutions?: Json | null
          updated_at?: string
          urgency?: string | null
          version?: number | null
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
            referencedRelation: "v_contractor_full_public"
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
      category_problem_links: {
        Row: {
          category_id: string
          created_at: string | null
          id: string
          problem_id: string | null
          problem_slug: string | null
          relevance_score: number | null
          solution_slugs: string[] | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          id?: string
          problem_id?: string | null
          problem_slug?: string | null
          relevance_score?: number | null
          solution_slugs?: string[] | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          id?: string
          problem_id?: string | null
          problem_slug?: string | null
          relevance_score?: number | null
          solution_slugs?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "category_problem_links_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_problem_links_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "home_problems"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_sessions: {
        Row: {
          addons_json: Json | null
          addons_total: number
          base_price: number
          billing_cycle: string
          card_required: boolean
          checkout_status: string
          contractor_profile_id: string | null
          created_at: string
          currency: string
          discount_amount: number
          discount_type: string
          discount_value: number
          external_checkout_id: string | null
          final_total_after_discount: number
          id: string
          payment_provider: string | null
          promo_code: string | null
          promo_code_type: string | null
          selected_plan_code: string | null
          selected_plan_id: string | null
          selected_plan_name: string | null
          setup_fee: number
          subtotal_before_discount: number
          tax_amount: number
          taxable_amount: number
          updated_at: string
          zero_dollar_activation: boolean
        }
        Insert: {
          addons_json?: Json | null
          addons_total?: number
          base_price?: number
          billing_cycle?: string
          card_required?: boolean
          checkout_status?: string
          contractor_profile_id?: string | null
          created_at?: string
          currency?: string
          discount_amount?: number
          discount_type?: string
          discount_value?: number
          external_checkout_id?: string | null
          final_total_after_discount?: number
          id?: string
          payment_provider?: string | null
          promo_code?: string | null
          promo_code_type?: string | null
          selected_plan_code?: string | null
          selected_plan_id?: string | null
          selected_plan_name?: string | null
          setup_fee?: number
          subtotal_before_discount?: number
          tax_amount?: number
          taxable_amount?: number
          updated_at?: string
          zero_dollar_activation?: boolean
        }
        Update: {
          addons_json?: Json | null
          addons_total?: number
          base_price?: number
          billing_cycle?: string
          card_required?: boolean
          checkout_status?: string
          contractor_profile_id?: string | null
          created_at?: string
          currency?: string
          discount_amount?: number
          discount_type?: string
          discount_value?: number
          external_checkout_id?: string | null
          final_total_after_discount?: number
          id?: string
          payment_provider?: string | null
          promo_code?: string | null
          promo_code_type?: string | null
          selected_plan_code?: string | null
          selected_plan_id?: string | null
          selected_plan_name?: string | null
          setup_fee?: number
          subtotal_before_discount?: number
          tax_amount?: number
          taxable_amount?: number
          updated_at?: string
          zero_dollar_activation?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "checkout_sessions_contractor_profile_id_fkey"
            columns: ["contractor_profile_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_sessions_contractor_profile_id_fkey"
            columns: ["contractor_profile_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_sessions_contractor_profile_id_fkey"
            columns: ["contractor_profile_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkout_sessions_selected_plan_id_fkey"
            columns: ["selected_plan_id"]
            isOneToOne: false
            referencedRelation: "plan_catalog"
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
      contractor_ai_profiles: {
        Row: {
          best_for: Json | null
          confidence: number | null
          considerations: Json | null
          contractor_id: string
          created_at: string | null
          generated_by: string | null
          id: string
          is_current: boolean | null
          not_ideal_for: Json | null
          personality_tags: string[] | null
          recommendation_reasons: Json | null
          summary_en: string | null
          summary_fr: string | null
          updated_at: string | null
        }
        Insert: {
          best_for?: Json | null
          confidence?: number | null
          considerations?: Json | null
          contractor_id: string
          created_at?: string | null
          generated_by?: string | null
          id?: string
          is_current?: boolean | null
          not_ideal_for?: Json | null
          personality_tags?: string[] | null
          recommendation_reasons?: Json | null
          summary_en?: string | null
          summary_fr?: string | null
          updated_at?: string | null
        }
        Update: {
          best_for?: Json | null
          confidence?: number | null
          considerations?: Json | null
          contractor_id?: string
          created_at?: string | null
          generated_by?: string | null
          id?: string
          is_current?: boolean | null
          not_ideal_for?: Json | null
          personality_tags?: string[] | null
          recommendation_reasons?: Json | null
          summary_en?: string | null
          summary_fr?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_ai_profiles_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_ai_profiles_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_ai_profiles_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_aipp_scores: {
        Row: {
          ai_seo_readiness_score: number | null
          breakdown_json: Json | null
          contractor_id: string
          conversion_score: number | null
          created_at: string
          id: string
          identity_score: number | null
          is_current: boolean
          score_confidence: number | null
          tier: string | null
          total_score: number
          trust_score: number | null
          updated_at: string
          visibility_score: number | null
        }
        Insert: {
          ai_seo_readiness_score?: number | null
          breakdown_json?: Json | null
          contractor_id: string
          conversion_score?: number | null
          created_at?: string
          id?: string
          identity_score?: number | null
          is_current?: boolean
          score_confidence?: number | null
          tier?: string | null
          total_score?: number
          trust_score?: number | null
          updated_at?: string
          visibility_score?: number | null
        }
        Update: {
          ai_seo_readiness_score?: number | null
          breakdown_json?: Json | null
          contractor_id?: string
          conversion_score?: number | null
          created_at?: string
          id?: string
          identity_score?: number | null
          is_current?: boolean
          score_confidence?: number | null
          tier?: string | null
          total_score?: number
          trust_score?: number | null
          updated_at?: string
          visibility_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_aipp_scores_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_aipp_scores_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_aipp_scores_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_category_assignments: {
        Row: {
          admin_approved: boolean | null
          approved_at: string | null
          approved_by: string | null
          assignment_source: string | null
          category_id: string
          contractor_id: string
          created_at: string | null
          id: string
          is_primary: boolean | null
          updated_at: string | null
        }
        Insert: {
          admin_approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          assignment_source?: string | null
          category_id: string
          contractor_id: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          updated_at?: string | null
        }
        Update: {
          admin_approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          assignment_source?: string | null
          category_id?: string
          contractor_id?: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_category_assignments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_category_assignments_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_category_assignments_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_category_assignments_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_comparables: {
        Row: {
          comparable_contractor_id: string
          computed_at: string | null
          contractor_id: string
          id: string
          shared_areas: string[] | null
          shared_services: string[] | null
          similarity_score: number | null
        }
        Insert: {
          comparable_contractor_id: string
          computed_at?: string | null
          contractor_id: string
          id?: string
          shared_areas?: string[] | null
          shared_services?: string[] | null
          similarity_score?: number | null
        }
        Update: {
          comparable_contractor_id?: string
          computed_at?: string | null
          contractor_id?: string
          id?: string
          shared_areas?: string[] | null
          shared_services?: string[] | null
          similarity_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_comparables_comparable_contractor_id_fkey"
            columns: ["comparable_contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_comparables_comparable_contractor_id_fkey"
            columns: ["comparable_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_comparables_comparable_contractor_id_fkey"
            columns: ["comparable_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_comparables_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_comparables_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_comparables_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_credentials: {
        Row: {
          contractor_id: string
          created_at: string | null
          credential_type: string
          credential_value: string | null
          data_source: string | null
          document_path: string | null
          expires_at: string | null
          id: string
          issued_at: string | null
          issuer: string | null
          updated_at: string | null
          verification_status: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          contractor_id: string
          created_at?: string | null
          credential_type: string
          credential_value?: string | null
          data_source?: string | null
          document_path?: string | null
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          issuer?: string | null
          updated_at?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          contractor_id?: string
          created_at?: string | null
          credential_type?: string
          credential_value?: string | null
          data_source?: string | null
          document_path?: string | null
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          issuer?: string | null
          updated_at?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_credentials_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_credentials_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_credentials_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "v_contractor_full_public"
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
      contractor_gmb_profiles: {
        Row: {
          contractor_id: string
          created_at: string | null
          gmb_address: string | null
          gmb_categories_secondary: string[] | null
          gmb_category_primary: string | null
          gmb_description: string | null
          gmb_hours: Json | null
          gmb_latitude: number | null
          gmb_longitude: number | null
          gmb_name: string | null
          gmb_phone: string | null
          gmb_photos_urls: string[] | null
          gmb_place_id: string
          gmb_qanda: Json | null
          gmb_rating: number | null
          gmb_review_count: number | null
          gmb_website: string | null
          id: string
          is_confirmed: boolean | null
          last_synced_at: string | null
          linked_at: string | null
          linked_by: string | null
          match_confidence: number | null
          match_signals: Json | null
          raw_response: Json | null
          updated_at: string | null
        }
        Insert: {
          contractor_id: string
          created_at?: string | null
          gmb_address?: string | null
          gmb_categories_secondary?: string[] | null
          gmb_category_primary?: string | null
          gmb_description?: string | null
          gmb_hours?: Json | null
          gmb_latitude?: number | null
          gmb_longitude?: number | null
          gmb_name?: string | null
          gmb_phone?: string | null
          gmb_photos_urls?: string[] | null
          gmb_place_id: string
          gmb_qanda?: Json | null
          gmb_rating?: number | null
          gmb_review_count?: number | null
          gmb_website?: string | null
          id?: string
          is_confirmed?: boolean | null
          last_synced_at?: string | null
          linked_at?: string | null
          linked_by?: string | null
          match_confidence?: number | null
          match_signals?: Json | null
          raw_response?: Json | null
          updated_at?: string | null
        }
        Update: {
          contractor_id?: string
          created_at?: string | null
          gmb_address?: string | null
          gmb_categories_secondary?: string[] | null
          gmb_category_primary?: string | null
          gmb_description?: string | null
          gmb_hours?: Json | null
          gmb_latitude?: number | null
          gmb_longitude?: number | null
          gmb_name?: string | null
          gmb_phone?: string | null
          gmb_photos_urls?: string[] | null
          gmb_place_id?: string
          gmb_qanda?: Json | null
          gmb_rating?: number | null
          gmb_review_count?: number | null
          gmb_website?: string | null
          id?: string
          is_confirmed?: boolean | null
          last_synced_at?: string | null
          linked_at?: string | null
          linked_by?: string | null
          match_confidence?: number | null
          match_signals?: Json | null
          raw_response?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_gmb_profiles_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_gmb_profiles_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_gmb_profiles_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_media: {
        Row: {
          alt_text: string | null
          contractor_id: string
          created_at: string | null
          data_source: string | null
          description: string | null
          display_order: number | null
          id: string
          is_approved: boolean | null
          is_featured: boolean | null
          media_type: string
          public_url: string | null
          storage_path: string | null
          title: string | null
        }
        Insert: {
          alt_text?: string | null
          contractor_id: string
          created_at?: string | null
          data_source?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_approved?: boolean | null
          is_featured?: boolean | null
          media_type?: string
          public_url?: string | null
          storage_path?: string | null
          title?: string | null
        }
        Update: {
          alt_text?: string | null
          contractor_id?: string
          created_at?: string | null
          data_source?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_approved?: boolean | null
          is_featured?: boolean | null
          media_type?: string
          public_url?: string | null
          storage_path?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_media_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_media_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_media_contractor_id_fkey"
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
            referencedRelation: "v_contractor_full_public"
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
            referencedRelation: "v_contractor_full_public"
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
      contractor_problem_links: {
        Row: {
          contractor_id: string
          created_at: string | null
          data_source: string | null
          id: string
          problem_id: string
          relevance_score: number | null
        }
        Insert: {
          contractor_id: string
          created_at?: string | null
          data_source?: string | null
          id?: string
          problem_id: string
          relevance_score?: number | null
        }
        Update: {
          contractor_id?: string
          created_at?: string | null
          data_source?: string | null
          id?: string
          problem_id?: string
          relevance_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_problem_links_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_problem_links_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_problem_links_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_problem_links_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "home_problems"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_public_pages: {
        Row: {
          canonical_url: string | null
          contractor_id: string
          created_at: string | null
          custom_sections: Json | null
          faq: Json | null
          id: string
          is_published: boolean | null
          json_ld: Json | null
          last_crawled_at: string | null
          og_image_url: string | null
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          canonical_url?: string | null
          contractor_id: string
          created_at?: string | null
          custom_sections?: Json | null
          faq?: Json | null
          id?: string
          is_published?: boolean | null
          json_ld?: Json | null
          last_crawled_at?: string | null
          og_image_url?: string | null
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          canonical_url?: string | null
          contractor_id?: string
          created_at?: string | null
          custom_sections?: Json | null
          faq?: Json | null
          id?: string
          is_published?: boolean | null
          json_ld?: Json | null
          last_crawled_at?: string | null
          og_image_url?: string | null
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_public_pages_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: true
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_public_pages_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: true
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_public_pages_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: true
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
            referencedRelation: "v_contractor_full_public"
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
      contractor_review_aggregates: {
        Row: {
          average_rating: number | null
          contractor_id: string
          created_at: string | null
          data_source: string
          id: string
          last_computed_at: string | null
          owner_response_count: number | null
          owner_response_rate: number | null
          rating_1: number | null
          rating_2: number | null
          rating_3: number | null
          rating_4: number | null
          rating_5: number | null
          recent_review_date: string | null
          sentiment_negative: number | null
          sentiment_neutral: number | null
          sentiment_positive: number | null
          top_keywords: string[] | null
          total_reviews: number | null
          updated_at: string | null
        }
        Insert: {
          average_rating?: number | null
          contractor_id: string
          created_at?: string | null
          data_source?: string
          id?: string
          last_computed_at?: string | null
          owner_response_count?: number | null
          owner_response_rate?: number | null
          rating_1?: number | null
          rating_2?: number | null
          rating_3?: number | null
          rating_4?: number | null
          rating_5?: number | null
          recent_review_date?: string | null
          sentiment_negative?: number | null
          sentiment_neutral?: number | null
          sentiment_positive?: number | null
          top_keywords?: string[] | null
          total_reviews?: number | null
          updated_at?: string | null
        }
        Update: {
          average_rating?: number | null
          contractor_id?: string
          created_at?: string | null
          data_source?: string
          id?: string
          last_computed_at?: string | null
          owner_response_count?: number | null
          owner_response_rate?: number | null
          rating_1?: number | null
          rating_2?: number | null
          rating_3?: number | null
          rating_4?: number | null
          rating_5?: number | null
          recent_review_date?: string | null
          sentiment_negative?: number | null
          sentiment_neutral?: number | null
          sentiment_positive?: number | null
          top_keywords?: string[] | null
          total_reviews?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_review_aggregates_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_review_aggregates_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_review_aggregates_contractor_id_fkey"
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
            referencedRelation: "v_contractor_full_public"
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
      contractor_service_areas: {
        Row: {
          city_name: string
          city_slug: string | null
          contractor_id: string
          created_at: string | null
          data_source: string | null
          id: string
          is_primary: boolean | null
          province: string | null
          radius_km: number | null
          validated_at: string | null
          validated_by: string | null
          validation_status: string | null
        }
        Insert: {
          city_name: string
          city_slug?: string | null
          contractor_id: string
          created_at?: string | null
          data_source?: string | null
          id?: string
          is_primary?: boolean | null
          province?: string | null
          radius_km?: number | null
          validated_at?: string | null
          validated_by?: string | null
          validation_status?: string | null
        }
        Update: {
          city_name?: string
          city_slug?: string | null
          contractor_id?: string
          created_at?: string | null
          data_source?: string | null
          id?: string
          is_primary?: boolean | null
          province?: string | null
          radius_km?: number | null
          validated_at?: string | null
          validated_by?: string | null
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_service_areas_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_service_areas_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_service_areas_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_services: {
        Row: {
          category: string | null
          contractor_id: string
          created_at: string | null
          data_source: string | null
          description_en: string | null
          description_fr: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          price_range_high: number | null
          price_range_low: number | null
          price_unit: string | null
          service_name_en: string | null
          service_name_fr: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          contractor_id: string
          created_at?: string | null
          data_source?: string | null
          description_en?: string | null
          description_fr?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          price_range_high?: number | null
          price_range_low?: number | null
          price_unit?: string | null
          service_name_en?: string | null
          service_name_fr: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          contractor_id?: string
          created_at?: string | null
          data_source?: string | null
          description_en?: string | null
          description_fr?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          price_range_high?: number | null
          price_range_low?: number | null
          price_unit?: string | null
          service_name_en?: string | null
          service_name_fr?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_services_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_services_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_services_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_solution_links: {
        Row: {
          contractor_id: string
          created_at: string | null
          data_source: string | null
          id: string
          relevance_score: number | null
          solution_id: string
        }
        Insert: {
          contractor_id: string
          created_at?: string | null
          data_source?: string | null
          id?: string
          relevance_score?: number | null
          solution_id: string
        }
        Update: {
          contractor_id?: string
          created_at?: string | null
          data_source?: string | null
          id?: string
          relevance_score?: number | null
          solution_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_solution_links_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_solution_links_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_solution_links_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_solution_links_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "home_solutions"
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
            referencedRelation: "v_contractor_full_public"
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
          slug: string | null
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
          slug?: string | null
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
          slug?: string | null
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
      conversation_messages: {
        Row: {
          agent_calls: Json | null
          conversation_id: string
          created_at: string
          id: string
          intent: string | null
          memory_updates: Json | null
          message_text: string | null
          role: string
          stage: string | null
          structured_payload: Json | null
          ui_actions: Json | null
        }
        Insert: {
          agent_calls?: Json | null
          conversation_id: string
          created_at?: string
          id?: string
          intent?: string | null
          memory_updates?: Json | null
          message_text?: string | null
          role: string
          stage?: string | null
          structured_payload?: Json | null
          ui_actions?: Json | null
        }
        Update: {
          agent_calls?: Json | null
          conversation_id?: string
          created_at?: string
          id?: string
          intent?: string | null
          memory_updates?: Json | null
          message_text?: string | null
          role?: string
          stage?: string | null
          structured_payload?: Json | null
          ui_actions?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          channel: string
          created_at: string
          current_intent: string | null
          current_stage: string | null
          id: string
          metadata: Json | null
          session_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          current_intent?: string | null
          current_stage?: string | null
          id?: string
          metadata?: Json | null
          session_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          current_intent?: string | null
          current_stage?: string | null
          id?: string
          metadata?: Json | null
          session_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      data_sources: {
        Row: {
          confidence: number | null
          contractor_id: string
          created_at: string | null
          extracted_at: string | null
          extraction_job_id: string | null
          field_name: string
          field_value: string | null
          id: string
          is_current: boolean | null
          source_type: string
          source_url: string | null
        }
        Insert: {
          confidence?: number | null
          contractor_id: string
          created_at?: string | null
          extracted_at?: string | null
          extraction_job_id?: string | null
          field_name: string
          field_value?: string | null
          id?: string
          is_current?: boolean | null
          source_type: string
          source_url?: string | null
        }
        Update: {
          confidence?: number | null
          contractor_id?: string
          created_at?: string | null
          extracted_at?: string | null
          extraction_job_id?: string | null
          field_name?: string
          field_value?: string | null
          id?: string
          is_current?: boolean | null
          source_type?: string
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_sources_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_sources_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_sources_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_sources_extraction_job_id_fkey"
            columns: ["extraction_job_id"]
            isOneToOne: false
            referencedRelation: "extraction_jobs"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "v_contractor_full_public"
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
      document_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string | null
          id: string
          job_item_id: string | null
          metadata: Json | null
          page_number: number | null
          section_title: string | null
          token_count: number | null
        }
        Insert: {
          chunk_index?: number
          content: string
          created_at?: string
          document_id?: string | null
          id?: string
          job_item_id?: string | null
          metadata?: Json | null
          page_number?: number | null
          section_title?: string | null
          token_count?: number | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string | null
          id?: string
          job_item_id?: string | null
          metadata?: Json | null
          page_number?: number | null
          section_title?: string | null
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_job_item_id_fkey"
            columns: ["job_item_id"]
            isOneToOne: false
            referencedRelation: "ingestion_job_items"
            referencedColumns: ["id"]
          },
        ]
      }
      document_entities: {
        Row: {
          confidence: number
          created_at: string
          document_id: string | null
          entity_type: string
          entity_value: string
          id: string
          job_item_id: string | null
          metadata: Json | null
          normalized_value: string | null
          source_page: number | null
          source_text: string | null
        }
        Insert: {
          confidence?: number
          created_at?: string
          document_id?: string | null
          entity_type: string
          entity_value: string
          id?: string
          job_item_id?: string | null
          metadata?: Json | null
          normalized_value?: string | null
          source_page?: number | null
          source_text?: string | null
        }
        Update: {
          confidence?: number
          created_at?: string
          document_id?: string | null
          entity_type?: string
          entity_value?: string
          id?: string
          job_item_id?: string | null
          metadata?: Json | null
          normalized_value?: string | null
          source_page?: number | null
          source_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_entities_job_item_id_fkey"
            columns: ["job_item_id"]
            isOneToOne: false
            referencedRelation: "ingestion_job_items"
            referencedColumns: ["id"]
          },
        ]
      }
      extraction_jobs: {
        Row: {
          completed_at: string | null
          contractor_id: string | null
          created_at: string | null
          created_by: string | null
          error_message: string | null
          fields_confirmed: number | null
          fields_extracted: number | null
          id: string
          job_type: string
          result_data: Json | null
          source_type: string
          source_url: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          contractor_id?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          fields_confirmed?: number | null
          fields_extracted?: number | null
          id?: string
          job_type: string
          result_data?: Json | null
          source_type: string
          source_url?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          contractor_id?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          fields_confirmed?: number | null
          fields_extracted?: number | null
          id?: string
          job_type?: string
          result_data?: Json | null
          source_type?: string
          source_url?: string | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extraction_jobs_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extraction_jobs_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extraction_jobs_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      field_validations: {
        Row: {
          admin_note: string | null
          contractor_id: string
          created_at: string | null
          current_value: string | null
          field_name: string
          id: string
          proposed_value: string | null
          source_type: string
          updated_at: string | null
          validated_at: string | null
          validated_by: string | null
          validation_status: string | null
        }
        Insert: {
          admin_note?: string | null
          contractor_id: string
          created_at?: string | null
          current_value?: string | null
          field_name: string
          id?: string
          proposed_value?: string | null
          source_type: string
          updated_at?: string | null
          validated_at?: string | null
          validated_by?: string | null
          validation_status?: string | null
        }
        Update: {
          admin_note?: string | null
          contractor_id?: string
          created_at?: string | null
          current_value?: string | null
          field_name?: string
          id?: string
          proposed_value?: string | null
          source_type?: string
          updated_at?: string | null
          validated_at?: string | null
          validated_by?: string | null
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "field_validations_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_validations_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_validations_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      home_problem_city_pages: {
        Row: {
          avg_cost_local_high: number | null
          avg_cost_local_low: number | null
          city_id: string
          contractor_count: number | null
          created_at: string
          custom_content: string | null
          faq: Json | null
          id: string
          is_published: boolean | null
          local_tips: string | null
          problem_id: string
          seo_description: string | null
          seo_title: string | null
          updated_at: string
        }
        Insert: {
          avg_cost_local_high?: number | null
          avg_cost_local_low?: number | null
          city_id: string
          contractor_count?: number | null
          created_at?: string
          custom_content?: string | null
          faq?: Json | null
          id?: string
          is_published?: boolean | null
          local_tips?: string | null
          problem_id: string
          seo_description?: string | null
          seo_title?: string | null
          updated_at?: string
        }
        Update: {
          avg_cost_local_high?: number | null
          avg_cost_local_low?: number | null
          city_id?: string
          contractor_count?: number | null
          created_at?: string
          custom_content?: string | null
          faq?: Json | null
          id?: string
          is_published?: boolean | null
          local_tips?: string | null
          problem_id?: string
          seo_description?: string | null
          seo_title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_problem_city_pages_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_problem_city_pages_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "home_problems"
            referencedColumns: ["id"]
          },
        ]
      }
      home_problem_images: {
        Row: {
          alt_text_en: string | null
          alt_text_fr: string | null
          caption_fr: string | null
          created_at: string
          display_order: number | null
          id: string
          image_url: string
          is_primary: boolean | null
          problem_id: string
        }
        Insert: {
          alt_text_en?: string | null
          alt_text_fr?: string | null
          caption_fr?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          image_url: string
          is_primary?: boolean | null
          problem_id: string
        }
        Update: {
          alt_text_en?: string | null
          alt_text_fr?: string | null
          caption_fr?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          image_url?: string
          is_primary?: boolean | null
          problem_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_problem_images_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "home_problems"
            referencedColumns: ["id"]
          },
        ]
      }
      home_problem_solution_edges: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean | null
          notes: string | null
          problem_id: string
          relevance_score: number | null
          solution_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean | null
          notes?: string | null
          problem_id: string
          relevance_score?: number | null
          solution_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean | null
          notes?: string | null
          problem_id?: string
          relevance_score?: number | null
          solution_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_problem_solution_edges_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "home_problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_problem_solution_edges_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "home_solutions"
            referencedColumns: ["id"]
          },
        ]
      }
      home_problem_tags: {
        Row: {
          created_at: string
          id: string
          problem_id: string
          tag: string
          tag_category: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          problem_id: string
          tag: string
          tag_category?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          problem_id?: string
          tag?: string
          tag_category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "home_problem_tags_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "home_problems"
            referencedColumns: ["id"]
          },
        ]
      }
      home_problems: {
        Row: {
          building_age_relevance: string | null
          climate_relevance: string[] | null
          cost_estimate_high: number | null
          cost_estimate_low: number | null
          cost_unit: string | null
          created_at: string
          description_en: string | null
          description_fr: string | null
          difficulty_score: number | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name_en: string
          name_fr: string
          professional_category: string | null
          property_types: string[] | null
          recommended_solution_slugs: string[] | null
          seo_description_fr: string | null
          seo_keywords: string[] | null
          seo_title_fr: string | null
          slug: string
          typical_causes: Json | null
          updated_at: string
          urgency_score: number | null
        }
        Insert: {
          building_age_relevance?: string | null
          climate_relevance?: string[] | null
          cost_estimate_high?: number | null
          cost_estimate_low?: number | null
          cost_unit?: string | null
          created_at?: string
          description_en?: string | null
          description_fr?: string | null
          difficulty_score?: number | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name_en: string
          name_fr: string
          professional_category?: string | null
          property_types?: string[] | null
          recommended_solution_slugs?: string[] | null
          seo_description_fr?: string | null
          seo_keywords?: string[] | null
          seo_title_fr?: string | null
          slug: string
          typical_causes?: Json | null
          updated_at?: string
          urgency_score?: number | null
        }
        Update: {
          building_age_relevance?: string | null
          climate_relevance?: string[] | null
          cost_estimate_high?: number | null
          cost_estimate_low?: number | null
          cost_unit?: string | null
          created_at?: string
          description_en?: string | null
          description_fr?: string | null
          difficulty_score?: number | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name_en?: string
          name_fr?: string
          professional_category?: string | null
          property_types?: string[] | null
          recommended_solution_slugs?: string[] | null
          seo_description_fr?: string | null
          seo_keywords?: string[] | null
          seo_title_fr?: string | null
          slug?: string
          typical_causes?: Json | null
          updated_at?: string
          urgency_score?: number | null
        }
        Relationships: []
      }
      home_professions: {
        Row: {
          created_at: string
          description_en: string | null
          description_fr: string | null
          id: string
          insurance_required: boolean | null
          is_active: boolean | null
          license_body: string | null
          license_required: boolean | null
          name_en: string
          name_fr: string
          seo_keywords: string[] | null
          slug: string
          typical_hourly_rate_high: number | null
          typical_hourly_rate_low: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_en?: string | null
          description_fr?: string | null
          id?: string
          insurance_required?: boolean | null
          is_active?: boolean | null
          license_body?: string | null
          license_required?: boolean | null
          name_en: string
          name_fr: string
          seo_keywords?: string[] | null
          slug: string
          typical_hourly_rate_high?: number | null
          typical_hourly_rate_low?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_en?: string | null
          description_fr?: string | null
          id?: string
          insurance_required?: boolean | null
          is_active?: boolean | null
          license_body?: string | null
          license_required?: boolean | null
          name_en?: string
          name_fr?: string
          seo_keywords?: string[] | null
          slug?: string
          typical_hourly_rate_high?: number | null
          typical_hourly_rate_low?: number | null
          updated_at?: string
        }
        Relationships: []
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
      home_solution_city_pages: {
        Row: {
          avg_cost_local_high: number | null
          avg_cost_local_low: number | null
          city_id: string
          contractor_count: number | null
          created_at: string
          custom_content: string | null
          faq: Json | null
          id: string
          is_published: boolean | null
          local_tips: string | null
          seo_description: string | null
          seo_title: string | null
          solution_id: string
          updated_at: string
        }
        Insert: {
          avg_cost_local_high?: number | null
          avg_cost_local_low?: number | null
          city_id: string
          contractor_count?: number | null
          created_at?: string
          custom_content?: string | null
          faq?: Json | null
          id?: string
          is_published?: boolean | null
          local_tips?: string | null
          seo_description?: string | null
          seo_title?: string | null
          solution_id: string
          updated_at?: string
        }
        Update: {
          avg_cost_local_high?: number | null
          avg_cost_local_low?: number | null
          city_id?: string
          contractor_count?: number | null
          created_at?: string
          custom_content?: string | null
          faq?: Json | null
          id?: string
          is_published?: boolean | null
          local_tips?: string | null
          seo_description?: string | null
          seo_title?: string | null
          solution_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_solution_city_pages_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_solution_city_pages_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "home_solutions"
            referencedColumns: ["id"]
          },
        ]
      }
      home_solution_profession_edges: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean | null
          notes: string | null
          profession_id: string
          relevance_score: number | null
          solution_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean | null
          notes?: string | null
          profession_id: string
          relevance_score?: number | null
          solution_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean | null
          notes?: string | null
          profession_id?: string
          relevance_score?: number | null
          solution_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_solution_profession_edges_profession_id_fkey"
            columns: ["profession_id"]
            isOneToOne: false
            referencedRelation: "home_professions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_solution_profession_edges_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "home_solutions"
            referencedColumns: ["id"]
          },
        ]
      }
      home_solutions: {
        Row: {
          cost_estimate_high: number | null
          cost_estimate_low: number | null
          cost_unit: string | null
          created_at: string
          description_en: string | null
          description_fr: string | null
          diy_difficulty: number | null
          diy_possible: boolean | null
          id: string
          is_active: boolean | null
          materials: Json | null
          method_steps: Json | null
          name_en: string
          name_fr: string
          seo_keywords: string[] | null
          slug: string
          time_estimate_hours: number | null
          updated_at: string
        }
        Insert: {
          cost_estimate_high?: number | null
          cost_estimate_low?: number | null
          cost_unit?: string | null
          created_at?: string
          description_en?: string | null
          description_fr?: string | null
          diy_difficulty?: number | null
          diy_possible?: boolean | null
          id?: string
          is_active?: boolean | null
          materials?: Json | null
          method_steps?: Json | null
          name_en: string
          name_fr: string
          seo_keywords?: string[] | null
          slug: string
          time_estimate_hours?: number | null
          updated_at?: string
        }
        Update: {
          cost_estimate_high?: number | null
          cost_estimate_low?: number | null
          cost_unit?: string | null
          created_at?: string
          description_en?: string | null
          description_fr?: string | null
          diy_difficulty?: number | null
          diy_possible?: boolean | null
          id?: string
          is_active?: boolean | null
          materials?: Json | null
          method_steps?: Json | null
          name_en?: string
          name_fr?: string
          seo_keywords?: string[] | null
          slug?: string
          time_estimate_hours?: number | null
          updated_at?: string
        }
        Relationships: []
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
      improvement_tasks: {
        Row: {
          assigned_to: string | null
          category: string
          completed_at: string | null
          created_at: string
          description: string
          effort: string | null
          finding_id: string | null
          id: string
          page_route: string | null
          priority: string
          run_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category: string
          completed_at?: string | null
          created_at?: string
          description: string
          effort?: string | null
          finding_id?: string | null
          id?: string
          page_route?: string | null
          priority: string
          run_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          completed_at?: string | null
          created_at?: string
          description?: string
          effort?: string | null
          finding_id?: string | null
          id?: string
          page_route?: string | null
          priority?: string
          run_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "improvement_tasks_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "validation_findings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "improvement_tasks_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "validation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestion_job_items: {
        Row: {
          created_at: string
          doc_type: Database["public"]["Enums"]["ingestion_doc_type"]
          document_id: string | null
          error_message: string | null
          extraction_result: Json | null
          file_name: string | null
          file_size: number | null
          id: string
          job_id: string
          processing_time_ms: number | null
          status: Database["public"]["Enums"]["ingestion_job_status"]
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          doc_type?: Database["public"]["Enums"]["ingestion_doc_type"]
          document_id?: string | null
          error_message?: string | null
          extraction_result?: Json | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          job_id: string
          processing_time_ms?: number | null
          status?: Database["public"]["Enums"]["ingestion_job_status"]
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          doc_type?: Database["public"]["Enums"]["ingestion_doc_type"]
          document_id?: string | null
          error_message?: string | null
          extraction_result?: Json | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          job_id?: string
          processing_time_ms?: number | null
          status?: Database["public"]["Enums"]["ingestion_job_status"]
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingestion_job_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ingestion_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestion_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_log: Json | null
          failed_items: number
          id: string
          job_type: string
          metadata: Json | null
          processed_items: number
          started_at: string | null
          status: Database["public"]["Enums"]["ingestion_job_status"]
          total_items: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_log?: Json | null
          failed_items?: number
          id?: string
          job_type?: string
          metadata?: Json | null
          processed_items?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["ingestion_job_status"]
          total_items?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_log?: Json | null
          failed_items?: number
          id?: string
          job_type?: string
          metadata?: Json | null
          processed_items?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["ingestion_job_status"]
          total_items?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
            referencedRelation: "v_contractor_full_public"
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
      market_price_benchmarks: {
        Row: {
          avg_cost_per_unit: number
          component: string
          created_at: string | null
          id: string
          last_updated_from_actuals: string | null
          region: string
          sample_count: number | null
          unit_type: string
          updated_at: string | null
        }
        Insert: {
          avg_cost_per_unit: number
          component: string
          created_at?: string | null
          id?: string
          last_updated_from_actuals?: string | null
          region?: string
          sample_count?: number | null
          unit_type?: string
          updated_at?: string | null
        }
        Update: {
          avg_cost_per_unit?: number
          component?: string
          created_at?: string | null
          id?: string
          last_updated_from_actuals?: string | null
          region?: string
          sample_count?: number | null
          unit_type?: string
          updated_at?: string | null
        }
        Relationships: []
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
            referencedRelation: "v_contractor_full_public"
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
      page_scores: {
        Row: {
          clarity_score: number | null
          created_at: string
          cta_score: number | null
          id: string
          image_score: number | null
          mobile_score: number | null
          navigation_score: number | null
          overall_score: number | null
          page_name: string
          page_route: string
          recommendations: Json | null
          run_id: string
          strengths: Json | null
          trust_score: number | null
          visual_score: number | null
          weaknesses: Json | null
        }
        Insert: {
          clarity_score?: number | null
          created_at?: string
          cta_score?: number | null
          id?: string
          image_score?: number | null
          mobile_score?: number | null
          navigation_score?: number | null
          overall_score?: number | null
          page_name: string
          page_route: string
          recommendations?: Json | null
          run_id: string
          strengths?: Json | null
          trust_score?: number | null
          visual_score?: number | null
          weaknesses?: Json | null
        }
        Update: {
          clarity_score?: number | null
          created_at?: string
          cta_score?: number | null
          id?: string
          image_score?: number | null
          mobile_score?: number | null
          navigation_score?: number | null
          overall_score?: number | null
          page_name?: string
          page_route?: string
          recommendations?: Json | null
          run_id?: string
          strengths?: Json | null
          trust_score?: number | null
          visual_score?: number | null
          weaknesses?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "page_scores_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "validation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_catalog: {
        Row: {
          active: boolean
          aipp_fit_max: number
          aipp_fit_min: number
          annual_price: number
          badge_text: string | null
          best_for: string | null
          code: string
          created_at: string
          id: string
          includes_json: Json | null
          monthly_price: number
          name: string
          objective_fit_json: Json | null
          position_rank: number
          recommended_for_json: Json | null
          setup_fee: number
          short_pitch: string | null
          summary_outcome: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          aipp_fit_max?: number
          aipp_fit_min?: number
          annual_price?: number
          badge_text?: string | null
          best_for?: string | null
          code: string
          created_at?: string
          id?: string
          includes_json?: Json | null
          monthly_price?: number
          name: string
          objective_fit_json?: Json | null
          position_rank?: number
          recommended_for_json?: Json | null
          setup_fee?: number
          short_pitch?: string | null
          summary_outcome?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          aipp_fit_max?: number
          aipp_fit_min?: number
          annual_price?: number
          badge_text?: string | null
          best_for?: string | null
          code?: string
          created_at?: string
          id?: string
          includes_json?: Json | null
          monthly_price?: number
          name?: string
          objective_fit_json?: Json | null
          position_rank?: number
          recommended_for_json?: Json | null
          setup_fee?: number
          short_pitch?: string | null
          summary_outcome?: string | null
          updated_at?: string
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
            referencedRelation: "v_contractor_full_public"
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
          account_type: string | null
          avatar_url: string | null
          created_at: string
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          salutation: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          salutation?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          salutation?: string | null
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
            referencedRelation: "v_contractor_full_public"
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
      promo_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          eligible_plan_codes: string[]
          ends_at: string | null
          id: string
          label: string | null
          starts_at: string | null
          updated_at: string
          usage_limit_per_business: number | null
          usage_limit_total: number | null
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          eligible_plan_codes?: string[]
          ends_at?: string | null
          id?: string
          label?: string | null
          starts_at?: string | null
          updated_at?: string
          usage_limit_per_business?: number | null
          usage_limit_total?: number | null
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          eligible_plan_codes?: string[]
          ends_at?: string | null
          id?: string
          label?: string | null
          starts_at?: string | null
          updated_at?: string
          usage_limit_per_business?: number | null
          usage_limit_total?: number | null
        }
        Relationships: []
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
      property_ai_extractions: {
        Row: {
          confidence: number
          created_at: string
          extraction_type: string
          id: string
          job_item_id: string | null
          model_used: string | null
          property_id: string | null
          source_doc_type:
            | Database["public"]["Enums"]["ingestion_doc_type"]
            | null
          structured_data: Json
          updated_at: string
          validated: boolean | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          confidence?: number
          created_at?: string
          extraction_type: string
          id?: string
          job_item_id?: string | null
          model_used?: string | null
          property_id?: string | null
          source_doc_type?:
            | Database["public"]["Enums"]["ingestion_doc_type"]
            | null
          structured_data?: Json
          updated_at?: string
          validated?: boolean | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          confidence?: number
          created_at?: string
          extraction_type?: string
          id?: string
          job_item_id?: string | null
          model_used?: string | null
          property_id?: string | null
          source_doc_type?:
            | Database["public"]["Enums"]["ingestion_doc_type"]
            | null
          structured_data?: Json
          updated_at?: string
          validated?: boolean | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_ai_extractions_job_item_id_fkey"
            columns: ["job_item_id"]
            isOneToOne: false
            referencedRelation: "ingestion_job_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_ai_extractions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_aliases: {
        Row: {
          alias_type: string
          alias_value: string
          confidence: number | null
          created_at: string
          id: string
          property_id: string | null
          source: string | null
        }
        Insert: {
          alias_type?: string
          alias_value: string
          confidence?: number | null
          created_at?: string
          id?: string
          property_id?: string | null
          source?: string | null
        }
        Update: {
          alias_type?: string
          alias_value?: string
          confidence?: number | null
          created_at?: string
          id?: string
          property_id?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_aliases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "v_contractor_full_public"
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
      property_master_records: {
        Row: {
          building_area_sqft: number | null
          building_type: string | null
          cadastral_number: string | null
          canonical_address: string | null
          canonical_city: string | null
          canonical_postal_code: string | null
          canonical_province: string | null
          confidence_score: number | null
          created_at: string
          data_sources: Json | null
          id: string
          land_area_sqft: number | null
          last_enriched_at: string | null
          last_tax_year: number | null
          lot_number: string | null
          municipal_evaluation: number | null
          property_id: string | null
          tax_amount: number | null
          unit_count: number | null
          updated_at: string
          year_built: number | null
        }
        Insert: {
          building_area_sqft?: number | null
          building_type?: string | null
          cadastral_number?: string | null
          canonical_address?: string | null
          canonical_city?: string | null
          canonical_postal_code?: string | null
          canonical_province?: string | null
          confidence_score?: number | null
          created_at?: string
          data_sources?: Json | null
          id?: string
          land_area_sqft?: number | null
          last_enriched_at?: string | null
          last_tax_year?: number | null
          lot_number?: string | null
          municipal_evaluation?: number | null
          property_id?: string | null
          tax_amount?: number | null
          unit_count?: number | null
          updated_at?: string
          year_built?: number | null
        }
        Update: {
          building_area_sqft?: number | null
          building_type?: string | null
          cadastral_number?: string | null
          canonical_address?: string | null
          canonical_city?: string | null
          canonical_postal_code?: string | null
          canonical_province?: string | null
          confidence_score?: number | null
          created_at?: string
          data_sources?: Json | null
          id?: string
          land_area_sqft?: number | null
          last_enriched_at?: string | null
          last_tax_year?: number | null
          lot_number?: string | null
          municipal_evaluation?: number | null
          property_id?: string | null
          tax_amount?: number | null
          unit_count?: number | null
          updated_at?: string
          year_built?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "property_master_records_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
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
      property_merge_candidates: {
        Row: {
          created_at: string
          id: string
          match_reasons: Json | null
          merged_into_id: string | null
          property_a_id: string | null
          property_b_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          similarity_score: number
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_reasons?: Json | null
          merged_into_id?: string | null
          property_a_id?: string | null
          property_b_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          similarity_score?: number
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          match_reasons?: Json | null
          merged_into_id?: string | null
          property_a_id?: string | null
          property_b_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          similarity_score?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_merge_candidates_property_a_id_fkey"
            columns: ["property_a_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_merge_candidates_property_b_id_fkey"
            columns: ["property_b_id"]
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
      property_source_links: {
        Row: {
          extraction_id: string | null
          id: string
          linked_at: string
          metadata: Json | null
          property_id: string | null
          source_id: string | null
          source_type: string
          source_url: string | null
        }
        Insert: {
          extraction_id?: string | null
          id?: string
          linked_at?: string
          metadata?: Json | null
          property_id?: string | null
          source_id?: string | null
          source_type: string
          source_url?: string | null
        }
        Update: {
          extraction_id?: string | null
          id?: string
          linked_at?: string
          metadata?: Json | null
          property_id?: string | null
          source_id?: string | null
          source_type?: string
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_source_links_extraction_id_fkey"
            columns: ["extraction_id"]
            isOneToOne: false
            referencedRelation: "property_ai_extractions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_source_links_property_id_fkey"
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
            referencedRelation: "v_contractor_full_public"
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
            referencedRelation: "v_contractor_full_public"
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
            referencedRelation: "v_contractor_full_public"
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
            referencedRelation: "v_contractor_full_public"
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
          ai_keywords: string[] | null
          created_at: string
          description: string | null
          description_en: string | null
          description_fr: string | null
          icon: string | null
          icon_name: string | null
          id: string
          is_active: boolean
          name: string
          name_en: string | null
          name_fr: string | null
          parent_id: string | null
          requires_admin_approval: boolean | null
          seo_description_fr: string | null
          seo_title_fr: string | null
          slug: string
          sort_order: number
          updated_at: string | null
        }
        Insert: {
          ai_keywords?: string[] | null
          created_at?: string
          description?: string | null
          description_en?: string | null
          description_fr?: string | null
          icon?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          name: string
          name_en?: string | null
          name_fr?: string | null
          parent_id?: string | null
          requires_admin_approval?: boolean | null
          seo_description_fr?: string | null
          seo_title_fr?: string | null
          slug: string
          sort_order?: number
          updated_at?: string | null
        }
        Update: {
          ai_keywords?: string[] | null
          created_at?: string
          description?: string | null
          description_en?: string | null
          description_fr?: string | null
          icon?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          name?: string
          name_en?: string | null
          name_fr?: string | null
          parent_id?: string | null
          requires_admin_approval?: boolean | null
          seo_description_fr?: string | null
          seo_title_fr?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string | null
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
      syndicate_budget_items: {
        Row: {
          actual_amount: number | null
          budgeted_amount: number
          category: string
          created_at: string
          fiscal_year: number
          id: string
          label: string
          notes: string | null
          syndicate_id: string
          updated_at: string
        }
        Insert: {
          actual_amount?: number | null
          budgeted_amount?: number
          category?: string
          created_at?: string
          fiscal_year: number
          id?: string
          label: string
          notes?: string | null
          syndicate_id: string
          updated_at?: string
        }
        Update: {
          actual_amount?: number | null
          budgeted_amount?: number
          category?: string
          created_at?: string
          fiscal_year?: number
          id?: string
          label?: string
          notes?: string | null
          syndicate_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "syndicate_budget_items_syndicate_id_fkey"
            columns: ["syndicate_id"]
            isOneToOne: false
            referencedRelation: "syndicates"
            referencedColumns: ["id"]
          },
        ]
      }
      syndicate_capex_forecasts: {
        Row: {
          component: string
          created_at: string
          created_by: string | null
          description: string | null
          estimated_cost: number
          forecast_year: number
          id: string
          notes: string | null
          remaining_life_years: number | null
          replacement_priority: string | null
          syndicate_id: string
          updated_at: string
          useful_life_years: number | null
        }
        Insert: {
          component: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_cost?: number
          forecast_year: number
          id?: string
          notes?: string | null
          remaining_life_years?: number | null
          replacement_priority?: string | null
          syndicate_id: string
          updated_at?: string
          useful_life_years?: number | null
        }
        Update: {
          component?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_cost?: number
          forecast_year?: number
          id?: string
          notes?: string | null
          remaining_life_years?: number | null
          replacement_priority?: string | null
          syndicate_id?: string
          updated_at?: string
          useful_life_years?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "syndicate_capex_forecasts_syndicate_id_fkey"
            columns: ["syndicate_id"]
            isOneToOne: false
            referencedRelation: "syndicates"
            referencedColumns: ["id"]
          },
        ]
      }
      syndicate_maintenance_items: {
        Row: {
          actual_cost: number | null
          category: string | null
          completed_date: string | null
          contractor_id: string | null
          created_at: string
          description: string | null
          estimated_cost: number | null
          id: string
          plan_id: string
          priority: string | null
          scheduled_date: string | null
          status: string
          syndicate_id: string
          title: string
          updated_at: string
        }
        Insert: {
          actual_cost?: number | null
          category?: string | null
          completed_date?: string | null
          contractor_id?: string | null
          created_at?: string
          description?: string | null
          estimated_cost?: number | null
          id?: string
          plan_id: string
          priority?: string | null
          scheduled_date?: string | null
          status?: string
          syndicate_id: string
          title: string
          updated_at?: string
        }
        Update: {
          actual_cost?: number | null
          category?: string | null
          completed_date?: string | null
          contractor_id?: string | null
          created_at?: string
          description?: string | null
          estimated_cost?: number | null
          id?: string
          plan_id?: string
          priority?: string | null
          scheduled_date?: string | null
          status?: string
          syndicate_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "syndicate_maintenance_items_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syndicate_maintenance_items_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syndicate_maintenance_items_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syndicate_maintenance_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "syndicate_maintenance_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syndicate_maintenance_items_syndicate_id_fkey"
            columns: ["syndicate_id"]
            isOneToOne: false
            referencedRelation: "syndicates"
            referencedColumns: ["id"]
          },
        ]
      }
      syndicate_maintenance_plans: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          plan_year: number
          status: string
          syndicate_id: string
          title: string
          total_budget: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          plan_year?: number
          status?: string
          syndicate_id: string
          title: string
          total_budget?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          plan_year?: number
          status?: string
          syndicate_id?: string
          title?: string
          total_budget?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "syndicate_maintenance_plans_syndicate_id_fkey"
            columns: ["syndicate_id"]
            isOneToOne: false
            referencedRelation: "syndicates"
            referencedColumns: ["id"]
          },
        ]
      }
      syndicate_members: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          joined_at: string
          property_id: string | null
          role: Database["public"]["Enums"]["syndicate_member_role"]
          share_percentage: number | null
          syndicate_id: string
          unit_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          joined_at?: string
          property_id?: string | null
          role?: Database["public"]["Enums"]["syndicate_member_role"]
          share_percentage?: number | null
          syndicate_id: string
          unit_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          joined_at?: string
          property_id?: string | null
          role?: Database["public"]["Enums"]["syndicate_member_role"]
          share_percentage?: number | null
          syndicate_id?: string
          unit_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "syndicate_members_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syndicate_members_syndicate_id_fkey"
            columns: ["syndicate_id"]
            isOneToOne: false
            referencedRelation: "syndicates"
            referencedColumns: ["id"]
          },
        ]
      }
      syndicate_project_interests: {
        Row: {
          contractor_id: string
          created_at: string
          estimated_price: number | null
          id: string
          interest_type: string
          message: string | null
          project_id: string
          updated_at: string
        }
        Insert: {
          contractor_id: string
          created_at?: string
          estimated_price?: number | null
          id?: string
          interest_type?: string
          message?: string | null
          project_id: string
          updated_at?: string
        }
        Update: {
          contractor_id?: string
          created_at?: string
          estimated_price?: number | null
          id?: string
          interest_type?: string
          message?: string | null
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "syndicate_project_interests_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syndicate_project_interests_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syndicate_project_interests_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syndicate_project_interests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "syndicate_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      syndicate_projects: {
        Row: {
          actual_contractor_id: string | null
          actual_cost: number | null
          ai_prediction_accuracy: number | null
          completed_at: string | null
          component: string
          cost_variance_percent: number | null
          created_at: string
          description: string | null
          estimated_cost: number
          estimated_year: number
          id: string
          matched_contractor_count: number | null
          owner_feedback: string | null
          owner_rating: number | null
          priority: string
          remaining_life_years: number | null
          risk_score: number | null
          status: string
          syndicate_id: string
          title: string
          updated_at: string
        }
        Insert: {
          actual_contractor_id?: string | null
          actual_cost?: number | null
          ai_prediction_accuracy?: number | null
          completed_at?: string | null
          component: string
          cost_variance_percent?: number | null
          created_at?: string
          description?: string | null
          estimated_cost?: number
          estimated_year: number
          id?: string
          matched_contractor_count?: number | null
          owner_feedback?: string | null
          owner_rating?: number | null
          priority?: string
          remaining_life_years?: number | null
          risk_score?: number | null
          status?: string
          syndicate_id: string
          title: string
          updated_at?: string
        }
        Update: {
          actual_contractor_id?: string | null
          actual_cost?: number | null
          ai_prediction_accuracy?: number | null
          completed_at?: string | null
          component?: string
          cost_variance_percent?: number | null
          created_at?: string
          description?: string | null
          estimated_cost?: number
          estimated_year?: number
          id?: string
          matched_contractor_count?: number | null
          owner_feedback?: string | null
          owner_rating?: number | null
          priority?: string
          remaining_life_years?: number | null
          risk_score?: number | null
          status?: string
          syndicate_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "syndicate_projects_actual_contractor_id_fkey"
            columns: ["actual_contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syndicate_projects_actual_contractor_id_fkey"
            columns: ["actual_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syndicate_projects_actual_contractor_id_fkey"
            columns: ["actual_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syndicate_projects_syndicate_id_fkey"
            columns: ["syndicate_id"]
            isOneToOne: false
            referencedRelation: "syndicates"
            referencedColumns: ["id"]
          },
        ]
      }
      syndicate_reserve_fund_snapshots: {
        Row: {
          annual_contribution: number | null
          balance: number
          created_at: string
          created_by: string | null
          funding_ratio: number | null
          id: string
          notes: string | null
          snapshot_date: string
          syndicate_id: string
          target_balance: number | null
        }
        Insert: {
          annual_contribution?: number | null
          balance?: number
          created_at?: string
          created_by?: string | null
          funding_ratio?: number | null
          id?: string
          notes?: string | null
          snapshot_date?: string
          syndicate_id: string
          target_balance?: number | null
        }
        Update: {
          annual_contribution?: number | null
          balance?: number
          created_at?: string
          created_by?: string | null
          funding_ratio?: number | null
          id?: string
          notes?: string | null
          snapshot_date?: string
          syndicate_id?: string
          target_balance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "syndicate_reserve_fund_snapshots_syndicate_id_fkey"
            columns: ["syndicate_id"]
            isOneToOne: false
            referencedRelation: "syndicates"
            referencedColumns: ["id"]
          },
        ]
      }
      syndicate_vote_choices: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          label: string
          vote_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          label: string
          vote_id: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          label?: string
          vote_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "syndicate_vote_choices_vote_id_fkey"
            columns: ["vote_id"]
            isOneToOne: false
            referencedRelation: "syndicate_votes"
            referencedColumns: ["id"]
          },
        ]
      }
      syndicate_vote_responses: {
        Row: {
          choice_id: string
          id: string
          member_id: string
          submitted_at: string
          user_id: string
          vote_id: string
          weight: number | null
        }
        Insert: {
          choice_id: string
          id?: string
          member_id: string
          submitted_at?: string
          user_id: string
          vote_id: string
          weight?: number | null
        }
        Update: {
          choice_id?: string
          id?: string
          member_id?: string
          submitted_at?: string
          user_id?: string
          vote_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "syndicate_vote_responses_choice_id_fkey"
            columns: ["choice_id"]
            isOneToOne: false
            referencedRelation: "syndicate_vote_choices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syndicate_vote_responses_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "syndicate_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syndicate_vote_responses_vote_id_fkey"
            columns: ["vote_id"]
            isOneToOne: false
            referencedRelation: "syndicate_votes"
            referencedColumns: ["id"]
          },
        ]
      }
      syndicate_votes: {
        Row: {
          closes_at: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          opens_at: string | null
          quorum_percentage: number
          required_majority: number
          result_summary: Json | null
          status: Database["public"]["Enums"]["vote_status"]
          syndicate_id: string
          title: string
          updated_at: string
          vote_type: string
        }
        Insert: {
          closes_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          opens_at?: string | null
          quorum_percentage?: number
          required_majority?: number
          result_summary?: Json | null
          status?: Database["public"]["Enums"]["vote_status"]
          syndicate_id: string
          title: string
          updated_at?: string
          vote_type?: string
        }
        Update: {
          closes_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          opens_at?: string | null
          quorum_percentage?: number
          required_majority?: number
          result_summary?: Json | null
          status?: Database["public"]["Enums"]["vote_status"]
          syndicate_id?: string
          title?: string
          updated_at?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "syndicate_votes_syndicate_id_fkey"
            columns: ["syndicate_id"]
            isOneToOne: false
            referencedRelation: "syndicates"
            referencedColumns: ["id"]
          },
        ]
      }
      syndicates: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          created_by: string
          description: string | null
          fiscal_year_start: number | null
          id: string
          name: string
          postal_code: string | null
          province: string | null
          unit_count: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          fiscal_year_start?: number | null
          id?: string
          name: string
          postal_code?: string | null
          province?: string | null
          unit_count?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          fiscal_year_start?: number | null
          id?: string
          name?: string
          postal_code?: string | null
          province?: string | null
          unit_count?: number | null
          updated_at?: string
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
            referencedRelation: "v_contractor_full_public"
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
            referencedRelation: "v_contractor_full_public"
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
      validation_findings: {
        Row: {
          actual_behavior: string | null
          agent: string
          business_impact_score: number | null
          category: string
          created_at: string
          description: string
          expected_behavior: string | null
          id: string
          is_resolved: boolean | null
          metadata: Json | null
          page_route: string | null
          probable_cause: string | null
          reproduction_steps: Json | null
          resolved_at: string | null
          resolved_by: string | null
          run_id: string
          screenshot_url: string | null
          severity: string
          suggested_fix: string | null
          title: string
        }
        Insert: {
          actual_behavior?: string | null
          agent: string
          business_impact_score?: number | null
          category: string
          created_at?: string
          description: string
          expected_behavior?: string | null
          id?: string
          is_resolved?: boolean | null
          metadata?: Json | null
          page_route?: string | null
          probable_cause?: string | null
          reproduction_steps?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          run_id: string
          screenshot_url?: string | null
          severity: string
          suggested_fix?: string | null
          title: string
        }
        Update: {
          actual_behavior?: string | null
          agent?: string
          business_impact_score?: number | null
          category?: string
          created_at?: string
          description?: string
          expected_behavior?: string | null
          id?: string
          is_resolved?: boolean | null
          metadata?: Json | null
          page_route?: string | null
          probable_cause?: string | null
          reproduction_steps?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          run_id?: string
          screenshot_url?: string | null
          severity?: string
          suggested_fix?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "validation_findings_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "validation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      validation_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          critical_count: number | null
          executive_summary: string | null
          high_count: number | null
          id: string
          low_count: number | null
          medium_count: number | null
          pages_scanned: number | null
          run_config: Json | null
          started_at: string | null
          status: string
          total_pages: number | null
          triggered_by: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          critical_count?: number | null
          executive_summary?: string | null
          high_count?: number | null
          id?: string
          low_count?: number | null
          medium_count?: number | null
          pages_scanned?: number | null
          run_config?: Json | null
          started_at?: string | null
          status?: string
          total_pages?: number | null
          triggered_by?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          critical_count?: number | null
          executive_summary?: string | null
          high_count?: number | null
          id?: string
          low_count?: number | null
          medium_count?: number | null
          pages_scanned?: number | null
          run_config?: Json | null
          started_at?: string | null
          status?: string
          total_pages?: number | null
          triggered_by?: string | null
          updated_at?: string
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
            referencedRelation: "v_contractor_full_public"
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
      v_contractor_full_public: {
        Row: {
          aipp_score: number | null
          best_for: Json | null
          business_name: string | null
          city: string | null
          description: string | null
          faq: Json | null
          id: string | null
          is_published: boolean | null
          logo_url: string | null
          not_ideal_for: Json | null
          page_slug: string | null
          personality_tags: string[] | null
          province: string | null
          rating: number | null
          recommendation_reasons: Json | null
          review_count: number | null
          seo_description: string | null
          seo_title: string | null
          slug: string | null
          specialty: string | null
          summary_en: string | null
          summary_fr: string | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
          years_experience: number | null
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
            referencedRelation: "v_contractor_full_public"
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
      calculate_unpro_checkout_totals: {
        Args: {
          _addons_total?: number
          _base_price: number
          _discount_type?: string
          _discount_value?: number
          _setup_fee?: number
          _tax_rate?: number
        }
        Returns: Json
      }
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
      get_city_limit: { Args: { plan_code: string }; Returns: number }
      get_contractor_dashboard: {
        Args: { _contractor_id: string }
        Returns: Json
      }
      get_contractor_public_profile: { Args: { _slug: string }; Returns: Json }
      get_profile_completion: {
        Args: { _contractor_id: string }
        Returns: Json
      }
      get_secondary_category_limit: {
        Args: { plan_code: string }
        Returns: number
      }
      get_service_limit: {
        Args: { plan_code: string; service_type?: string }
        Returns: number
      }
      get_upgrade_recommendations: {
        Args: { _contractor_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_syndicate_admin: {
        Args: { _syndicate_id: string; _user_id: string }
        Returns: boolean
      }
      is_syndicate_member: {
        Args: { _syndicate_id: string; _user_id: string }
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
      set_current_contractor_aipp_score: {
        Args: { _contractor_id: string; _score_id: string }
        Returns: undefined
      }
      unpro_aipp_tier: { Args: { score: number }; Returns: string }
      validate_unpro_promo_code: {
        Args: { _code: string; _contractor_id?: string; _plan_code: string }
        Returns: Json
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
      ingestion_doc_type:
        | "tax_bill"
        | "contractor_quote"
        | "reserve_fund_study"
        | "inspection_report"
        | "maintenance_document"
        | "insurance_certificate"
        | "other"
      ingestion_job_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "partial"
      property_condition: "excellent" | "good" | "fair" | "poor" | "critical"
      quote_status: "pending" | "analyzed" | "accepted" | "rejected"
      syndicate_member_role:
        | "owner"
        | "board_member"
        | "manager"
        | "administrator"
      verification_status: "unverified" | "pending" | "verified" | "rejected"
      vote_status: "draft" | "open" | "closed" | "cancelled"
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
      ingestion_doc_type: [
        "tax_bill",
        "contractor_quote",
        "reserve_fund_study",
        "inspection_report",
        "maintenance_document",
        "insurance_certificate",
        "other",
      ],
      ingestion_job_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "partial",
      ],
      property_condition: ["excellent", "good", "fair", "poor", "critical"],
      quote_status: ["pending", "analyzed", "accepted", "rejected"],
      syndicate_member_role: [
        "owner",
        "board_member",
        "manager",
        "administrator",
      ],
      verification_status: ["unverified", "pending", "verified", "rejected"],
      vote_status: ["draft", "open", "closed", "cancelled"],
    },
  },
} as const
