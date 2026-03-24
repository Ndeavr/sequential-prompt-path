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
      ab_test_variants: {
        Row: {
          config_json: Json
          created_at: string
          id: string
          is_active: boolean
          traffic_split: number
          type: string
          variant_key: string
        }
        Insert: {
          config_json?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          traffic_split?: number
          type: string
          variant_key: string
        }
        Update: {
          config_json?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          traffic_split?: number
          type?: string
          variant_key?: string
        }
        Relationships: []
      }
      ad_campaigns: {
        Row: {
          ad_copy: Json | null
          budget_daily_cents: number | null
          budget_total_cents: number | null
          campaign_name: string
          city_slug: string | null
          clicks: number | null
          conversions: number | null
          cost_per_appointment_cents: number | null
          cpc_cents: number | null
          created_at: string | null
          ctr: number | null
          id: string
          impressions: number | null
          keywords: Json | null
          landing_page_url: string | null
          optimization_notes: string | null
          platform: string
          source_fingerprint_id: string | null
          source_seo_page_id: string | null
          spend_cents: number | null
          status: string
          targeting: Json | null
          trade_slug: string | null
          updated_at: string | null
        }
        Insert: {
          ad_copy?: Json | null
          budget_daily_cents?: number | null
          budget_total_cents?: number | null
          campaign_name: string
          city_slug?: string | null
          clicks?: number | null
          conversions?: number | null
          cost_per_appointment_cents?: number | null
          cpc_cents?: number | null
          created_at?: string | null
          ctr?: number | null
          id?: string
          impressions?: number | null
          keywords?: Json | null
          landing_page_url?: string | null
          optimization_notes?: string | null
          platform?: string
          source_fingerprint_id?: string | null
          source_seo_page_id?: string | null
          spend_cents?: number | null
          status?: string
          targeting?: Json | null
          trade_slug?: string | null
          updated_at?: string | null
        }
        Update: {
          ad_copy?: Json | null
          budget_daily_cents?: number | null
          budget_total_cents?: number | null
          campaign_name?: string
          city_slug?: string | null
          clicks?: number | null
          conversions?: number | null
          cost_per_appointment_cents?: number | null
          cpc_cents?: number | null
          created_at?: string | null
          ctr?: number | null
          id?: string
          impressions?: number | null
          keywords?: Json | null
          landing_page_url?: string | null
          optimization_notes?: string | null
          platform?: string
          source_fingerprint_id?: string | null
          source_seo_page_id?: string | null
          spend_cents?: number | null
          status?: string
          targeting?: Json | null
          trade_slug?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ad_groups: {
        Row: {
          ad_variants: Json | null
          campaign_id: string
          clicks: number | null
          conversions: number | null
          created_at: string | null
          group_name: string
          id: string
          impressions: number | null
          keywords: Json | null
          negative_keywords: Json | null
          service_slug: string | null
          status: string
        }
        Insert: {
          ad_variants?: Json | null
          campaign_id: string
          clicks?: number | null
          conversions?: number | null
          created_at?: string | null
          group_name: string
          id?: string
          impressions?: number | null
          keywords?: Json | null
          negative_keywords?: Json | null
          service_slug?: string | null
          status?: string
        }
        Update: {
          ad_variants?: Json | null
          campaign_id?: string
          clicks?: number | null
          conversions?: number | null
          created_at?: string | null
          group_name?: string
          id?: string
          impressions?: number | null
          keywords?: Json | null
          negative_keywords?: Json | null
          service_slug?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_groups_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      adaptive_frequency_scores: {
        Row: {
          agent_key: string | null
          category: string | null
          city: string | null
          cluster_key: string
          cluster_type: string
          computed_at: string
          content_quality_score: number
          created_at: string
          demand_score: number
          frequency_multiplier: number
          id: string
          is_active: boolean
          metadata: Json | null
          opportunity_score: number | null
          profession: string | null
          profitability_score: number
          recommended_action: string | null
          seo_potential_score: number
          supply_score: number
          updated_at: string
        }
        Insert: {
          agent_key?: string | null
          category?: string | null
          city?: string | null
          cluster_key: string
          cluster_type?: string
          computed_at?: string
          content_quality_score?: number
          created_at?: string
          demand_score?: number
          frequency_multiplier?: number
          id?: string
          is_active?: boolean
          metadata?: Json | null
          opportunity_score?: number | null
          profession?: string | null
          profitability_score?: number
          recommended_action?: string | null
          seo_potential_score?: number
          supply_score?: number
          updated_at?: string
        }
        Update: {
          agent_key?: string | null
          category?: string | null
          city?: string | null
          cluster_key?: string
          cluster_type?: string
          computed_at?: string
          content_quality_score?: number
          created_at?: string
          demand_score?: number
          frequency_multiplier?: number
          id?: string
          is_active?: boolean
          metadata?: Json | null
          opportunity_score?: number | null
          profession?: string | null
          profitability_score?: number
          recommended_action?: string | null
          seo_potential_score?: number
          supply_score?: number
          updated_at?: string
        }
        Relationships: []
      }
      admin_action_logs: {
        Row: {
          action_type: string
          actor_user_id: string
          contractor_id: string | null
          created_at: string
          id: string
          notes: string | null
          payload_json: Json | null
          verification_run_id: string | null
        }
        Insert: {
          action_type: string
          actor_user_id: string
          contractor_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payload_json?: Json | null
          verification_run_id?: string | null
        }
        Update: {
          action_type?: string
          actor_user_id?: string
          contractor_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payload_json?: Json | null
          verification_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_action_logs_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_action_logs_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_action_logs_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_action_logs_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
          {
            foreignKeyName: "admin_action_logs_verification_run_id_fkey"
            columns: ["verification_run_id"]
            isOneToOne: false
            referencedRelation: "contractor_verification_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_notifications: {
        Row: {
          body: string
          contractor_id: string | null
          created_at: string
          id: string
          is_read: boolean | null
          payload_json: Json | null
          severity: string
          title: string
          type: string
          verification_run_id: string | null
        }
        Insert: {
          body: string
          contractor_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          payload_json?: Json | null
          severity?: string
          title: string
          type: string
          verification_run_id?: string | null
        }
        Update: {
          body?: string
          contractor_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          payload_json?: Json | null
          severity?: string
          title?: string
          type?: string
          verification_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notifications_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notifications_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notifications_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
          {
            foreignKeyName: "admin_notifications_verification_run_id_fkey"
            columns: ["verification_run_id"]
            isOneToOne: false
            referencedRelation: "contractor_verification_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_attributions: {
        Row: {
          conversion_type: string | null
          created_at: string
          id: string
          metadata: Json | null
          referral_code: string
          referred_user_id: string | null
          referrer_user_id: string | null
          role_origin: string | null
        }
        Insert: {
          conversion_type?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          referral_code: string
          referred_user_id?: string | null
          referrer_user_id?: string | null
          role_origin?: string | null
        }
        Update: {
          conversion_type?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          referral_code?: string
          referred_user_id?: string | null
          referrer_user_id?: string | null
          role_origin?: string | null
        }
        Relationships: []
      }
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
      ai_optimization_logs: {
        Row: {
          applied: boolean
          applied_at: string | null
          applied_by: string | null
          change_description: string
          change_json: Json
          created_at: string
          data_used_json: Json | null
          id: string
          impact_estimate_json: Json | null
          optimization_type: string
          reason: string
          rollback_json: Json | null
          rolled_back: boolean | null
          target_category: string | null
          target_city: string | null
        }
        Insert: {
          applied?: boolean
          applied_at?: string | null
          applied_by?: string | null
          change_description: string
          change_json: Json
          created_at?: string
          data_used_json?: Json | null
          id?: string
          impact_estimate_json?: Json | null
          optimization_type: string
          reason: string
          rollback_json?: Json | null
          rolled_back?: boolean | null
          target_category?: string | null
          target_city?: string | null
        }
        Update: {
          applied?: boolean
          applied_at?: string | null
          applied_by?: string | null
          change_description?: string
          change_json?: Json
          created_at?: string
          data_used_json?: Json | null
          id?: string
          impact_estimate_json?: Json | null
          optimization_type?: string
          reason?: string
          rollback_json?: Json | null
          rolled_back?: boolean | null
          target_category?: string | null
          target_city?: string | null
        }
        Relationships: []
      }
      ai_recommendations: {
        Row: {
          auto_applicable: boolean | null
          category: string | null
          city: string | null
          confidence_score: number
          created_at: string
          description_fr: string
          expected_impact_fr: string | null
          expires_at: string | null
          id: string
          priority: string
          recommendation_type: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          suggested_change_json: Json | null
          title_fr: string
        }
        Insert: {
          auto_applicable?: boolean | null
          category?: string | null
          city?: string | null
          confidence_score?: number
          created_at?: string
          description_fr: string
          expected_impact_fr?: string | null
          expires_at?: string | null
          id?: string
          priority?: string
          recommendation_type: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suggested_change_json?: Json | null
          title_fr: string
        }
        Update: {
          auto_applicable?: boolean | null
          category?: string | null
          city?: string | null
          confidence_score?: number
          created_at?: string
          description_fr?: string
          expected_impact_fr?: string | null
          expires_at?: string | null
          id?: string
          priority?: string
          recommendation_type?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suggested_change_json?: Json | null
          title_fr?: string
        }
        Relationships: []
      }
      aipp_score_checks: {
        Row: {
          business_name: string
          city: string
          created_at: string
          google_profile_url: string | null
          id: string
          market_position_label: string | null
          phone: string | null
          quick_score: number | null
          score_label: string | null
          session_id: string | null
          website_url: string | null
        }
        Insert: {
          business_name: string
          city: string
          created_at?: string
          google_profile_url?: string | null
          id?: string
          market_position_label?: string | null
          phone?: string | null
          quick_score?: number | null
          score_label?: string | null
          session_id?: string | null
          website_url?: string | null
        }
        Update: {
          business_name?: string
          city?: string
          created_at?: string
          google_profile_url?: string | null
          id?: string
          market_position_label?: string | null
          phone?: string | null
          quick_score?: number | null
          score_label?: string | null
          session_id?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aipp_score_checks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "lead_capture_sessions"
            referencedColumns: ["id"]
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
      alex_experiments: {
        Row: {
          confidence: number | null
          created_at: string | null
          ended_at: string | null
          experiment_key: string
          experiment_type: string
          id: string
          is_active: boolean | null
          variant_a: Json | null
          variant_a_conversions: number | null
          variant_a_impressions: number | null
          variant_b: Json | null
          variant_b_conversions: number | null
          variant_b_impressions: number | null
          winner: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          ended_at?: string | null
          experiment_key: string
          experiment_type: string
          id?: string
          is_active?: boolean | null
          variant_a?: Json | null
          variant_a_conversions?: number | null
          variant_a_impressions?: number | null
          variant_b?: Json | null
          variant_b_conversions?: number | null
          variant_b_impressions?: number | null
          winner?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          ended_at?: string | null
          experiment_key?: string
          experiment_type?: string
          id?: string
          is_active?: boolean | null
          variant_a?: Json | null
          variant_a_conversions?: number | null
          variant_a_impressions?: number | null
          variant_b?: Json | null
          variant_b_conversions?: number | null
          variant_b_impressions?: number | null
          winner?: string | null
        }
        Relationships: []
      }
      alex_interactions: {
        Row: {
          action_taken: string | null
          alex_text: string | null
          context: Json | null
          conversion_type: string | null
          created_at: string | null
          emotional_state: string | null
          friction_detected: boolean | null
          id: string
          page: string | null
          role: string | null
          session_id: string | null
          success: boolean | null
          time_to_action_ms: number | null
          user_id: string | null
          user_response: string | null
        }
        Insert: {
          action_taken?: string | null
          alex_text?: string | null
          context?: Json | null
          conversion_type?: string | null
          created_at?: string | null
          emotional_state?: string | null
          friction_detected?: boolean | null
          id?: string
          page?: string | null
          role?: string | null
          session_id?: string | null
          success?: boolean | null
          time_to_action_ms?: number | null
          user_id?: string | null
          user_response?: string | null
        }
        Update: {
          action_taken?: string | null
          alex_text?: string | null
          context?: Json | null
          conversion_type?: string | null
          created_at?: string | null
          emotional_state?: string | null
          friction_detected?: boolean | null
          id?: string
          page?: string | null
          role?: string | null
          session_id?: string | null
          success?: boolean | null
          time_to_action_ms?: number | null
          user_id?: string | null
          user_response?: string | null
        }
        Relationships: []
      }
      alex_learning_memory: {
        Row: {
          applied: boolean | null
          applied_at: string | null
          confidence: number | null
          created_at: string | null
          id: string
          improvement: string | null
          metadata: Json | null
          pattern_description: string | null
          pattern_key: string
          reversible: boolean | null
        }
        Insert: {
          applied?: boolean | null
          applied_at?: string | null
          confidence?: number | null
          created_at?: string | null
          id?: string
          improvement?: string | null
          metadata?: Json | null
          pattern_description?: string | null
          pattern_key: string
          reversible?: boolean | null
        }
        Update: {
          applied?: boolean | null
          applied_at?: string | null
          confidence?: number | null
          created_at?: string | null
          id?: string
          improvement?: string | null
          metadata?: Json | null
          pattern_description?: string | null
          pattern_key?: string
          reversible?: boolean | null
        }
        Relationships: []
      }
      alex_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          message_type: string | null
          metadata: Json | null
          sender: string
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          message_type?: string | null
          metadata?: Json | null
          sender?: string
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          message_type?: string | null
          metadata?: Json | null
          sender?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alex_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "alex_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      alex_performance_metrics: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          metric_type: string
          metric_value: number
          segment: string | null
          timeframe: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          metric_type: string
          metric_value?: number
          segment?: string | null
          timeframe?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          metric_type?: string
          metric_value?: number
          segment?: string | null
          timeframe?: string | null
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
      ambassador_claims: {
        Row: {
          activated_at: string | null
          claimed_at: string | null
          id: string
          intent_slug: string
          offer_id: string
          referrer_user_id: string | null
          status: string
          user_id: string
          variant: string | null
        }
        Insert: {
          activated_at?: string | null
          claimed_at?: string | null
          id?: string
          intent_slug?: string
          offer_id: string
          referrer_user_id?: string | null
          status?: string
          user_id: string
          variant?: string | null
        }
        Update: {
          activated_at?: string | null
          claimed_at?: string | null
          id?: string
          intent_slug?: string
          offer_id?: string
          referrer_user_id?: string | null
          status?: string
          user_id?: string
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ambassador_claims_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "ambassador_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassador_offers: {
        Row: {
          benefits_json: Json | null
          claimed_count: number
          created_at: string | null
          id: string
          intent_slug: string
          is_active: boolean | null
          offer_description_fr: string | null
          offer_label_fr: string | null
          total_slots: number
          updated_at: string | null
        }
        Insert: {
          benefits_json?: Json | null
          claimed_count?: number
          created_at?: string | null
          id?: string
          intent_slug?: string
          is_active?: boolean | null
          offer_description_fr?: string | null
          offer_label_fr?: string | null
          total_slots?: number
          updated_at?: string | null
        }
        Update: {
          benefits_json?: Json | null
          claimed_count?: number
          created_at?: string | null
          id?: string
          intent_slug?: string
          is_active?: boolean | null
          offer_description_fr?: string | null
          offer_label_fr?: string | null
          total_slots?: number
          updated_at?: string | null
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
      appointment_credits: {
        Row: {
          appointment_id: string | null
          contractor_id: string
          created_at: string
          credit_amount_cents: number
          credit_reason: string
          credit_status: string
          id: string
          price_calculation_id: string | null
          requested_at: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
        }
        Insert: {
          appointment_id?: string | null
          contractor_id: string
          created_at?: string
          credit_amount_cents: number
          credit_reason: string
          credit_status?: string
          id?: string
          price_calculation_id?: string | null
          requested_at?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Update: {
          appointment_id?: string | null
          contractor_id?: string
          created_at?: string
          credit_amount_cents?: number
          credit_reason?: string
          credit_status?: string
          id?: string
          price_calculation_id?: string | null
          requested_at?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_credits_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_credits_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_credits_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_credits_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_credits_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
          {
            foreignKeyName: "appointment_credits_price_calculation_id_fkey"
            columns: ["price_calculation_id"]
            isOneToOne: false
            referencedRelation: "appointment_price_calculations"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_feedback: {
        Row: {
          appointment_id: string
          comment: string | null
          contractor_id: string | null
          created_at: string
          homeowner_profile_id: string | null
          id: string
          lead_id: string
          property_id: string | null
          rating: number
          was_on_time: boolean | null
          was_professional: boolean | null
          would_recommend: boolean | null
        }
        Insert: {
          appointment_id: string
          comment?: string | null
          contractor_id?: string | null
          created_at?: string
          homeowner_profile_id?: string | null
          id?: string
          lead_id: string
          property_id?: string | null
          rating: number
          was_on_time?: boolean | null
          was_professional?: boolean | null
          would_recommend?: boolean | null
        }
        Update: {
          appointment_id?: string
          comment?: string | null
          contractor_id?: string | null
          created_at?: string
          homeowner_profile_id?: string | null
          id?: string
          lead_id?: string
          property_id?: string | null
          rating?: number
          was_on_time?: boolean | null
          was_professional?: boolean | null
          would_recommend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_feedback_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_feedback_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_feedback_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_feedback_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_feedback_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
          {
            foreignKeyName: "appointment_feedback_homeowner_profile_id_fkey"
            columns: ["homeowner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_feedback_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_feedback_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_feedback_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_price_calculations: {
        Row: {
          admin_override: boolean
          admin_override_by: string | null
          admin_override_price_cents: number | null
          admin_override_reason: string | null
          appointment_id: string | null
          availability_multiplier: number
          base_price_cents: number
          city_slug: string | null
          combined_multiplier: number
          competition_multiplier: number
          complexity_level: string | null
          complexity_multiplier: number
          contractor_id: string
          created_at: string
          demand_multiplier: number
          estimated_project_value_cents: number | null
          final_price_cents: number
          id: string
          is_surge: boolean
          match_quality_score: number | null
          plan_tier: string
          precision_multiplier: number
          price_ceiling_cents: number
          price_floor_cents: number
          price_justification_json: Json | null
          project_request_id: string | null
          project_value_multiplier: number
          surge_reason: string | null
          trade_slug: string | null
          urgency_level: string | null
          urgency_multiplier: number
        }
        Insert: {
          admin_override?: boolean
          admin_override_by?: string | null
          admin_override_price_cents?: number | null
          admin_override_reason?: string | null
          appointment_id?: string | null
          availability_multiplier?: number
          base_price_cents: number
          city_slug?: string | null
          combined_multiplier?: number
          competition_multiplier?: number
          complexity_level?: string | null
          complexity_multiplier?: number
          contractor_id: string
          created_at?: string
          demand_multiplier?: number
          estimated_project_value_cents?: number | null
          final_price_cents: number
          id?: string
          is_surge?: boolean
          match_quality_score?: number | null
          plan_tier: string
          precision_multiplier?: number
          price_ceiling_cents?: number
          price_floor_cents?: number
          price_justification_json?: Json | null
          project_request_id?: string | null
          project_value_multiplier?: number
          surge_reason?: string | null
          trade_slug?: string | null
          urgency_level?: string | null
          urgency_multiplier?: number
        }
        Update: {
          admin_override?: boolean
          admin_override_by?: string | null
          admin_override_price_cents?: number | null
          admin_override_reason?: string | null
          appointment_id?: string | null
          availability_multiplier?: number
          base_price_cents?: number
          city_slug?: string | null
          combined_multiplier?: number
          competition_multiplier?: number
          complexity_level?: string | null
          complexity_multiplier?: number
          contractor_id?: string
          created_at?: string
          demand_multiplier?: number
          estimated_project_value_cents?: number | null
          final_price_cents?: number
          id?: string
          is_surge?: boolean
          match_quality_score?: number | null
          plan_tier?: string
          precision_multiplier?: number
          price_ceiling_cents?: number
          price_floor_cents?: number
          price_justification_json?: Json | null
          project_request_id?: string | null
          project_value_multiplier?: number
          surge_reason?: string | null
          trade_slug?: string | null
          urgency_level?: string | null
          urgency_multiplier?: number
        }
        Relationships: [
          {
            foreignKeyName: "appointment_price_calculations_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_price_calculations_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_price_calculations_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_price_calculations_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_price_calculations_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      appointment_pricing_rules: {
        Row: {
          base_value: number
          created_at: string
          description_fr: string | null
          id: string
          is_active: boolean
          label_fr: string
          max_value: number
          metadata: Json | null
          min_value: number
          rule_category: string
          rule_key: string
          updated_at: string
        }
        Insert: {
          base_value?: number
          created_at?: string
          description_fr?: string | null
          id?: string
          is_active?: boolean
          label_fr: string
          max_value?: number
          metadata?: Json | null
          min_value?: number
          rule_category: string
          rule_key: string
          updated_at?: string
        }
        Update: {
          base_value?: number
          created_at?: string
          description_fr?: string | null
          id?: string
          is_active?: boolean
          label_fr?: string
          max_value?: number
          metadata?: Json | null
          min_value?: number
          rule_category?: string
          rule_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      appointment_surge_events: {
        Row: {
          city_slug: string
          created_at: string
          demand_count: number
          ended_at: string | null
          id: string
          is_active: boolean
          started_at: string
          supply_count: number
          surge_multiplier: number
          trade_slug: string
        }
        Insert: {
          city_slug: string
          created_at?: string
          demand_count?: number
          ended_at?: string | null
          id?: string
          is_active?: boolean
          started_at?: string
          supply_count?: number
          surge_multiplier?: number
          trade_slug: string
        }
        Update: {
          city_slug?: string
          created_at?: string
          demand_count?: number
          ended_at?: string | null
          id?: string
          is_active?: boolean
          started_at?: string
          supply_count?: number
          surge_multiplier?: number
          trade_slug?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          budget_range: string | null
          cancellation_reason: string | null
          completed_at: string | null
          contact_preference: string | null
          contractor_confirmed: boolean | null
          contractor_en_route_at: string | null
          contractor_id: string
          created_at: string
          created_by: string | null
          homeowner_confirmed: boolean | null
          homeowner_user_id: string
          id: string
          lead_id: string | null
          notes: string | null
          preferred_date: string | null
          preferred_time_window: string | null
          project_category: string | null
          property_id: string | null
          reschedule_reason: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["appointment_status"]
          timeline: string | null
          updated_at: string
          urgency_level: string | null
        }
        Insert: {
          budget_range?: string | null
          cancellation_reason?: string | null
          completed_at?: string | null
          contact_preference?: string | null
          contractor_confirmed?: boolean | null
          contractor_en_route_at?: string | null
          contractor_id: string
          created_at?: string
          created_by?: string | null
          homeowner_confirmed?: boolean | null
          homeowner_user_id: string
          id?: string
          lead_id?: string | null
          notes?: string | null
          preferred_date?: string | null
          preferred_time_window?: string | null
          project_category?: string | null
          property_id?: string | null
          reschedule_reason?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          timeline?: string | null
          updated_at?: string
          urgency_level?: string | null
        }
        Update: {
          budget_range?: string | null
          cancellation_reason?: string | null
          completed_at?: string | null
          contact_preference?: string | null
          contractor_confirmed?: boolean | null
          contractor_en_route_at?: string | null
          contractor_id?: string
          created_at?: string
          created_by?: string | null
          homeowner_confirmed?: boolean | null
          homeowner_user_id?: string
          id?: string
          lead_id?: string | null
          notes?: string | null
          preferred_date?: string | null
          preferred_time_window?: string | null
          project_category?: string | null
          property_id?: string | null
          reschedule_reason?: string | null
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
            foreignKeyName: "appointments_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
          {
            foreignKeyName: "appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
            referencedColumns: ["id"]
          },
        ]
      }
      authority_articles: {
        Row: {
          aeo_score: number | null
          content: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          published_at: string | null
          seo_score: number | null
          status: string | null
          title: string
          topic_id: string | null
          updated_at: string | null
          user_id: string | null
          word_count: number | null
        }
        Insert: {
          aeo_score?: number | null
          content?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          published_at?: string | null
          seo_score?: number | null
          status?: string | null
          title: string
          topic_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          word_count?: number | null
        }
        Update: {
          aeo_score?: number | null
          content?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          published_at?: string | null
          seo_score?: number | null
          status?: string | null
          title?: string
          topic_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "authority_articles_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "authority_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      authority_content_variants: {
        Row: {
          article_id: string | null
          created_at: string | null
          engagement_score: number | null
          id: string
          platform: string
          posted_at: string | null
          scheduled_at: string | null
          status: string | null
          variant_content: string | null
        }
        Insert: {
          article_id?: string | null
          created_at?: string | null
          engagement_score?: number | null
          id?: string
          platform: string
          posted_at?: string | null
          scheduled_at?: string | null
          status?: string | null
          variant_content?: string | null
        }
        Update: {
          article_id?: string | null
          created_at?: string | null
          engagement_score?: number | null
          id?: string
          platform?: string
          posted_at?: string | null
          scheduled_at?: string | null
          status?: string | null
          variant_content?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "authority_content_variants_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "authority_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      authority_distribution_queue: {
        Row: {
          created_at: string | null
          id: string
          platform: string
          priority: number | null
          result: Json | null
          scheduled_for: string | null
          status: string | null
          user_id: string | null
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          platform: string
          priority?: number | null
          result?: Json | null
          scheduled_for?: string | null
          status?: string | null
          user_id?: string | null
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          platform?: string
          priority?: number | null
          result?: Json | null
          scheduled_for?: string | null
          status?: string | null
          user_id?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "authority_distribution_queue_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "authority_content_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      authority_performance: {
        Row: {
          consistency_score: number | null
          content_volume: number | null
          growth_pct: number | null
          id: string
          metadata: Json | null
          overall_score: number | null
          platform_diversity: number | null
          signal_strength: number | null
          snapshot_at: string | null
          structure_quality: number | null
          user_id: string | null
        }
        Insert: {
          consistency_score?: number | null
          content_volume?: number | null
          growth_pct?: number | null
          id?: string
          metadata?: Json | null
          overall_score?: number | null
          platform_diversity?: number | null
          signal_strength?: number | null
          snapshot_at?: string | null
          structure_quality?: number | null
          user_id?: string | null
        }
        Update: {
          consistency_score?: number | null
          content_volume?: number | null
          growth_pct?: number | null
          id?: string
          metadata?: Json | null
          overall_score?: number | null
          platform_diversity?: number | null
          signal_strength?: number | null
          snapshot_at?: string | null
          structure_quality?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      authority_signals: {
        Row: {
          created_at: string | null
          detected_at: string | null
          id: string
          metadata: Json | null
          signal_type: string
          source: string | null
          source_url: string | null
          strength_score: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          detected_at?: string | null
          id?: string
          metadata?: Json | null
          signal_type: string
          source?: string | null
          source_url?: string | null
          strength_score?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          detected_at?: string | null
          id?: string
          metadata?: Json | null
          signal_type?: string
          source?: string | null
          source_url?: string | null
          strength_score?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      authority_tasks: {
        Row: {
          completed_at: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          due_date: string | null
          duration_minutes: number | null
          id: string
          priority: string | null
          related_topic_id: string | null
          source: string | null
          status: string | null
          task_type: string | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          due_date?: string | null
          duration_minutes?: number | null
          id?: string
          priority?: string | null
          related_topic_id?: string | null
          source?: string | null
          status?: string | null
          task_type?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          due_date?: string | null
          duration_minutes?: number | null
          id?: string
          priority?: string | null
          related_topic_id?: string | null
          source?: string | null
          status?: string | null
          task_type?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "authority_tasks_related_topic_id_fkey"
            columns: ["related_topic_id"]
            isOneToOne: false
            referencedRelation: "authority_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      authority_topics: {
        Row: {
          aeo_score: number | null
          category: string | null
          created_at: string | null
          id: string
          location: string | null
          platform_coverage: Json | null
          slug: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          aeo_score?: number | null
          category?: string | null
          created_at?: string | null
          id?: string
          location?: string | null
          platform_coverage?: Json | null
          slug?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          aeo_score?: number | null
          category?: string | null
          created_at?: string | null
          id?: string
          location?: string | null
          platform_coverage?: Json | null
          slug?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      auto_campaigns: {
        Row: {
          created_at: string
          expected_lift_pct: number | null
          feature: string | null
          id: string
          name: string
          placement_type: string | null
          source_pattern: Json | null
          status: string
          target_city: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          expected_lift_pct?: number | null
          feature?: string | null
          id?: string
          name: string
          placement_type?: string | null
          source_pattern?: Json | null
          status?: string
          target_city?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          expected_lift_pct?: number | null
          feature?: string | null
          id?: string
          name?: string
          placement_type?: string | null
          source_pattern?: Json | null
          status?: string
          target_city?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      automation_agents: {
        Row: {
          adaptive_frequency_enabled: boolean | null
          auto_pause_threshold: number | null
          base_frequency_value: number | null
          category: string
          config: Json | null
          created_at: string | null
          cron_expression: string | null
          current_frequency_multiplier: number | null
          description: string | null
          duplicate_similarity_threshold: number | null
          error_streak: number | null
          frequency_type: string
          frequency_value: number | null
          id: string
          is_enabled: boolean | null
          key: string
          last_run_at: string | null
          last_status: string | null
          max_jobs_per_day: number | null
          max_jobs_per_run: number | null
          min_data_confidence: number | null
          name: string
          next_run_at: string | null
          priority: number | null
          quality_threshold: number | null
          requires_manual_review: boolean | null
          run_if_queue_not_empty_only: boolean | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          adaptive_frequency_enabled?: boolean | null
          auto_pause_threshold?: number | null
          base_frequency_value?: number | null
          category: string
          config?: Json | null
          created_at?: string | null
          cron_expression?: string | null
          current_frequency_multiplier?: number | null
          description?: string | null
          duplicate_similarity_threshold?: number | null
          error_streak?: number | null
          frequency_type: string
          frequency_value?: number | null
          id?: string
          is_enabled?: boolean | null
          key: string
          last_run_at?: string | null
          last_status?: string | null
          max_jobs_per_day?: number | null
          max_jobs_per_run?: number | null
          min_data_confidence?: number | null
          name: string
          next_run_at?: string | null
          priority?: number | null
          quality_threshold?: number | null
          requires_manual_review?: boolean | null
          run_if_queue_not_empty_only?: boolean | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          adaptive_frequency_enabled?: boolean | null
          auto_pause_threshold?: number | null
          base_frequency_value?: number | null
          category?: string
          config?: Json | null
          created_at?: string | null
          cron_expression?: string | null
          current_frequency_multiplier?: number | null
          description?: string | null
          duplicate_similarity_threshold?: number | null
          error_streak?: number | null
          frequency_type?: string
          frequency_value?: number | null
          id?: string
          is_enabled?: boolean | null
          key?: string
          last_run_at?: string | null
          last_status?: string | null
          max_jobs_per_day?: number | null
          max_jobs_per_run?: number | null
          min_data_confidence?: number | null
          name?: string
          next_run_at?: string | null
          priority?: number | null
          quality_threshold?: number | null
          requires_manual_review?: boolean | null
          run_if_queue_not_empty_only?: boolean | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      automation_alerts: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          level: string
          message: string | null
          metadata: Json | null
          source: string | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          level: string
          message?: string | null
          metadata?: Json | null
          source?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          level?: string
          message?: string | null
          metadata?: Json | null
          source?: string | null
          title?: string | null
        }
        Relationships: []
      }
      automation_jobs: {
        Row: {
          agent_id: string | null
          attempts: number | null
          created_at: string | null
          created_by: string | null
          duration_ms: number | null
          entity_id: string | null
          entity_type: string | null
          error_message: string | null
          finished_at: string | null
          id: string
          job_type: string | null
          max_attempts: number | null
          payload: Json | null
          priority: number | null
          result_payload: Json | null
          result_summary: string | null
          scheduled_for: string | null
          source_trigger: string | null
          started_at: string | null
          status: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          attempts?: number | null
          created_at?: string | null
          created_by?: string | null
          duration_ms?: number | null
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          job_type?: string | null
          max_attempts?: number | null
          payload?: Json | null
          priority?: number | null
          result_payload?: Json | null
          result_summary?: string | null
          scheduled_for?: string | null
          source_trigger?: string | null
          started_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          attempts?: number | null
          created_at?: string | null
          created_by?: string | null
          duration_ms?: number | null
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          job_type?: string | null
          max_attempts?: number | null
          payload?: Json | null
          priority?: number | null
          result_payload?: Json | null
          result_summary?: string | null
          scheduled_for?: string | null
          source_trigger?: string | null
          started_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_jobs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "automation_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_prompt_exports: {
        Row: {
          created_at: string | null
          id: string
          job_id: string | null
          module_key: string | null
          prompt_text: string | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_id?: string | null
          module_key?: string | null
          prompt_text?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          job_id?: string | null
          module_key?: string | null
          prompt_text?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_prompt_exports_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "automation_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_runs: {
        Row: {
          agent_id: string | null
          created_at: string | null
          id: string
          jobs_executed: number | null
          jobs_failed: number | null
          jobs_found: number | null
          jobs_skipped: number | null
          jobs_succeeded: number | null
          metrics: Json | null
          notes: string | null
          run_finished_at: string | null
          run_started_at: string | null
          status: string | null
          triggered_by: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          id?: string
          jobs_executed?: number | null
          jobs_failed?: number | null
          jobs_found?: number | null
          jobs_skipped?: number | null
          jobs_succeeded?: number | null
          metrics?: Json | null
          notes?: string | null
          run_finished_at?: string | null
          run_started_at?: string | null
          status?: string | null
          triggered_by?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          id?: string
          jobs_executed?: number | null
          jobs_failed?: number | null
          jobs_found?: number | null
          jobs_skipped?: number | null
          jobs_succeeded?: number | null
          metrics?: Json | null
          notes?: string | null
          run_finished_at?: string | null
          run_started_at?: string | null
          status?: string | null
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "automation_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      autopilot_actions: {
        Row: {
          action_type: string
          created_at: string
          event_id: string | null
          id: string
          payload_json: Json | null
          property_id: string
          status: string
        }
        Insert: {
          action_type?: string
          created_at?: string
          event_id?: string | null
          id?: string
          payload_json?: Json | null
          property_id: string
          status?: string
        }
        Update: {
          action_type?: string
          created_at?: string
          event_id?: string | null
          id?: string
          payload_json?: Json | null
          property_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "autopilot_actions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "autopilot_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autopilot_actions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autopilot_actions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
            referencedColumns: ["id"]
          },
        ]
      }
      autopilot_events: {
        Row: {
          event_type: string
          id: string
          metadata: Json | null
          property_id: string
          rule_id: string | null
          status: string
          triggered_at: string
        }
        Insert: {
          event_type?: string
          id?: string
          metadata?: Json | null
          property_id: string
          rule_id?: string | null
          status?: string
          triggered_at?: string
        }
        Update: {
          event_type?: string
          id?: string
          metadata?: Json | null
          property_id?: string
          rule_id?: string | null
          status?: string
          triggered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "autopilot_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autopilot_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "autopilot_events_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "autopilot_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      autopilot_rules: {
        Row: {
          action_type: string
          condition_json: Json
          created_at: string
          id: string
          is_active: boolean
          label_fr: string | null
          priority: number
          trigger_type: string
          updated_at: string
        }
        Insert: {
          action_type?: string
          condition_json?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          label_fr?: string | null
          priority?: number
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          condition_json?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          label_fr?: string | null
          priority?: number
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_analytics: {
        Row: {
          article_id: string
          avg_position: number | null
          avg_time_on_page_seconds: number | null
          bounce_rate: number | null
          clicks: number | null
          created_at: string
          date: string
          id: string
          impressions: number | null
          scroll_depth_avg: number | null
          signups: number | null
          subscriptions: number | null
          unlocks: number | null
        }
        Insert: {
          article_id: string
          avg_position?: number | null
          avg_time_on_page_seconds?: number | null
          bounce_rate?: number | null
          clicks?: number | null
          created_at?: string
          date?: string
          id?: string
          impressions?: number | null
          scroll_depth_avg?: number | null
          signups?: number | null
          subscriptions?: number | null
          unlocks?: number | null
        }
        Update: {
          article_id?: string
          avg_position?: number | null
          avg_time_on_page_seconds?: number | null
          bounce_rate?: number | null
          clicks?: number | null
          created_at?: string
          date?: string
          id?: string
          impressions?: number | null
          scroll_depth_avg?: number | null
          signups?: number | null
          subscriptions?: number | null
          unlocks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_analytics_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "blog_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_article_images: {
        Row: {
          alt_text: string
          article_id: string
          caption: string | null
          created_at: string
          display_order: number
          height: number | null
          id: string
          image_url: string
          is_featured: boolean
          width: number | null
        }
        Insert: {
          alt_text?: string
          article_id: string
          caption?: string | null
          created_at?: string
          display_order?: number
          height?: number | null
          id?: string
          image_url: string
          is_featured?: boolean
          width?: number | null
        }
        Update: {
          alt_text?: string
          article_id?: string
          caption?: string | null
          created_at?: string
          display_order?: number
          height?: number | null
          id?: string
          image_url?: string
          is_featured?: boolean
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_article_images_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "blog_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_articles: {
        Row: {
          audience_type: string
          author_name: string | null
          category: string
          city: string | null
          content_html: string | null
          content_markdown: string | null
          created_at: string
          cta_variant: string | null
          faq_json: Json | null
          featured_image_url: string | null
          generation_run_id: string | null
          id: string
          internal_linking_json: Json | null
          is_gated: boolean
          meta_description: string | null
          published_at: string | null
          reading_time_minutes: number | null
          scheduled_at: string | null
          schema_json: Json | null
          seo_title: string | null
          slug: string
          status: string
          subtitle: string | null
          tags: string[] | null
          title: string
          updated_at: string
          word_count: number | null
        }
        Insert: {
          audience_type?: string
          author_name?: string | null
          category?: string
          city?: string | null
          content_html?: string | null
          content_markdown?: string | null
          created_at?: string
          cta_variant?: string | null
          faq_json?: Json | null
          featured_image_url?: string | null
          generation_run_id?: string | null
          id?: string
          internal_linking_json?: Json | null
          is_gated?: boolean
          meta_description?: string | null
          published_at?: string | null
          reading_time_minutes?: number | null
          scheduled_at?: string | null
          schema_json?: Json | null
          seo_title?: string | null
          slug: string
          status?: string
          subtitle?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          word_count?: number | null
        }
        Update: {
          audience_type?: string
          author_name?: string | null
          category?: string
          city?: string | null
          content_html?: string | null
          content_markdown?: string | null
          created_at?: string
          cta_variant?: string | null
          faq_json?: Json | null
          featured_image_url?: string | null
          generation_run_id?: string | null
          id?: string
          internal_linking_json?: Json | null
          is_gated?: boolean
          meta_description?: string | null
          published_at?: string | null
          reading_time_minutes?: number | null
          scheduled_at?: string | null
          schema_json?: Json | null
          seo_title?: string | null
          slug?: string
          status?: string
          subtitle?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          word_count?: number | null
        }
        Relationships: []
      }
      blog_internal_links: {
        Row: {
          anchor_text: string
          created_at: string
          id: string
          position_in_content: string | null
          relevance_score: number | null
          source_article_id: string
          target_article_id: string | null
          target_type: string
          target_url: string
        }
        Insert: {
          anchor_text: string
          created_at?: string
          id?: string
          position_in_content?: string | null
          relevance_score?: number | null
          source_article_id: string
          target_article_id?: string | null
          target_type?: string
          target_url: string
        }
        Update: {
          anchor_text?: string
          created_at?: string
          id?: string
          position_in_content?: string | null
          relevance_score?: number | null
          source_article_id?: string
          target_article_id?: string | null
          target_type?: string
          target_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_internal_links_source_article_id_fkey"
            columns: ["source_article_id"]
            isOneToOne: false
            referencedRelation: "blog_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_internal_links_target_article_id_fkey"
            columns: ["target_article_id"]
            isOneToOne: false
            referencedRelation: "blog_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_publish_queue: {
        Row: {
          article_id: string
          attempts: number
          created_at: string
          error_message: string | null
          id: string
          max_attempts: number
          published_at: string | null
          scheduled_for: string
          status: string
          updated_at: string
        }
        Insert: {
          article_id: string
          attempts?: number
          created_at?: string
          error_message?: string | null
          id?: string
          max_attempts?: number
          published_at?: string | null
          scheduled_for: string
          status?: string
          updated_at?: string
        }
        Update: {
          article_id?: string
          attempts?: number
          created_at?: string
          error_message?: string | null
          id?: string
          max_attempts?: number
          published_at?: string | null
          scheduled_for?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_publish_queue_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "blog_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_appointment_types: {
        Row: {
          allows_same_day: boolean | null
          apply_to_final_invoice: boolean | null
          availability_mode: string | null
          buffer_after_minutes: number | null
          buffer_before_minutes: number | null
          cancellation_policy: string | null
          category: string | null
          color: string | null
          contractor_id: string
          created_at: string | null
          deposit_amount_cents: number | null
          duration_minutes: number
          icon: string | null
          id: string
          is_active: boolean | null
          is_free: boolean | null
          location_mode: string | null
          long_description: string | null
          max_daily_count: number | null
          min_notice_hours: number | null
          price_amount: number | null
          price_type: string | null
          refundable: boolean | null
          requires_deposit: boolean | null
          requires_documents: boolean | null
          requires_manual_approval: boolean | null
          requires_photos: boolean | null
          requires_prequalification: boolean | null
          short_description: string | null
          slug: string
          sort_order: number | null
          supports_alex_booking: boolean | null
          supports_qr_booking: boolean | null
          title: string
          travel_padding_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          allows_same_day?: boolean | null
          apply_to_final_invoice?: boolean | null
          availability_mode?: string | null
          buffer_after_minutes?: number | null
          buffer_before_minutes?: number | null
          cancellation_policy?: string | null
          category?: string | null
          color?: string | null
          contractor_id: string
          created_at?: string | null
          deposit_amount_cents?: number | null
          duration_minutes?: number
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_free?: boolean | null
          location_mode?: string | null
          long_description?: string | null
          max_daily_count?: number | null
          min_notice_hours?: number | null
          price_amount?: number | null
          price_type?: string | null
          refundable?: boolean | null
          requires_deposit?: boolean | null
          requires_documents?: boolean | null
          requires_manual_approval?: boolean | null
          requires_photos?: boolean | null
          requires_prequalification?: boolean | null
          short_description?: string | null
          slug: string
          sort_order?: number | null
          supports_alex_booking?: boolean | null
          supports_qr_booking?: boolean | null
          title: string
          travel_padding_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          allows_same_day?: boolean | null
          apply_to_final_invoice?: boolean | null
          availability_mode?: string | null
          buffer_after_minutes?: number | null
          buffer_before_minutes?: number | null
          cancellation_policy?: string | null
          category?: string | null
          color?: string | null
          contractor_id?: string
          created_at?: string | null
          deposit_amount_cents?: number | null
          duration_minutes?: number
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_free?: boolean | null
          location_mode?: string | null
          long_description?: string | null
          max_daily_count?: number | null
          min_notice_hours?: number | null
          price_amount?: number | null
          price_type?: string | null
          refundable?: boolean | null
          requires_deposit?: boolean | null
          requires_documents?: boolean | null
          requires_manual_approval?: boolean | null
          requires_photos?: boolean | null
          requires_prequalification?: boolean | null
          short_description?: string | null
          slug?: string
          sort_order?: number | null
          supports_alex_booking?: boolean | null
          supports_qr_booking?: boolean | null
          title?: string
          travel_padding_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_appointment_types_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_appointment_types_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_appointment_types_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_appointment_types_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      booking_availability: {
        Row: {
          contractor_id: string
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean | null
          start_time: string
        }
        Insert: {
          contractor_id: string
          created_at?: string | null
          day_of_week: number
          end_time?: string
          id?: string
          is_active?: boolean | null
          start_time?: string
        }
        Update: {
          contractor_id?: string
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_availability_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_availability_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_availability_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_availability_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      booking_blackouts: {
        Row: {
          contractor_id: string
          created_at: string | null
          end_at: string
          id: string
          reason: string | null
          source: string | null
          start_at: string
        }
        Insert: {
          contractor_id: string
          created_at?: string | null
          end_at: string
          id?: string
          reason?: string | null
          source?: string | null
          start_at: string
        }
        Update: {
          contractor_id?: string
          created_at?: string | null
          end_at?: string
          id?: string
          reason?: string | null
          source?: string | null
          start_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_blackouts_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_blackouts_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_blackouts_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_blackouts_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      booking_calendar_integrations: {
        Row: {
          contractor_id: string
          created_at: string | null
          id: string
          metadata_secure: Json | null
          provider: string | null
          selected_calendar_id: string | null
          status: string | null
          sync_read_busy: boolean | null
          sync_write_events: boolean | null
          updated_at: string | null
        }
        Insert: {
          contractor_id: string
          created_at?: string | null
          id?: string
          metadata_secure?: Json | null
          provider?: string | null
          selected_calendar_id?: string | null
          status?: string | null
          sync_read_busy?: boolean | null
          sync_write_events?: boolean | null
          updated_at?: string | null
        }
        Update: {
          contractor_id?: string
          created_at?: string | null
          id?: string
          metadata_secure?: Json | null
          provider?: string | null
          selected_calendar_id?: string | null
          status?: string | null
          sync_read_busy?: boolean | null
          sync_write_events?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_calendar_integrations_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_calendar_integrations_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_calendar_integrations_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_calendar_integrations_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      booking_files: {
        Row: {
          booking_id: string
          created_at: string | null
          file_label: string | null
          file_type: string | null
          file_url: string
          id: string
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          file_label?: string | null
          file_type?: string | null
          file_url: string
          id?: string
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          file_label?: string | null
          file_type?: string | null
          file_url?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_files_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "smart_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_intake_answers: {
        Row: {
          booking_id: string
          created_at: string | null
          field_key: string
          field_value: Json
          id: string
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          field_key: string
          field_value?: Json
          id?: string
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          field_key?: string
          field_value?: Json
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_intake_answers_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "smart_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_links: {
        Row: {
          alex_mode: boolean | null
          appointment_type_id: string | null
          booking_count: number | null
          city: string | null
          contractor_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          qr_code_url: string | null
          scan_count: number | null
          service: string | null
          slug: string
          source_tag: string | null
          title: string | null
        }
        Insert: {
          alex_mode?: boolean | null
          appointment_type_id?: string | null
          booking_count?: number | null
          city?: string | null
          contractor_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          qr_code_url?: string | null
          scan_count?: number | null
          service?: string | null
          slug: string
          source_tag?: string | null
          title?: string | null
        }
        Update: {
          alex_mode?: boolean | null
          appointment_type_id?: string | null
          booking_count?: number | null
          city?: string | null
          contractor_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          qr_code_url?: string | null
          scan_count?: number | null
          service?: string | null
          slug?: string
          source_tag?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_links_appointment_type_id_fkey"
            columns: ["appointment_type_id"]
            isOneToOne: false
            referencedRelation: "booking_appointment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_links_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_links_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_links_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_links_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      booking_pricing_rules: {
        Row: {
          contractor_id: string
          created_at: string
          description_fr: string | null
          id: string
          is_active: boolean
          rule_key: string
          rule_type: string
          updated_at: string
          value: number
        }
        Insert: {
          contractor_id: string
          created_at?: string
          description_fr?: string | null
          id?: string
          is_active?: boolean
          rule_key: string
          rule_type: string
          updated_at?: string
          value?: number
        }
        Update: {
          contractor_id?: string
          created_at?: string
          description_fr?: string | null
          id?: string
          is_active?: boolean
          rule_key?: string
          rule_type?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      booking_slot_scores: {
        Row: {
          booking_id: string | null
          breakdown_json: Json | null
          close_probability: number | null
          contractor_id: string
          created_at: string
          dna_match_score: number | null
          estimated_job_value_cents: number | null
          id: string
          score: number
          travel_efficiency: number | null
          urgency_bonus: number | null
        }
        Insert: {
          booking_id?: string | null
          breakdown_json?: Json | null
          close_probability?: number | null
          contractor_id: string
          created_at?: string
          dna_match_score?: number | null
          estimated_job_value_cents?: number | null
          id?: string
          score?: number
          travel_efficiency?: number | null
          urgency_bonus?: number | null
        }
        Update: {
          booking_id?: string | null
          breakdown_json?: Json | null
          close_probability?: number | null
          contractor_id?: string
          created_at?: string
          dna_match_score?: number | null
          estimated_job_value_cents?: number | null
          id?: string
          score?: number
          travel_efficiency?: number | null
          urgency_bonus?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_slot_scores_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "smart_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_transactions: {
        Row: {
          amount_total_cents: number
          booking_id: string | null
          contractor_amount_cents: number
          contractor_id: string
          created_at: string
          currency: string
          fee_rate: number
          id: string
          notes: string | null
          payment_method: string | null
          payment_reference: string | null
          refund_amount_cents: number | null
          refunded: boolean
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          unpro_fee_cents: number
          updated_at: string
        }
        Insert: {
          amount_total_cents?: number
          booking_id?: string | null
          contractor_amount_cents?: number
          contractor_id: string
          created_at?: string
          currency?: string
          fee_rate?: number
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          refund_amount_cents?: number | null
          refunded?: boolean
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          unpro_fee_cents?: number
          updated_at?: string
        }
        Update: {
          amount_total_cents?: number
          booking_id?: string | null
          contractor_amount_cents?: number
          contractor_id?: string
          created_at?: string
          currency?: string
          fee_rate?: number
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          refund_amount_cents?: number | null
          refunded?: boolean
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          unpro_fee_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "smart_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_travel_cache: {
        Row: {
          created_at: string | null
          destination_hash: string
          distance_meters: number | null
          duration_minutes: number
          id: string
          origin_hash: string
          traffic_mode: string | null
        }
        Insert: {
          created_at?: string | null
          destination_hash: string
          distance_meters?: number | null
          duration_minutes: number
          id?: string
          origin_hash: string
          traffic_mode?: string | null
        }
        Update: {
          created_at?: string | null
          destination_hash?: string
          distance_meters?: number | null
          duration_minutes?: number
          id?: string
          origin_hash?: string
          traffic_mode?: string | null
        }
        Relationships: []
      }
      broker_profiles: {
        Row: {
          agency_name: string | null
          avg_price_max: number | null
          avg_price_min: number | null
          bio: string | null
          city: string | null
          created_at: string | null
          id: string
          languages: string[] | null
          license_number: string | null
          profile_id: string | null
          service_areas: string[] | null
          specialties: string[] | null
          style: string | null
          updated_at: string | null
          years_experience: number | null
        }
        Insert: {
          agency_name?: string | null
          avg_price_max?: number | null
          avg_price_min?: number | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          id?: string
          languages?: string[] | null
          license_number?: string | null
          profile_id?: string | null
          service_areas?: string[] | null
          specialties?: string[] | null
          style?: string | null
          updated_at?: string | null
          years_experience?: number | null
        }
        Update: {
          agency_name?: string | null
          avg_price_max?: number | null
          avg_price_min?: number | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          id?: string
          languages?: string[] | null
          license_number?: string | null
          profile_id?: string | null
          service_areas?: string[] | null
          specialties?: string[] | null
          style?: string | null
          updated_at?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "broker_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      broker_scores: {
        Row: {
          acceptance_rate: number | null
          appointments_completed: number | null
          avg_review_score: number | null
          broker_id: string
          conversion_rate: number | null
          id: string
          on_time_rate: number | null
          profile_completeness_score: number | null
          ranking_score: number | null
          recommendation_rate: number | null
          response_speed_score: number | null
          updated_at: string | null
        }
        Insert: {
          acceptance_rate?: number | null
          appointments_completed?: number | null
          avg_review_score?: number | null
          broker_id: string
          conversion_rate?: number | null
          id?: string
          on_time_rate?: number | null
          profile_completeness_score?: number | null
          ranking_score?: number | null
          recommendation_rate?: number | null
          response_speed_score?: number | null
          updated_at?: string | null
        }
        Update: {
          acceptance_rate?: number | null
          appointments_completed?: number | null
          avg_review_score?: number | null
          broker_id?: string
          conversion_rate?: number | null
          id?: string
          on_time_rate?: number | null
          profile_completeness_score?: number | null
          ranking_score?: number | null
          recommendation_rate?: number | null
          response_speed_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broker_scores_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "broker_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      broker_waitlist: {
        Row: {
          activated_at: string | null
          city: string
          created_at: string
          id: string
          profile_id: string
          specialty: string
          status: string
          volume: string | null
        }
        Insert: {
          activated_at?: string | null
          city: string
          created_at?: string
          id?: string
          profile_id: string
          specialty: string
          status?: string
          volume?: string | null
        }
        Update: {
          activated_at?: string | null
          city?: string
          created_at?: string
          id?: string
          profile_id?: string
          specialty?: string
          status?: string
          volume?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broker_waitlist_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_generations: {
        Row: {
          auto_campaign_id: string
          created_at: string
          generated_assets: Json | null
          id: string
          rules_applied: Json | null
          status: string
        }
        Insert: {
          auto_campaign_id: string
          created_at?: string
          generated_assets?: Json | null
          id?: string
          rules_applied?: Json | null
          status?: string
        }
        Update: {
          auto_campaign_id?: string
          created_at?: string
          generated_assets?: Json | null
          id?: string
          rules_applied?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_generations_auto_campaign_id_fkey"
            columns: ["auto_campaign_id"]
            isOneToOne: false
            referencedRelation: "auto_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_templates_ai: {
        Row: {
          config_json: Json | null
          created_at: string
          feature: string | null
          id: string
          is_active: boolean | null
          performance_score: number | null
          placement_type: string | null
          template_type: string
        }
        Insert: {
          config_json?: Json | null
          created_at?: string
          feature?: string | null
          id?: string
          is_active?: boolean | null
          performance_score?: number | null
          placement_type?: string | null
          template_type?: string
        }
        Update: {
          config_json?: Json | null
          created_at?: string
          feature?: string | null
          id?: string
          is_active?: boolean | null
          performance_score?: number | null
          placement_type?: string | null
          template_type?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          priority: number
          service_group: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          priority?: number
          service_group?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          priority?: number
          service_group?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
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
      certification_reviews: {
        Row: {
          certification_status: string
          contribution_count: number | null
          created_at: string
          data_confidence_score: number | null
          document_quality_score: number | null
          expires_at: string | null
          id: string
          passport_completion_pct: number | null
          property_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          updated_at: string
        }
        Insert: {
          certification_status?: string
          contribution_count?: number | null
          created_at?: string
          data_confidence_score?: number | null
          document_quality_score?: number | null
          expires_at?: string | null
          id?: string
          passport_completion_pct?: number | null
          property_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
        }
        Update: {
          certification_status?: string
          contribution_count?: number | null
          created_at?: string
          data_confidence_score?: number | null
          document_quality_score?: number | null
          expires_at?: string | null
          id?: string
          passport_completion_pct?: number | null
          property_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certification_reviews_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certification_reviews_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
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
            foreignKeyName: "checkout_sessions_contractor_profile_id_fkey"
            columns: ["contractor_profile_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
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
      city_service_demand_grid: {
        Row: {
          city_slug: string
          created_at: string | null
          demand_score: number | null
          estimated_value_cents: number | null
          gap_score: number | null
          has_ad_campaign: boolean | null
          has_contractors: boolean | null
          has_seo_page: boolean | null
          id: string
          last_analyzed_at: string | null
          priority_rank: number | null
          recommended_actions: Json | null
          season: string | null
          service_slug: string | null
          supply_score: number | null
          trade_slug: string
          updated_at: string | null
          urgency_level: string | null
        }
        Insert: {
          city_slug: string
          created_at?: string | null
          demand_score?: number | null
          estimated_value_cents?: number | null
          gap_score?: number | null
          has_ad_campaign?: boolean | null
          has_contractors?: boolean | null
          has_seo_page?: boolean | null
          id?: string
          last_analyzed_at?: string | null
          priority_rank?: number | null
          recommended_actions?: Json | null
          season?: string | null
          service_slug?: string | null
          supply_score?: number | null
          trade_slug: string
          updated_at?: string | null
          urgency_level?: string | null
        }
        Update: {
          city_slug?: string
          created_at?: string | null
          demand_score?: number | null
          estimated_value_cents?: number | null
          gap_score?: number | null
          has_ad_campaign?: boolean | null
          has_contractors?: boolean | null
          has_seo_page?: boolean | null
          id?: string
          last_analyzed_at?: string | null
          priority_rank?: number | null
          recommended_actions?: Json | null
          season?: string | null
          service_slug?: string | null
          supply_score?: number | null
          trade_slug?: string
          updated_at?: string | null
          urgency_level?: string | null
        }
        Relationships: []
      }
      condo_subscriptions: {
        Row: {
          billing_interval: string | null
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_tier: string
          price_cents: number | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          syndicate_id: string
          unit_count_tier: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_interval?: string | null
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_tier?: string
          price_cents?: number | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          syndicate_id: string
          unit_count_tier?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_interval?: string | null
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_tier?: string
          price_cents?: number | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          syndicate_id?: string
          unit_count_tier?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "condo_subscriptions_syndicate_id_fkey"
            columns: ["syndicate_id"]
            isOneToOne: true
            referencedRelation: "syndicates"
            referencedColumns: ["id"]
          },
        ]
      }
      content_generation_runs: {
        Row: {
          article_id: string | null
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          input_json: Json | null
          output_json: Json | null
          run_type: string
          started_at: string | null
          status: string
          topic_id: string | null
        }
        Insert: {
          article_id?: string | null
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_json?: Json | null
          output_json?: Json | null
          run_type?: string
          started_at?: string | null
          status?: string
          topic_id?: string | null
        }
        Update: {
          article_id?: string | null
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_json?: Json | null
          output_json?: Json | null
          run_type?: string
          started_at?: string | null
          status?: string
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_generation_runs_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "blog_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_generation_runs_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topic_backlog"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "contractor_ai_profiles_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
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
          {
            foreignKeyName: "contractor_aipp_scores_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      contractor_authority_events: {
        Row: {
          contractor_id: string
          created_at: string
          delta_score: number | null
          event_category: string
          event_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          contractor_id: string
          created_at?: string
          delta_score?: number | null
          event_category: string
          event_type: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          contractor_id?: string
          created_at?: string
          delta_score?: number | null
          event_category?: string
          event_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_authority_events_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_authority_events_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_authority_events_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_authority_events_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      contractor_authority_scores: {
        Row: {
          completion_performance: number
          computed_at: string
          confidence_level: number
          contractor_id: string
          created_at: string
          execution_model: number
          id: string
          is_current: boolean
          learning_reliability: number
          matching_precision: number
          metrics_json: Json | null
          overall_score: number
          responsiveness: number
          review_quality: number
          stability: number
          subcontract_network: number
          tags: string[] | null
          tier: string | null
          updated_at: string
        }
        Insert: {
          completion_performance?: number
          computed_at?: string
          confidence_level?: number
          contractor_id: string
          created_at?: string
          execution_model?: number
          id?: string
          is_current?: boolean
          learning_reliability?: number
          matching_precision?: number
          metrics_json?: Json | null
          overall_score?: number
          responsiveness?: number
          review_quality?: number
          stability?: number
          subcontract_network?: number
          tags?: string[] | null
          tier?: string | null
          updated_at?: string
        }
        Update: {
          completion_performance?: number
          computed_at?: string
          confidence_level?: number
          contractor_id?: string
          created_at?: string
          execution_model?: number
          id?: string
          is_current?: boolean
          learning_reliability?: number
          matching_precision?: number
          metrics_json?: Json | null
          overall_score?: number
          responsiveness?: number
          review_quality?: number
          stability?: number
          subcontract_network?: number
          tags?: string[] | null
          tier?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_authority_scores_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_authority_scores_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_authority_scores_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_authority_scores_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      contractor_auto_accept_events: {
        Row: {
          capacity_snapshot: Json | null
          contractor_id: string
          created_at: string
          decision: string
          evaluation_details: Json | null
          id: string
          reason: string | null
          request_id: string | null
          rule_snapshot: Json | null
        }
        Insert: {
          capacity_snapshot?: Json | null
          contractor_id: string
          created_at?: string
          decision: string
          evaluation_details?: Json | null
          id?: string
          reason?: string | null
          request_id?: string | null
          rule_snapshot?: Json | null
        }
        Update: {
          capacity_snapshot?: Json | null
          contractor_id?: string
          created_at?: string
          decision?: string
          evaluation_details?: Json | null
          id?: string
          reason?: string | null
          request_id?: string | null
          rule_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_auto_accept_events_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_auto_accept_events_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_auto_accept_events_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_auto_accept_events_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
          {
            foreignKeyName: "contractor_auto_accept_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "emergency_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_auto_accept_settings: {
        Row: {
          admin_disabled: boolean | null
          admin_disabled_reason: string | null
          categories: string[] | null
          confidence_threshold: number | null
          contractor_id: string
          created_at: string
          enabled: boolean
          excluded_types: string[] | null
          id: string
          max_radius_km: number | null
          preset_key: string | null
          requires_callback: boolean | null
          requires_photo: boolean | null
          severities: string[] | null
          storm_mode: string | null
          subtypes: string[] | null
          time_windows: Json | null
          updated_at: string
        }
        Insert: {
          admin_disabled?: boolean | null
          admin_disabled_reason?: string | null
          categories?: string[] | null
          confidence_threshold?: number | null
          contractor_id: string
          created_at?: string
          enabled?: boolean
          excluded_types?: string[] | null
          id?: string
          max_radius_km?: number | null
          preset_key?: string | null
          requires_callback?: boolean | null
          requires_photo?: boolean | null
          severities?: string[] | null
          storm_mode?: string | null
          subtypes?: string[] | null
          time_windows?: Json | null
          updated_at?: string
        }
        Update: {
          admin_disabled?: boolean | null
          admin_disabled_reason?: string | null
          categories?: string[] | null
          confidence_threshold?: number | null
          contractor_id?: string
          created_at?: string
          enabled?: boolean
          excluded_types?: string[] | null
          id?: string
          max_radius_km?: number | null
          preset_key?: string | null
          requires_callback?: boolean | null
          requires_photo?: boolean | null
          severities?: string[] | null
          storm_mode?: string | null
          subtypes?: string[] | null
          time_windows?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_auto_accept_settings_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: true
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_auto_accept_settings_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: true
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_auto_accept_settings_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: true
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_auto_accept_settings_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: true
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      contractor_budgets: {
        Row: {
          boost_active: boolean | null
          boost_multiplier: number | null
          contractor_id: string
          created_at: string | null
          id: string
          monthly_budget_cents: number | null
          period_end: string | null
          period_start: string | null
          remaining_budget_cents: number | null
          updated_at: string | null
        }
        Insert: {
          boost_active?: boolean | null
          boost_multiplier?: number | null
          contractor_id: string
          created_at?: string | null
          id?: string
          monthly_budget_cents?: number | null
          period_end?: string | null
          period_start?: string | null
          remaining_budget_cents?: number | null
          updated_at?: string | null
        }
        Update: {
          boost_active?: boolean | null
          boost_multiplier?: number | null
          contractor_id?: string
          created_at?: string | null
          id?: string
          monthly_budget_cents?: number | null
          period_end?: string | null
          period_start?: string | null
          remaining_budget_cents?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_budgets_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_budgets_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_budgets_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_budgets_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      contractor_capabilities: {
        Row: {
          building_type: string | null
          capability_type: string
          category_slug: string | null
          confidence: number | null
          contractor_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          material_slug: string | null
          service_slug: string | null
          source: string | null
          structure_type: string | null
          updated_at: string | null
        }
        Insert: {
          building_type?: string | null
          capability_type?: string
          category_slug?: string | null
          confidence?: number | null
          contractor_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          material_slug?: string | null
          service_slug?: string | null
          source?: string | null
          structure_type?: string | null
          updated_at?: string | null
        }
        Update: {
          building_type?: string | null
          capability_type?: string
          category_slug?: string | null
          confidence?: number | null
          contractor_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          material_slug?: string | null
          service_slug?: string | null
          source?: string | null
          structure_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_capabilities_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_capabilities_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_capabilities_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_capabilities_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      contractor_capacity_state: {
        Row: {
          active_count: number | null
          after_hours_limit: number | null
          arrived_count: number | null
          availability_status: string
          completed_today: number | null
          contractor_id: string
          daily_emergency_limit: number | null
          emergency_radius_km: number | null
          en_route_count: number | null
          id: string
          last_reset_date: string | null
          max_active_emergencies: number | null
          max_parallel_callbacks: number | null
          max_pending_accepted: number | null
          overnight_limit: number | null
          overnight_mode: boolean | null
          paused_until: string | null
          pending_count: number | null
          storm_accept: boolean | null
          storm_capacity_boost: number | null
          storm_categories: string[] | null
          storm_radius_km: number | null
          updated_at: string
          weekend_limit: number | null
        }
        Insert: {
          active_count?: number | null
          after_hours_limit?: number | null
          arrived_count?: number | null
          availability_status?: string
          completed_today?: number | null
          contractor_id: string
          daily_emergency_limit?: number | null
          emergency_radius_km?: number | null
          en_route_count?: number | null
          id?: string
          last_reset_date?: string | null
          max_active_emergencies?: number | null
          max_parallel_callbacks?: number | null
          max_pending_accepted?: number | null
          overnight_limit?: number | null
          overnight_mode?: boolean | null
          paused_until?: string | null
          pending_count?: number | null
          storm_accept?: boolean | null
          storm_capacity_boost?: number | null
          storm_categories?: string[] | null
          storm_radius_km?: number | null
          updated_at?: string
          weekend_limit?: number | null
        }
        Update: {
          active_count?: number | null
          after_hours_limit?: number | null
          arrived_count?: number | null
          availability_status?: string
          completed_today?: number | null
          contractor_id?: string
          daily_emergency_limit?: number | null
          emergency_radius_km?: number | null
          en_route_count?: number | null
          id?: string
          last_reset_date?: string | null
          max_active_emergencies?: number | null
          max_parallel_callbacks?: number | null
          max_pending_accepted?: number | null
          overnight_limit?: number | null
          overnight_mode?: boolean | null
          paused_until?: string | null
          pending_count?: number | null
          storm_accept?: boolean | null
          storm_capacity_boost?: number | null
          storm_categories?: string[] | null
          storm_radius_km?: number | null
          updated_at?: string
          weekend_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_capacity_state_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: true
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_capacity_state_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: true
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_capacity_state_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: true
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_capacity_state_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: true
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
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
          {
            foreignKeyName: "contractor_category_assignments_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      contractor_coach_insights: {
        Row: {
          contractor_id: string
          generated_at: string
          id: string
          insight_type: string
          related_action_codes: Json | null
          related_badges: Json | null
          severity: string | null
          summary: string | null
          title: string
        }
        Insert: {
          contractor_id: string
          generated_at?: string
          id?: string
          insight_type: string
          related_action_codes?: Json | null
          related_badges?: Json | null
          severity?: string | null
          summary?: string | null
          title: string
        }
        Update: {
          contractor_id?: string
          generated_at?: string
          id?: string
          insight_type?: string
          related_action_codes?: Json | null
          related_badges?: Json | null
          severity?: string | null
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_coach_insights_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_coach_insights_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_coach_insights_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_coach_insights_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      contractor_coach_memory: {
        Row: {
          contractor_id: string
          id: string
          key: string
          updated_at: string
          value_json: Json
        }
        Insert: {
          contractor_id: string
          id?: string
          key: string
          updated_at?: string
          value_json?: Json
        }
        Update: {
          contractor_id?: string
          id?: string
          key?: string
          updated_at?: string
          value_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "contractor_coach_memory_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_coach_memory_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_coach_memory_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_coach_memory_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      contractor_coach_messages: {
        Row: {
          created_at: string
          id: string
          message_text: string
          role: string
          session_id: string
          structured_context_json: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          message_text: string
          role: string
          session_id: string
          structured_context_json?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          message_text?: string
          role?: string
          session_id?: string
          structured_context_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_coach_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "contractor_coach_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_coach_nudges: {
        Row: {
          contractor_id: string
          created_at: string
          id: string
          is_dismissed: boolean | null
          is_read: boolean | null
          message: string | null
          nudge_type: string
          priority: string | null
          title: string
          trigger_context_json: Json | null
        }
        Insert: {
          contractor_id: string
          created_at?: string
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          message?: string | null
          nudge_type: string
          priority?: string | null
          title: string
          trigger_context_json?: Json | null
        }
        Update: {
          contractor_id?: string
          created_at?: string
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          message?: string | null
          nudge_type?: string
          priority?: string | null
          title?: string
          trigger_context_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_coach_nudges_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_coach_nudges_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_coach_nudges_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_coach_nudges_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      contractor_coach_recommendations: {
        Row: {
          confidence_score: number | null
          contractor_id: string
          cta_label: string | null
          cta_target: string | null
          description: string | null
          generated_at: string
          id: string
          impact_aipp: string | null
          impact_badges: string | null
          impact_rank: string | null
          impact_routing: string | null
          recommendation_type: string
          status: string
          title: string
        }
        Insert: {
          confidence_score?: number | null
          contractor_id: string
          cta_label?: string | null
          cta_target?: string | null
          description?: string | null
          generated_at?: string
          id?: string
          impact_aipp?: string | null
          impact_badges?: string | null
          impact_rank?: string | null
          impact_routing?: string | null
          recommendation_type: string
          status?: string
          title: string
        }
        Update: {
          confidence_score?: number | null
          contractor_id?: string
          cta_label?: string | null
          cta_target?: string | null
          description?: string | null
          generated_at?: string
          id?: string
          impact_aipp?: string | null
          impact_badges?: string | null
          impact_rank?: string | null
          impact_routing?: string | null
          recommendation_type?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_coach_recommendations_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_coach_recommendations_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_coach_recommendations_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_coach_recommendations_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      contractor_coach_sessions: {
        Row: {
          contractor_id: string
          current_context: Json | null
          ended_at: string | null
          id: string
          session_type: string
          started_at: string
        }
        Insert: {
          contractor_id: string
          current_context?: Json | null
          ended_at?: string | null
          id?: string
          session_type?: string
          started_at?: string
        }
        Update: {
          contractor_id?: string
          current_context?: Json | null
          ended_at?: string | null
          id?: string
          session_type?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_coach_sessions_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_coach_sessions_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_coach_sessions_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_coach_sessions_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
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
            foreignKeyName: "contractor_comparables_comparable_contractor_id_fkey"
            columns: ["comparable_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
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
          {
            foreignKeyName: "contractor_comparables_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      contractor_contact_clicks: {
        Row: {
          contact_method: string
          contractor_id: string
          created_at: string
          id: string
          referrer: string | null
          user_id: string | null
          visitor_fingerprint: string | null
        }
        Insert: {
          contact_method: string
          contractor_id: string
          created_at?: string
          id?: string
          referrer?: string | null
          user_id?: string | null
          visitor_fingerprint?: string | null
        }
        Update: {
          contact_method?: string
          contractor_id?: string
          created_at?: string
          id?: string
          referrer?: string | null
          user_id?: string | null
          visitor_fingerprint?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_contact_clicks_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_contact_clicks_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_contact_clicks_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_contact_clicks_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      contractor_contributions: {
        Row: {
          contractor_id: string | null
          contributor_email: string | null
          contributor_name: string | null
          contributor_phone: string | null
          cost_estimate: number | null
          created_at: string
          document_paths: string[] | null
          id: string
          owner_review_note: string | null
          passport_section_key: string | null
          photo_paths: string[] | null
          property_event_id: string | null
          property_id: string
          qr_code_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["contribution_status"]
          updated_at: string
          work_date: string | null
          work_description: string | null
          work_type: string
        }
        Insert: {
          contractor_id?: string | null
          contributor_email?: string | null
          contributor_name?: string | null
          contributor_phone?: string | null
          cost_estimate?: number | null
          created_at?: string
          document_paths?: string[] | null
          id?: string
          owner_review_note?: string | null
          passport_section_key?: string | null
          photo_paths?: string[] | null
          property_event_id?: string | null
          property_id: string
          qr_code_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["contribution_status"]
          updated_at?: string
          work_date?: string | null
          work_description?: string | null
          work_type: string
        }
        Update: {
          contractor_id?: string | null
          contributor_email?: string | null
          contributor_name?: string | null
          contributor_phone?: string | null
          cost_estimate?: number | null
          created_at?: string
          document_paths?: string[] | null
          id?: string
          owner_review_note?: string | null
          passport_section_key?: string | null
          photo_paths?: string[] | null
          property_event_id?: string | null
          property_id?: string
          qr_code_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["contribution_status"]
          updated_at?: string
          work_date?: string | null
          work_description?: string | null
          work_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_contributions_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_contributions_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_contributions_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_contributions_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
          {
            foreignKeyName: "contractor_contributions_property_event_id_fkey"
            columns: ["property_event_id"]
            isOneToOne: false
            referencedRelation: "property_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_contributions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_contributions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_contributions_qr_code_id_fkey"
            columns: ["qr_code_id"]
            isOneToOne: false
            referencedRelation: "property_qr_codes"
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
          {
            foreignKeyName: "contractor_credentials_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      contractor_dispatch_stats: {
        Row: {
          acceptance_rate: number | null
          avg_eta_accuracy_pct: number | null
          avg_response_time_sec: number | null
          contractor_id: string
          emergency_fit_score: number | null
          id: string
          last_acceptance_at: string | null
          last_dispatch_at: string | null
          no_response_streak: number | null
          reliability_score: number | null
          total_accepted: number
          total_completed: number
          total_dispatched: number
          total_no_response: number
          total_refused: number
          updated_at: string
        }
        Insert: {
          acceptance_rate?: number | null
          avg_eta_accuracy_pct?: number | null
          avg_response_time_sec?: number | null
          contractor_id: string
          emergency_fit_score?: number | null
          id?: string
          last_acceptance_at?: string | null
          last_dispatch_at?: string | null
          no_response_streak?: number | null
          reliability_score?: number | null
          total_accepted?: number
          total_completed?: number
          total_dispatched?: number
          total_no_response?: number
          total_refused?: number
          updated_at?: string
        }
        Update: {
          acceptance_rate?: number | null
          avg_eta_accuracy_pct?: number | null
          avg_response_time_sec?: number | null
          contractor_id?: string
          emergency_fit_score?: number | null
          id?: string
          last_acceptance_at?: string | null
          last_dispatch_at?: string | null
          no_response_streak?: number | null
          reliability_score?: number | null
          total_accepted?: number
          total_completed?: number
          total_dispatched?: number
          total_no_response?: number
          total_refused?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_dispatch_stats_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: true
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_dispatch_stats_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: true
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_dispatch_stats_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: true
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_dispatch_stats_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: true
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
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
          {
            foreignKeyName: "contractor_dna_profiles_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      contractor_domain_admin_notes: {
        Row: {
          admin_user_id: string
          contractor_domain_id: string
          created_at: string | null
          id: string
          note: string
          note_type: string | null
        }
        Insert: {
          admin_user_id: string
          contractor_domain_id: string
          created_at?: string | null
          id?: string
          note: string
          note_type?: string | null
        }
        Update: {
          admin_user_id?: string
          contractor_domain_id?: string
          created_at?: string | null
          id?: string
          note?: string
          note_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_domain_admin_notes_contractor_domain_id_fkey"
            columns: ["contractor_domain_id"]
            isOneToOne: false
            referencedRelation: "contractor_domains"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_domain_checks: {
        Row: {
          accessibility_json: Json | null
          aiseo_json: Json | null
          authority_json: Json | null
          check_completed_at: string | null
          check_started_at: string | null
          contractor_domain_id: string
          created_at: string | null
          dns_json: Json | null
          final_status: string | null
          generated_homepage_seo_json: Json | null
          hosting_json: Json | null
          id: string
          indexability_json: Json | null
          raw_headers_json: Json | null
          raw_html_excerpt: string | null
          recommendations_json: Json | null
          run_status: string | null
          seo_json: Json | null
          ssl_json: Json | null
          structured_data_json: Json | null
        }
        Insert: {
          accessibility_json?: Json | null
          aiseo_json?: Json | null
          authority_json?: Json | null
          check_completed_at?: string | null
          check_started_at?: string | null
          contractor_domain_id: string
          created_at?: string | null
          dns_json?: Json | null
          final_status?: string | null
          generated_homepage_seo_json?: Json | null
          hosting_json?: Json | null
          id?: string
          indexability_json?: Json | null
          raw_headers_json?: Json | null
          raw_html_excerpt?: string | null
          recommendations_json?: Json | null
          run_status?: string | null
          seo_json?: Json | null
          ssl_json?: Json | null
          structured_data_json?: Json | null
        }
        Update: {
          accessibility_json?: Json | null
          aiseo_json?: Json | null
          authority_json?: Json | null
          check_completed_at?: string | null
          check_started_at?: string | null
          contractor_domain_id?: string
          created_at?: string | null
          dns_json?: Json | null
          final_status?: string | null
          generated_homepage_seo_json?: Json | null
          hosting_json?: Json | null
          id?: string
          indexability_json?: Json | null
          raw_headers_json?: Json | null
          raw_html_excerpt?: string | null
          recommendations_json?: Json | null
          run_status?: string | null
          seo_json?: Json | null
          ssl_json?: Json | null
          structured_data_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_domain_checks_contractor_domain_id_fkey"
            columns: ["contractor_domain_id"]
            isOneToOne: false
            referencedRelation: "contractor_domains"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_domain_deltas: {
        Row: {
          aiseo_delta: number | null
          authority_delta: number | null
          contractor_domain_id: string
          created_at: string | null
          current_check_id: string | null
          id: string
          key_improvements_json: Json | null
          new_issues_json: Json | null
          previous_check_id: string | null
          seo_delta: number | null
          technical_delta: number | null
        }
        Insert: {
          aiseo_delta?: number | null
          authority_delta?: number | null
          contractor_domain_id: string
          created_at?: string | null
          current_check_id?: string | null
          id?: string
          key_improvements_json?: Json | null
          new_issues_json?: Json | null
          previous_check_id?: string | null
          seo_delta?: number | null
          technical_delta?: number | null
        }
        Update: {
          aiseo_delta?: number | null
          authority_delta?: number | null
          contractor_domain_id?: string
          created_at?: string | null
          current_check_id?: string | null
          id?: string
          key_improvements_json?: Json | null
          new_issues_json?: Json | null
          previous_check_id?: string | null
          seo_delta?: number | null
          technical_delta?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_domain_deltas_contractor_domain_id_fkey"
            columns: ["contractor_domain_id"]
            isOneToOne: false
            referencedRelation: "contractor_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_domain_deltas_current_check_id_fkey"
            columns: ["current_check_id"]
            isOneToOne: false
            referencedRelation: "contractor_domain_checks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_domain_deltas_previous_check_id_fkey"
            columns: ["previous_check_id"]
            isOneToOne: false
            referencedRelation: "contractor_domain_checks"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_domain_events: {
        Row: {
          contractor_domain_id: string
          created_at: string | null
          event_payload_json: Json | null
          event_type: string
          id: string
        }
        Insert: {
          contractor_domain_id: string
          created_at?: string | null
          event_payload_json?: Json | null
          event_type: string
          id?: string
        }
        Update: {
          contractor_domain_id?: string
          created_at?: string | null
          event_payload_json?: Json | null
          event_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_domain_events_contractor_domain_id_fkey"
            columns: ["contractor_domain_id"]
            isOneToOne: false
            referencedRelation: "contractor_domains"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_domains: {
        Row: {
          aiseo_score: number | null
          authority_score: number | null
          confidence_score: number | null
          contractor_id: string
          created_at: string | null
          dns_status: string | null
          final_url: string | null
          full_url: string | null
          hosting_confidence: number | null
          hosting_provider: string | null
          id: string
          indexability_status: string | null
          indexing_readiness_score: number | null
          is_primary: boolean | null
          is_www: boolean | null
          last_checked_at: string | null
          live_status: string | null
          normalized_domain: string
          notes: string | null
          preferred_hostname: string | null
          protocol_detected: string | null
          raw_input: string
          root_domain: string | null
          seo_score: number | null
          ssl_status: string | null
          structured_data_status: string | null
          subdomain_if_any: string | null
          submitted_path: string | null
          technical_score: number | null
          updated_at: string | null
          verification_status: string | null
        }
        Insert: {
          aiseo_score?: number | null
          authority_score?: number | null
          confidence_score?: number | null
          contractor_id: string
          created_at?: string | null
          dns_status?: string | null
          final_url?: string | null
          full_url?: string | null
          hosting_confidence?: number | null
          hosting_provider?: string | null
          id?: string
          indexability_status?: string | null
          indexing_readiness_score?: number | null
          is_primary?: boolean | null
          is_www?: boolean | null
          last_checked_at?: string | null
          live_status?: string | null
          normalized_domain: string
          notes?: string | null
          preferred_hostname?: string | null
          protocol_detected?: string | null
          raw_input: string
          root_domain?: string | null
          seo_score?: number | null
          ssl_status?: string | null
          structured_data_status?: string | null
          subdomain_if_any?: string | null
          submitted_path?: string | null
          technical_score?: number | null
          updated_at?: string | null
          verification_status?: string | null
        }
        Update: {
          aiseo_score?: number | null
          authority_score?: number | null
          confidence_score?: number | null
          contractor_id?: string
          created_at?: string | null
          dns_status?: string | null
          final_url?: string | null
          full_url?: string | null
          hosting_confidence?: number | null
          hosting_provider?: string | null
          id?: string
          indexability_status?: string | null
          indexing_readiness_score?: number | null
          is_primary?: boolean | null
          is_www?: boolean | null
          last_checked_at?: string | null
          live_status?: string | null
          normalized_domain?: string
          notes?: string | null
          preferred_hostname?: string | null
          protocol_detected?: string | null
          raw_input?: string
          root_domain?: string | null
          seo_score?: number | null
          ssl_status?: string | null
          structured_data_status?: string | null
          subdomain_if_any?: string | null
          submitted_path?: string | null
          technical_score?: number | null
          updated_at?: string | null
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_domains_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_domains_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_domains_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_domains_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      contractor_duplicate_candidates: {
        Row: {
          candidate_contractor_id: string
          contractor_id: string
          created_at: string
          duplicate_confidence_score: number
          entity_confidence: Database["public"]["Enums"]["entity_confidence"]
          id: string
          matching_signals: Json | null
          merge_direction: string | null
          reasons_json: Json
          review_notes: string | null
          review_status: Database["public"]["Enums"]["duplicate_review_status"]
          reviewed_at: string | null
          reviewed_by: string | null
          updated_at: string
        }
        Insert: {
          candidate_contractor_id: string
          contractor_id: string
          created_at?: string
          duplicate_confidence_score?: number
          entity_confidence?: Database["public"]["Enums"]["entity_confidence"]
          id?: string
          matching_signals?: Json | null
          merge_direction?: string | null
          reasons_json?: Json
          review_notes?: string | null
          review_status?: Database["public"]["Enums"]["duplicate_review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
        }
        Update: {
          candidate_contractor_id?: string
          contractor_id?: string
          created_at?: string
          duplicate_confidence_score?: number
          entity_confidence?: Database["public"]["Enums"]["entity_confidence"]
          id?: string
          matching_signals?: Json | null
          merge_direction?: string | null
          reasons_json?: Json
          review_notes?: string | null
          review_status?: Database["public"]["Enums"]["duplicate_review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_duplicate_candidates_candidate_contractor_id_fkey"
            columns: ["candidate_contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_duplicate_candidates_candidate_contractor_id_fkey"
            columns: ["candidate_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_duplicate_candidates_candidate_contractor_id_fkey"
            columns: ["candidate_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_duplicate_candidates_candidate_contractor_id_fkey"
            columns: ["candidate_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
          {
            foreignKeyName: "contractor_duplicate_candidates_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_duplicate_candidates_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_duplicate_candidates_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_duplicate_candidates_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      contractor_entity_flags: {
        Row: {
          contractor_id: string
          created_at: string
          description: string | null
          flag_type: string
          id: string
          is_resolved: boolean
          metadata_json: Json | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          updated_at: string
        }
        Insert: {
          contractor_id: string
          created_at?: string
          description?: string | null
          flag_type: string
          id?: string
          is_resolved?: boolean
          metadata_json?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          updated_at?: string
        }
        Update: {
          contractor_id?: string
          created_at?: string
          description?: string | null
          flag_type?: string
          id?: string
          is_resolved?: boolean
          metadata_json?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_entity_flags_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_entity_flags_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_entity_flags_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_entity_flags_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      contractor_exclusions: {
        Row: {
          building_type: string | null
          category_slug: string | null
          contractor_id: string
          created_at: string | null
          exclusion_type: string
          id: string
          is_active: boolean | null
          material_slug: string | null
          reason_en: string | null
          reason_fr: string | null
          service_slug: string | null
          source: string | null
          structure_type: string | null
        }
        Insert: {
          building_type?: string | null
          category_slug?: string | null
          contractor_id: string
          created_at?: string | null
          exclusion_type?: string
          id?: string
          is_active?: boolean | null
          material_slug?: string | null
          reason_en?: string | null
          reason_fr?: string | null
          service_slug?: string | null
          source?: string | null
          structure_type?: string | null
        }
        Update: {
          building_type?: string | null
          category_slug?: string | null
          contractor_id?: string
          created_at?: string | null
          exclusion_type?: string
          id?: string
          is_active?: boolean | null
          material_slug?: string | null
          reason_en?: string | null
          reason_fr?: string | null
          service_slug?: string | null
          source?: string | null
          structure_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_exclusions_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_exclusions_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_exclusions_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_exclusions_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      contractor_execution_models: {
        Row: {
          accepts_subcontractors: boolean | null
          availability_status: string | null
          contractor_id: string
          execution_mode: string
          id: string
          max_distance_km: number | null
          notes: string | null
          preferred_project_sizes: string[] | null
          updated_at: string | null
          works_as_subcontractor: boolean | null
        }
        Insert: {
          accepts_subcontractors?: boolean | null
          availability_status?: string | null
          contractor_id: string
          execution_mode?: string
          id?: string
          max_distance_km?: number | null
          notes?: string | null
          preferred_project_sizes?: string[] | null
          updated_at?: string | null
          works_as_subcontractor?: boolean | null
        }
        Update: {
          accepts_subcontractors?: boolean | null
          availability_status?: string | null
          contractor_id?: string
          execution_mode?: string
          id?: string
          max_distance_km?: number | null
          notes?: string | null
          preferred_project_sizes?: string[] | null
          updated_at?: string | null
          works_as_subcontractor?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_execution_models_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_execution_models_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_execution_models_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_execution_models_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
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
          {
            foreignKeyName: "contractor_gmb_profiles_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      contractor_license_scope_results: {
        Row: {
          created_at: string
          explanation_fr: string | null
          id: string
          license_fit_score: number | null
          mapped_work_types: Json | null
          project_fit: Database["public"]["Enums"]["project_fit"] | null
          verification_run_id: string
        }
        Insert: {
          created_at?: string
          explanation_fr?: string | null
          id?: string
          license_fit_score?: number | null
          mapped_work_types?: Json | null
          project_fit?: Database["public"]["Enums"]["project_fit"] | null
          verification_run_id: string
        }
        Update: {
          created_at?: string
          explanation_fr?: string | null
          id?: string
          license_fit_score?: number | null
          mapped_work_types?: Json | null
          project_fit?: Database["public"]["Enums"]["project_fit"] | null
          verification_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_license_scope_results_verification_run_id_fkey"
            columns: ["verification_run_id"]
            isOneToOne: false
            referencedRelation: "contractor_verification_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_live_scores: {
        Row: {
          acceptance_rate: number | null
          activity_frequency: number | null
          booking_rate: number | null
          calculated_at: string
          client_rating: number | null
          composite_score: number | null
          contractor_id: string
          created_at: string
          id: string
          last_warning_at: string | null
          profile_quality_score: number | null
          response_rate: number | null
          risk_level: string | null
          status: string
          updated_at: string
          visibility_reduced: boolean | null
        }
        Insert: {
          acceptance_rate?: number | null
          activity_frequency?: number | null
          booking_rate?: number | null
          calculated_at?: string
          client_rating?: number | null
          composite_score?: number | null
          contractor_id: string
          created_at?: string
          id?: string
          last_warning_at?: string | null
          profile_quality_score?: number | null
          response_rate?: number | null
          risk_level?: string | null
          status?: string
          updated_at?: string
          visibility_reduced?: boolean | null
        }
        Update: {
          acceptance_rate?: number | null
          activity_frequency?: number | null
          booking_rate?: number | null
          calculated_at?: string
          client_rating?: number | null
          composite_score?: number | null
          contractor_id?: string
          created_at?: string
          id?: string
          last_warning_at?: string | null
          profile_quality_score?: number | null
          response_rate?: number | null
          risk_level?: string | null
          status?: string
          updated_at?: string
          visibility_reduced?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_live_scores_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: true
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_live_scores_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: true
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_live_scores_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: true
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_live_scores_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: true
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      contractor_match_metrics: {
        Row: {
          contractor_id: string
          created_at: string
          id: string
          leads_accepted: number
          leads_received: number
          leads_refused_invalid: number
          leads_refused_valid: number
          mismatch_rate: number | null
          period_end: string
          period_start: string
          precision_score: number | null
        }
        Insert: {
          contractor_id: string
          created_at?: string
          id?: string
          leads_accepted?: number
          leads_received?: number
          leads_refused_invalid?: number
          leads_refused_valid?: number
          mismatch_rate?: number | null
          period_end: string
          period_start: string
          precision_score?: number | null
        }
        Update: {
          contractor_id?: string
          created_at?: string
          id?: string
          leads_accepted?: number
          leads_received?: number
          leads_refused_invalid?: number
          leads_refused_valid?: number
          mismatch_rate?: number | null
          period_end?: string
          period_start?: string
          precision_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_match_metrics_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_match_metrics_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_match_metrics_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_match_metrics_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
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
          {
            foreignKeyName: "contractor_media_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
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
          {
            foreignKeyName: "contractor_members_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      contractor_merge_suggestions: {
        Row: {
          confidence: number | null
          contractor_id: string
          created_at: string
          current_value: string | null
          field_name: string
          id: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source: string | null
          status: string
          suggested_value: string | null
          updated_at: string
          verification_run_id: string | null
        }
        Insert: {
          confidence?: number | null
          contractor_id: string
          created_at?: string
          current_value?: string | null
          field_name: string
          id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          status?: string
          suggested_value?: string | null
          updated_at?: string
          verification_run_id?: string | null
        }
        Update: {
          confidence?: number | null
          contractor_id?: string
          created_at?: string
          current_value?: string | null
          field_name?: string
          id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          status?: string
          suggested_value?: string | null
          updated_at?: string
          verification_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_merge_suggestions_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_merge_suggestions_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_merge_suggestions_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_merge_suggestions_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
          {
            foreignKeyName: "contractor_merge_suggestions_verification_run_id_fkey"
            columns: ["verification_run_id"]
            isOneToOne: false
            referencedRelation: "contractor_verification_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_onboarding_sessions: {
        Row: {
          aipp_score: Json | null
          audit_sections: Json | null
          business_data: Json | null
          business_name: string | null
          completed_at: string | null
          created_at: string
          current_step: number
          id: string
          import_form: Json | null
          objective: string | null
          selected_plan: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          aipp_score?: Json | null
          audit_sections?: Json | null
          business_data?: Json | null
          business_name?: string | null
          completed_at?: string | null
          created_at?: string
          current_step?: number
          id?: string
          import_form?: Json | null
          objective?: string | null
          selected_plan?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          aipp_score?: Json | null
          audit_sections?: Json | null
          business_data?: Json | null
          business_name?: string | null
          completed_at?: string | null
          created_at?: string
          current_step?: number
          id?: string
          import_form?: Json | null
          objective?: string | null
          selected_plan?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          {
            foreignKeyName: "contractor_performance_metrics_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      contractor_probable_entities: {
        Row: {
          business_name: string | null
          confidence_score: number | null
          created_at: string
          email_domain: string | null
          evidence: Json | null
          id: string
          legal_name: string | null
          normalized_phone: string | null
          probable_city: string | null
          probable_neq: string | null
          probable_rbq: string | null
          probable_service_category: string | null
          verification_run_id: string
          website: string | null
        }
        Insert: {
          business_name?: string | null
          confidence_score?: number | null
          created_at?: string
          email_domain?: string | null
          evidence?: Json | null
          id?: string
          legal_name?: string | null
          normalized_phone?: string | null
          probable_city?: string | null
          probable_neq?: string | null
          probable_rbq?: string | null
          probable_service_category?: string | null
          verification_run_id: string
          website?: string | null
        }
        Update: {
          business_name?: string | null
          confidence_score?: number | null
          created_at?: string
          email_domain?: string | null
          evidence?: Json | null
          id?: string
          legal_name?: string | null
          normalized_phone?: string | null
          probable_city?: string | null
          probable_neq?: string | null
          probable_rbq?: string | null
          probable_service_category?: string | null
          verification_run_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_probable_entities_verification_run_id_fkey"
            columns: ["verification_run_id"]
            isOneToOne: false
            referencedRelation: "contractor_verification_runs"
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
            foreignKeyName: "contractor_problem_links_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
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
          {
            foreignKeyName: "contractor_public_pages_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: true
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
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
          {
            foreignKeyName: "contractor_public_scores_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      contractor_refusal_signals: {
        Row: {
          city_slug: string | null
          confidence: number
          contractor_id: string | null
          created_at: string
          frequency: number
          id: string
          material: string | null
          metadata: Json | null
          problem_slug: string | null
          refusal_type: string
          seo_opportunity_generated: boolean
          signal_text: string
          solution_slug: string | null
          structure_type: string | null
          updated_at: string
        }
        Insert: {
          city_slug?: string | null
          confidence?: number
          contractor_id?: string | null
          created_at?: string
          frequency?: number
          id?: string
          material?: string | null
          metadata?: Json | null
          problem_slug?: string | null
          refusal_type?: string
          seo_opportunity_generated?: boolean
          signal_text: string
          solution_slug?: string | null
          structure_type?: string | null
          updated_at?: string
        }
        Update: {
          city_slug?: string | null
          confidence?: number
          contractor_id?: string | null
          created_at?: string
          frequency?: number
          id?: string
          material?: string | null
          metadata?: Json | null
          problem_slug?: string | null
          refusal_type?: string
          seo_opportunity_generated?: boolean
          signal_text?: string
          solution_slug?: string | null
          structure_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_refusal_signals_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_refusal_signals_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_refusal_signals_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_refusal_signals_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      contractor_registry_validations: {
        Row: {
          created_at: string
          id: string
          identity_coherence:
            | Database["public"]["Enums"]["identity_coherence"]
            | null
          neq_status: Database["public"]["Enums"]["neq_status"] | null
          rbq_license_number: string | null
          rbq_status: Database["public"]["Enums"]["rbq_status"] | null
          rbq_subcategories: Json | null
          registered_name: string | null
          source_snapshot: Json | null
          verification_run_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          identity_coherence?:
            | Database["public"]["Enums"]["identity_coherence"]
            | null
          neq_status?: Database["public"]["Enums"]["neq_status"] | null
          rbq_license_number?: string | null
          rbq_status?: Database["public"]["Enums"]["rbq_status"] | null
          rbq_subcategories?: Json | null
          registered_name?: string | null
          source_snapshot?: Json | null
          verification_run_id: string
        }
        Update: {
          created_at?: string
          id?: string
          identity_coherence?:
            | Database["public"]["Enums"]["identity_coherence"]
            | null
          neq_status?: Database["public"]["Enums"]["neq_status"] | null
          rbq_license_number?: string | null
          rbq_status?: Database["public"]["Enums"]["rbq_status"] | null
          rbq_subcategories?: Json | null
          registered_name?: string | null
          source_snapshot?: Json | null
          verification_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_registry_validations_verification_run_id_fkey"
            columns: ["verification_run_id"]
            isOneToOne: false
            referencedRelation: "contractor_verification_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_relationships: {
        Row: {
          collaboration_count: number | null
          contractor_id: string
          created_at: string | null
          id: string
          internal_rating: number | null
          is_blocked: boolean | null
          is_favorite: boolean | null
          partner_contractor_id: string
          private_notes: string | null
          relationship_type: string | null
          status: string | null
          success_rate: number | null
          updated_at: string | null
        }
        Insert: {
          collaboration_count?: number | null
          contractor_id: string
          created_at?: string | null
          id?: string
          internal_rating?: number | null
          is_blocked?: boolean | null
          is_favorite?: boolean | null
          partner_contractor_id: string
          private_notes?: string | null
          relationship_type?: string | null
          status?: string | null
          success_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          collaboration_count?: number | null
          contractor_id?: string
          created_at?: string | null
          id?: string
          internal_rating?: number | null
          is_blocked?: boolean | null
          is_favorite?: boolean | null
          partner_contractor_id?: string
          private_notes?: string | null
          relationship_type?: string | null
          status?: string | null
          success_rate?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_relationships_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_relationships_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_relationships_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_relationships_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
          {
            foreignKeyName: "contractor_relationships_partner_contractor_id_fkey"
            columns: ["partner_contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_relationships_partner_contractor_id_fkey"
            columns: ["partner_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_relationships_partner_contractor_id_fkey"
            columns: ["partner_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_relationships_partner_contractor_id_fkey"
            columns: ["partner_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
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
          {
            foreignKeyName: "contractor_review_aggregates_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
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
          {
            foreignKeyName: "contractor_review_dimension_scores_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      contractor_reviews_snapshot: {
        Row: {
          bbb_present: boolean | null
          contractor_id: string
          created_at: string
          facebook_present: boolean | null
          google_present: boolean | null
          id: string
          other_sources: Json | null
          rating: number | null
          review_count: number | null
          review_velocity_90d: number | null
        }
        Insert: {
          bbb_present?: boolean | null
          contractor_id: string
          created_at?: string
          facebook_present?: boolean | null
          google_present?: boolean | null
          id?: string
          other_sources?: Json | null
          rating?: number | null
          review_count?: number | null
          review_velocity_90d?: number | null
        }
        Update: {
          bbb_present?: boolean | null
          contractor_id?: string
          created_at?: string
          facebook_present?: boolean | null
          google_present?: boolean | null
          id?: string
          other_sources?: Json | null
          rating?: number | null
          review_count?: number | null
          review_velocity_90d?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_reviews_snapshot_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors_prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_risk_signals: {
        Row: {
          created_at: string
          description_fr: string | null
          id: string
          severity: Database["public"]["Enums"]["risk_severity"]
          signal_type: string
          title_fr: string
          verification_run_id: string
        }
        Insert: {
          created_at?: string
          description_fr?: string | null
          id?: string
          severity?: Database["public"]["Enums"]["risk_severity"]
          signal_type: string
          title_fr: string
          verification_run_id: string
        }
        Update: {
          created_at?: string
          description_fr?: string | null
          id?: string
          severity?: Database["public"]["Enums"]["risk_severity"]
          signal_type?: string
          title_fr?: string
          verification_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_risk_signals_verification_run_id_fkey"
            columns: ["verification_run_id"]
            isOneToOne: false
            referencedRelation: "contractor_verification_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_scores: {
        Row: {
          acceptance_rate: number | null
          appointments_cancelled: number | null
          appointments_completed: number | null
          avg_review_score: number | null
          close_rate: number | null
          contractor_id: string
          id: string
          on_time_rate: number | null
          profile_completeness_score: number | null
          ranking_score: number | null
          recommendation_rate: number | null
          response_speed_score: number | null
          updated_at: string | null
        }
        Insert: {
          acceptance_rate?: number | null
          appointments_cancelled?: number | null
          appointments_completed?: number | null
          avg_review_score?: number | null
          close_rate?: number | null
          contractor_id: string
          id?: string
          on_time_rate?: number | null
          profile_completeness_score?: number | null
          ranking_score?: number | null
          recommendation_rate?: number | null
          response_speed_score?: number | null
          updated_at?: string | null
        }
        Update: {
          acceptance_rate?: number | null
          appointments_cancelled?: number | null
          appointments_completed?: number | null
          avg_review_score?: number | null
          close_rate?: number | null
          contractor_id?: string
          id?: string
          on_time_rate?: number | null
          profile_completeness_score?: number | null
          ranking_score?: number | null
          recommendation_rate?: number | null
          response_speed_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_scores_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_scores_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_scores_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_scores_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
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
          {
            foreignKeyName: "contractor_service_areas_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
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
          {
            foreignKeyName: "contractor_services_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      contractor_site_snapshot: {
        Row: {
          contractor_id: string
          created_at: string
          extracted_signals: Json | null
          h1: string | null
          h2_count: number | null
          has_before_after: boolean | null
          has_blog: boolean | null
          has_cta: boolean | null
          has_financing: boolean | null
          has_local_pages: boolean | null
          has_reviews_section: boolean | null
          has_schema: boolean | null
          html_excerpt: string | null
          id: string
          meta_description: string | null
          mobile_friendly: boolean | null
          page_speed_estimate: number | null
          screenshot_url: string | null
          title: string | null
          website: string | null
          word_count: number | null
        }
        Insert: {
          contractor_id: string
          created_at?: string
          extracted_signals?: Json | null
          h1?: string | null
          h2_count?: number | null
          has_before_after?: boolean | null
          has_blog?: boolean | null
          has_cta?: boolean | null
          has_financing?: boolean | null
          has_local_pages?: boolean | null
          has_reviews_section?: boolean | null
          has_schema?: boolean | null
          html_excerpt?: string | null
          id?: string
          meta_description?: string | null
          mobile_friendly?: boolean | null
          page_speed_estimate?: number | null
          screenshot_url?: string | null
          title?: string | null
          website?: string | null
          word_count?: number | null
        }
        Update: {
          contractor_id?: string
          created_at?: string
          extracted_signals?: Json | null
          h1?: string | null
          h2_count?: number | null
          has_before_after?: boolean | null
          has_blog?: boolean | null
          has_cta?: boolean | null
          has_financing?: boolean | null
          has_local_pages?: boolean | null
          has_reviews_section?: boolean | null
          has_schema?: boolean | null
          html_excerpt?: string | null
          id?: string
          meta_description?: string | null
          mobile_friendly?: boolean | null
          page_speed_estimate?: number | null
          screenshot_url?: string | null
          title?: string | null
          website?: string | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_site_snapshot_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors_prospects"
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
            foreignKeyName: "contractor_solution_links_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
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
      contractor_subcontract_network: {
        Row: {
          collaborations_count: number
          contractor_id: string
          created_at: string
          id: string
          last_collaboration_at: string | null
          partner_contractor_id: string
          partner_rating: number | null
          success_rate: number | null
          updated_at: string
        }
        Insert: {
          collaborations_count?: number
          contractor_id: string
          created_at?: string
          id?: string
          last_collaboration_at?: string | null
          partner_contractor_id: string
          partner_rating?: number | null
          success_rate?: number | null
          updated_at?: string
        }
        Update: {
          collaborations_count?: number
          contractor_id?: string
          created_at?: string
          id?: string
          last_collaboration_at?: string | null
          partner_contractor_id?: string
          partner_rating?: number | null
          success_rate?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_subcontract_network_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_subcontract_network_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_subcontract_network_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_subcontract_network_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
          {
            foreignKeyName: "contractor_subcontract_network_partner_contractor_id_fkey"
            columns: ["partner_contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_subcontract_network_partner_contractor_id_fkey"
            columns: ["partner_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_subcontract_network_partner_contractor_id_fkey"
            columns: ["partner_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_subcontract_network_partner_contractor_id_fkey"
            columns: ["partner_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
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
          {
            foreignKeyName: "contractor_subscriptions_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: true
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      contractor_verification_assets: {
        Row: {
          asset_type: Database["public"]["Enums"]["image_asset_type"] | null
          created_at: string
          id: string
          mime_type: string | null
          original_filename: string | null
          storage_path: string
          verification_run_id: string
        }
        Insert: {
          asset_type?: Database["public"]["Enums"]["image_asset_type"] | null
          created_at?: string
          id?: string
          mime_type?: string | null
          original_filename?: string | null
          storage_path: string
          verification_run_id: string
        }
        Update: {
          asset_type?: Database["public"]["Enums"]["image_asset_type"] | null
          created_at?: string
          id?: string
          mime_type?: string | null
          original_filename?: string | null
          storage_path?: string
          verification_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_verification_assets_verification_run_id_fkey"
            columns: ["verification_run_id"]
            isOneToOne: false
            referencedRelation: "contractor_verification_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_verification_evidence: {
        Row: {
          analysis_summary: string | null
          contractor_id: string | null
          created_at: string
          extracted_address: string | null
          extracted_business_name: string | null
          extracted_city: string | null
          extracted_neq: string | null
          extracted_phone: string | null
          extracted_rbq: string | null
          extracted_text: string | null
          extracted_website: string | null
          file_type: string | null
          id: string
          mime_type: string | null
          storage_path: string
          uploaded_by: string
          verification_run_id: string
          visual_consistency_score: number | null
        }
        Insert: {
          analysis_summary?: string | null
          contractor_id?: string | null
          created_at?: string
          extracted_address?: string | null
          extracted_business_name?: string | null
          extracted_city?: string | null
          extracted_neq?: string | null
          extracted_phone?: string | null
          extracted_rbq?: string | null
          extracted_text?: string | null
          extracted_website?: string | null
          file_type?: string | null
          id?: string
          mime_type?: string | null
          storage_path: string
          uploaded_by: string
          verification_run_id: string
          visual_consistency_score?: number | null
        }
        Update: {
          analysis_summary?: string | null
          contractor_id?: string | null
          created_at?: string
          extracted_address?: string | null
          extracted_business_name?: string | null
          extracted_city?: string | null
          extracted_neq?: string | null
          extracted_phone?: string | null
          extracted_rbq?: string | null
          extracted_text?: string | null
          extracted_website?: string | null
          file_type?: string | null
          id?: string
          mime_type?: string | null
          storage_path?: string
          uploaded_by?: string
          verification_run_id?: string
          visual_consistency_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_verification_evidence_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_verification_evidence_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_verification_evidence_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_verification_evidence_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
          {
            foreignKeyName: "contractor_verification_evidence_verification_run_id_fkey"
            columns: ["verification_run_id"]
            isOneToOne: false
            referencedRelation: "contractor_verification_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_verification_runs: {
        Row: {
          admin_review_status: string | null
          admin_verified: boolean | null
          admin_verified_snapshot_score: number | null
          ambiguity_level: string | null
          contractor_id: string | null
          created_at: string
          id: string
          identity_confidence_score: number | null
          identity_resolution_status: string | null
          inconsistencies_json: Json | null
          input_business_name: string | null
          input_city: string | null
          input_neq: string | null
          input_phone: string | null
          input_rbq: string | null
          input_type: Database["public"]["Enums"]["verification_input_type"]
          input_website: string | null
          internal_profile_found: boolean | null
          license_fit_score: number | null
          live_risk_delta: number | null
          matched_by: string | null
          missing_proofs_json: Json | null
          normalized_phone: string | null
          project_text: string | null
          public_trust_score: number | null
          raw_findings_json: Json | null
          raw_input: string
          recommended_next_inputs_json: Json | null
          source_context: Json | null
          summary_headline: string | null
          summary_next_steps: Json | null
          summary_short: string | null
          unpro_trust_score: number | null
          updated_at: string
          used_admin_verified_profile: boolean | null
          user_id: string | null
          verdict: Database["public"]["Enums"]["verification_verdict"] | null
          visual_trust_score: number | null
        }
        Insert: {
          admin_review_status?: string | null
          admin_verified?: boolean | null
          admin_verified_snapshot_score?: number | null
          ambiguity_level?: string | null
          contractor_id?: string | null
          created_at?: string
          id?: string
          identity_confidence_score?: number | null
          identity_resolution_status?: string | null
          inconsistencies_json?: Json | null
          input_business_name?: string | null
          input_city?: string | null
          input_neq?: string | null
          input_phone?: string | null
          input_rbq?: string | null
          input_type: Database["public"]["Enums"]["verification_input_type"]
          input_website?: string | null
          internal_profile_found?: boolean | null
          license_fit_score?: number | null
          live_risk_delta?: number | null
          matched_by?: string | null
          missing_proofs_json?: Json | null
          normalized_phone?: string | null
          project_text?: string | null
          public_trust_score?: number | null
          raw_findings_json?: Json | null
          raw_input: string
          recommended_next_inputs_json?: Json | null
          source_context?: Json | null
          summary_headline?: string | null
          summary_next_steps?: Json | null
          summary_short?: string | null
          unpro_trust_score?: number | null
          updated_at?: string
          used_admin_verified_profile?: boolean | null
          user_id?: string | null
          verdict?: Database["public"]["Enums"]["verification_verdict"] | null
          visual_trust_score?: number | null
        }
        Update: {
          admin_review_status?: string | null
          admin_verified?: boolean | null
          admin_verified_snapshot_score?: number | null
          ambiguity_level?: string | null
          contractor_id?: string | null
          created_at?: string
          id?: string
          identity_confidence_score?: number | null
          identity_resolution_status?: string | null
          inconsistencies_json?: Json | null
          input_business_name?: string | null
          input_city?: string | null
          input_neq?: string | null
          input_phone?: string | null
          input_rbq?: string | null
          input_type?: Database["public"]["Enums"]["verification_input_type"]
          input_website?: string | null
          internal_profile_found?: boolean | null
          license_fit_score?: number | null
          live_risk_delta?: number | null
          matched_by?: string | null
          missing_proofs_json?: Json | null
          normalized_phone?: string | null
          project_text?: string | null
          public_trust_score?: number | null
          raw_findings_json?: Json | null
          raw_input?: string
          recommended_next_inputs_json?: Json | null
          source_context?: Json | null
          summary_headline?: string | null
          summary_next_steps?: Json | null
          summary_short?: string | null
          unpro_trust_score?: number | null
          updated_at?: string
          used_admin_verified_profile?: boolean | null
          user_id?: string | null
          verdict?: Database["public"]["Enums"]["verification_verdict"] | null
          visual_trust_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_verification_runs_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_verification_runs_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_verification_runs_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_verification_runs_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      contractor_verification_searches: {
        Row: {
          business_card_uploaded: boolean | null
          city: string | null
          contract_uploaded: boolean | null
          created_at: string | null
          detected_business_name: string | null
          detected_contractor_id: string | null
          detected_neq: string | null
          detected_rbq: string | null
          device_type: string | null
          id: string
          is_logged_in: boolean | null
          license_fit_score: number | null
          normalized_phone: string | null
          project_type: string | null
          referrer: string | null
          result_found: boolean | null
          search_query: string | null
          search_type: string | null
          session_id: string | null
          source_page: string | null
          truck_uploaded: boolean | null
          trust_score: number | null
          user_id: string | null
          verdict: string | null
          visual_validation_used: boolean | null
        }
        Insert: {
          business_card_uploaded?: boolean | null
          city?: string | null
          contract_uploaded?: boolean | null
          created_at?: string | null
          detected_business_name?: string | null
          detected_contractor_id?: string | null
          detected_neq?: string | null
          detected_rbq?: string | null
          device_type?: string | null
          id?: string
          is_logged_in?: boolean | null
          license_fit_score?: number | null
          normalized_phone?: string | null
          project_type?: string | null
          referrer?: string | null
          result_found?: boolean | null
          search_query?: string | null
          search_type?: string | null
          session_id?: string | null
          source_page?: string | null
          truck_uploaded?: boolean | null
          trust_score?: number | null
          user_id?: string | null
          verdict?: string | null
          visual_validation_used?: boolean | null
        }
        Update: {
          business_card_uploaded?: boolean | null
          city?: string | null
          contract_uploaded?: boolean | null
          created_at?: string | null
          detected_business_name?: string | null
          detected_contractor_id?: string | null
          detected_neq?: string | null
          detected_rbq?: string | null
          device_type?: string | null
          id?: string
          is_logged_in?: boolean | null
          license_fit_score?: number | null
          normalized_phone?: string | null
          project_type?: string | null
          referrer?: string | null
          result_found?: boolean | null
          search_query?: string | null
          search_type?: string | null
          session_id?: string | null
          source_page?: string | null
          truck_uploaded?: boolean | null
          trust_score?: number | null
          user_id?: string | null
          verdict?: string | null
          visual_validation_used?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_verification_searches_detected_contractor_id_fkey"
            columns: ["detected_contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_verification_searches_detected_contractor_id_fkey"
            columns: ["detected_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_verification_searches_detected_contractor_id_fkey"
            columns: ["detected_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_verification_searches_detected_contractor_id_fkey"
            columns: ["detected_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
          {
            foreignKeyName: "contractor_verification_searches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_verification_snapshots: {
        Row: {
          contractor_id: string
          created_at: string
          final_recommendation: string | null
          id: string
          identity_confidence_score: number | null
          identity_resolution_status: string | null
          inconsistencies: Json | null
          is_current: boolean | null
          live_risk_delta: number | null
          missing_proofs: Json | null
          public_trust_score: number | null
          risks: Json | null
          snapshot_json: Json | null
          strengths: Json | null
          updated_at: string
          verification_run_id: string | null
        }
        Insert: {
          contractor_id: string
          created_at?: string
          final_recommendation?: string | null
          id?: string
          identity_confidence_score?: number | null
          identity_resolution_status?: string | null
          inconsistencies?: Json | null
          is_current?: boolean | null
          live_risk_delta?: number | null
          missing_proofs?: Json | null
          public_trust_score?: number | null
          risks?: Json | null
          snapshot_json?: Json | null
          strengths?: Json | null
          updated_at?: string
          verification_run_id?: string | null
        }
        Update: {
          contractor_id?: string
          created_at?: string
          final_recommendation?: string | null
          id?: string
          identity_confidence_score?: number | null
          identity_resolution_status?: string | null
          inconsistencies?: Json | null
          is_current?: boolean | null
          live_risk_delta?: number | null
          missing_proofs?: Json | null
          public_trust_score?: number | null
          risks?: Json | null
          snapshot_json?: Json | null
          strengths?: Json | null
          updated_at?: string
          verification_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_verification_snapshots_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_verification_snapshots_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_verification_snapshots_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_verification_snapshots_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
          {
            foreignKeyName: "contractor_verification_snapshots_verification_run_id_fkey"
            columns: ["verification_run_id"]
            isOneToOne: false
            referencedRelation: "contractor_verification_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_visual_extractions: {
        Row: {
          address: string | null
          brand_notes: Json | null
          business_name: string | null
          created_at: string
          email: string | null
          id: string
          image_type: Database["public"]["Enums"]["image_asset_type"] | null
          neq: string | null
          phone: string | null
          raw_ocr_text: string | null
          rbq: string | null
          representative_name: string | null
          service_keywords: Json | null
          verification_run_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          brand_notes?: Json | null
          business_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          image_type?: Database["public"]["Enums"]["image_asset_type"] | null
          neq?: string | null
          phone?: string | null
          raw_ocr_text?: string | null
          rbq?: string | null
          representative_name?: string | null
          service_keywords?: Json | null
          verification_run_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          brand_notes?: Json | null
          business_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          image_type?: Database["public"]["Enums"]["image_asset_type"] | null
          neq?: string | null
          phone?: string | null
          raw_ocr_text?: string | null
          rbq?: string | null
          representative_name?: string | null
          service_keywords?: Json | null
          verification_run_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_visual_extractions_verification_run_id_fkey"
            columns: ["verification_run_id"]
            isOneToOne: false
            referencedRelation: "contractor_verification_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_wallet: {
        Row: {
          balance_cents: number
          contractor_id: string
          created_at: string
          id: string
          last_top_up_at: string | null
          lifetime_credited_cents: number
          lifetime_spent_cents: number
          low_balance_alerted: boolean | null
          updated_at: string
        }
        Insert: {
          balance_cents?: number
          contractor_id: string
          created_at?: string
          id?: string
          last_top_up_at?: string | null
          lifetime_credited_cents?: number
          lifetime_spent_cents?: number
          low_balance_alerted?: boolean | null
          updated_at?: string
        }
        Update: {
          balance_cents?: number
          contractor_id?: string
          created_at?: string
          id?: string
          last_top_up_at?: string | null
          lifetime_credited_cents?: number
          lifetime_spent_cents?: number
          low_balance_alerted?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contractor_wallet_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: true
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_wallet_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: true
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_wallet_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: true
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_wallet_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: true
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      contractors: {
        Row: {
          address: string | null
          admin_note: string | null
          admin_verified: boolean | null
          aipp_score: number | null
          booking_base_lat: number | null
          booking_base_lng: number | null
          booking_default_rounding_minutes: number | null
          booking_enabled: boolean | null
          booking_horizon_days: number | null
          booking_min_notice_hours: number | null
          booking_mode: string | null
          booking_page_published: boolean | null
          booking_service_radius_km: number | null
          booking_timezone: string | null
          business_name: string
          city: string | null
          created_at: string
          description: string | null
          email: string | null
          facebook_page_url: string | null
          google_business_url: string | null
          google_calendar_connected: boolean | null
          google_calendar_id: string | null
          id: string
          insurance_info: string | null
          internal_verified_at: string | null
          internal_verified_by: string | null
          internal_verified_score: number | null
          legal_name: string | null
          license_number: string | null
          logo_url: string | null
          neq: string | null
          normalized_business_name: string | null
          normalized_phone: string | null
          normalized_website: string | null
          phone: string | null
          portfolio_urls: string[] | null
          postal_code: string | null
          province: string | null
          rating: number | null
          rbq_number: string | null
          review_count: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          slug: string | null
          specialty: string | null
          updated_at: string
          user_id: string
          verification_notes: string | null
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
          admin_verified?: boolean | null
          aipp_score?: number | null
          booking_base_lat?: number | null
          booking_base_lng?: number | null
          booking_default_rounding_minutes?: number | null
          booking_enabled?: boolean | null
          booking_horizon_days?: number | null
          booking_min_notice_hours?: number | null
          booking_mode?: string | null
          booking_page_published?: boolean | null
          booking_service_radius_km?: number | null
          booking_timezone?: string | null
          business_name: string
          city?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          facebook_page_url?: string | null
          google_business_url?: string | null
          google_calendar_connected?: boolean | null
          google_calendar_id?: string | null
          id?: string
          insurance_info?: string | null
          internal_verified_at?: string | null
          internal_verified_by?: string | null
          internal_verified_score?: number | null
          legal_name?: string | null
          license_number?: string | null
          logo_url?: string | null
          neq?: string | null
          normalized_business_name?: string | null
          normalized_phone?: string | null
          normalized_website?: string | null
          phone?: string | null
          portfolio_urls?: string[] | null
          postal_code?: string | null
          province?: string | null
          rating?: number | null
          rbq_number?: string | null
          review_count?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug?: string | null
          specialty?: string | null
          updated_at?: string
          user_id: string
          verification_notes?: string | null
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
          admin_verified?: boolean | null
          aipp_score?: number | null
          booking_base_lat?: number | null
          booking_base_lng?: number | null
          booking_default_rounding_minutes?: number | null
          booking_enabled?: boolean | null
          booking_horizon_days?: number | null
          booking_min_notice_hours?: number | null
          booking_mode?: string | null
          booking_page_published?: boolean | null
          booking_service_radius_km?: number | null
          booking_timezone?: string | null
          business_name?: string
          city?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          facebook_page_url?: string | null
          google_business_url?: string | null
          google_calendar_connected?: boolean | null
          google_calendar_id?: string | null
          id?: string
          insurance_info?: string | null
          internal_verified_at?: string | null
          internal_verified_by?: string | null
          internal_verified_score?: number | null
          legal_name?: string | null
          license_number?: string | null
          logo_url?: string | null
          neq?: string | null
          normalized_business_name?: string | null
          normalized_phone?: string | null
          normalized_website?: string | null
          phone?: string | null
          portfolio_urls?: string[] | null
          postal_code?: string | null
          province?: string | null
          rating?: number | null
          rbq_number?: string | null
          review_count?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug?: string | null
          specialty?: string | null
          updated_at?: string
          user_id?: string
          verification_notes?: string | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at?: string | null
          website?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      contractors_prospects: {
        Row: {
          ai_score: number | null
          aipp_score: number | null
          branding_score: number | null
          business_name: string
          category: string | null
          city: string | null
          competitor_gap: Json | null
          content_score: number | null
          conversion_score: number | null
          created_at: string
          diagnostic: Json | null
          diagnostic_summary: string | null
          domain: string | null
          email: string | null
          estimated_monthly_loss_max: number | null
          estimated_monthly_loss_min: number | null
          google_maps_url: string | null
          id: string
          is_running_ads: boolean | null
          landing_slug: string | null
          landing_url: string | null
          legal_name: string | null
          local_score: number | null
          loom_script: string | null
          loom_status: string | null
          notes: string | null
          paid_intent_confidence: number | null
          phone: string | null
          priority_tier: string
          quick_wins: Json | null
          region: string | null
          reviews_score: number | null
          score_confidence: number | null
          screenshot_mobile_url: string | null
          screenshot_url: string | null
          seo_score: number | null
          service_area: string | null
          source: string | null
          source_detail: string | null
          status: string
          subcategory: string | null
          trust_score: number | null
          updated_at: string
          website: string | null
        }
        Insert: {
          ai_score?: number | null
          aipp_score?: number | null
          branding_score?: number | null
          business_name: string
          category?: string | null
          city?: string | null
          competitor_gap?: Json | null
          content_score?: number | null
          conversion_score?: number | null
          created_at?: string
          diagnostic?: Json | null
          diagnostic_summary?: string | null
          domain?: string | null
          email?: string | null
          estimated_monthly_loss_max?: number | null
          estimated_monthly_loss_min?: number | null
          google_maps_url?: string | null
          id?: string
          is_running_ads?: boolean | null
          landing_slug?: string | null
          landing_url?: string | null
          legal_name?: string | null
          local_score?: number | null
          loom_script?: string | null
          loom_status?: string | null
          notes?: string | null
          paid_intent_confidence?: number | null
          phone?: string | null
          priority_tier?: string
          quick_wins?: Json | null
          region?: string | null
          reviews_score?: number | null
          score_confidence?: number | null
          screenshot_mobile_url?: string | null
          screenshot_url?: string | null
          seo_score?: number | null
          service_area?: string | null
          source?: string | null
          source_detail?: string | null
          status?: string
          subcategory?: string | null
          trust_score?: number | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          ai_score?: number | null
          aipp_score?: number | null
          branding_score?: number | null
          business_name?: string
          category?: string | null
          city?: string | null
          competitor_gap?: Json | null
          content_score?: number | null
          conversion_score?: number | null
          created_at?: string
          diagnostic?: Json | null
          diagnostic_summary?: string | null
          domain?: string | null
          email?: string | null
          estimated_monthly_loss_max?: number | null
          estimated_monthly_loss_min?: number | null
          google_maps_url?: string | null
          id?: string
          is_running_ads?: boolean | null
          landing_slug?: string | null
          landing_url?: string | null
          legal_name?: string | null
          local_score?: number | null
          loom_script?: string | null
          loom_status?: string | null
          notes?: string | null
          paid_intent_confidence?: number | null
          phone?: string | null
          priority_tier?: string
          quick_wins?: Json | null
          region?: string | null
          reviews_score?: number | null
          score_confidence?: number | null
          screenshot_mobile_url?: string | null
          screenshot_url?: string | null
          seo_score?: number | null
          service_area?: string | null
          source?: string | null
          source_detail?: string | null
          status?: string
          subcategory?: string | null
          trust_score?: number | null
          updated_at?: string
          website?: string | null
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
      cta_events: {
        Row: {
          created_at: string
          cta_text: string
          id: string
          intent: string
          page: string
          session_id: string | null
          user_id: string | null
          user_role: string | null
        }
        Insert: {
          created_at?: string
          cta_text: string
          id?: string
          intent: string
          page: string
          session_id?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Update: {
          created_at?: string
          cta_text?: string
          id?: string
          intent?: string
          page?: string
          session_id?: string | null
          user_id?: string | null
          user_role?: string | null
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
            foreignKeyName: "data_sources_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
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
      deep_link_events: {
        Row: {
          created_at: string
          deep_link_id: string | null
          event_type: string
          id: string
          metadata: Json | null
          session_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          deep_link_id?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          session_id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          deep_link_id?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          session_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deep_link_events_deep_link_id_fkey"
            columns: ["deep_link_id"]
            isOneToOne: false
            referencedRelation: "deep_links"
            referencedColumns: ["id"]
          },
        ]
      }
      deep_links: {
        Row: {
          code: string
          context_json: Json | null
          created_at: string
          created_by: string | null
          feature: string
          id: string
          role: string | null
          sub_feature: string | null
        }
        Insert: {
          code: string
          context_json?: Json | null
          created_at?: string
          created_by?: string | null
          feature: string
          id?: string
          role?: string | null
          sub_feature?: string | null
        }
        Update: {
          code?: string
          context_json?: Json | null
          created_at?: string
          created_by?: string | null
          feature?: string
          id?: string
          role?: string | null
          sub_feature?: string | null
        }
        Relationships: []
      }
      demand_spike_metrics: {
        Row: {
          acceptance_rate: number | null
          active_queue_count: number | null
          available_contractors: number | null
          avg_response_seconds: number | null
          calculated_at: string
          category: string | null
          city: string | null
          id: string
          region: string | null
          request_count_hour: number | null
          shortage_state: string | null
        }
        Insert: {
          acceptance_rate?: number | null
          active_queue_count?: number | null
          available_contractors?: number | null
          avg_response_seconds?: number | null
          calculated_at?: string
          category?: string | null
          city?: string | null
          id?: string
          region?: string | null
          request_count_hour?: number | null
          shortage_state?: string | null
        }
        Update: {
          acceptance_rate?: number | null
          active_queue_count?: number | null
          available_contractors?: number | null
          avg_response_seconds?: number | null
          calculated_at?: string
          category?: string | null
          city?: string | null
          id?: string
          region?: string | null
          request_count_hour?: number | null
          shortage_state?: string | null
        }
        Relationships: []
      }
      design_edits: {
        Row: {
          created_at: string
          edit_type: string
          id: string
          metadata: Json | null
          prompt: string | null
          target_zone: string | null
          version_id: string
        }
        Insert: {
          created_at?: string
          edit_type?: string
          id?: string
          metadata?: Json | null
          prompt?: string | null
          target_zone?: string | null
          version_id: string
        }
        Update: {
          created_at?: string
          edit_type?: string
          id?: string
          metadata?: Json | null
          prompt?: string | null
          target_zone?: string | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_edits_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "design_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      design_material_preferences: {
        Row: {
          backsplash_type: string | null
          cabinets_color: string | null
          countertop_type: string | null
          created_at: string
          floor_type: string | null
          hardware_finish: string | null
          id: string
          project_id: string
          style_tags: string[] | null
          updated_at: string
          wall_color: string | null
        }
        Insert: {
          backsplash_type?: string | null
          cabinets_color?: string | null
          countertop_type?: string | null
          created_at?: string
          floor_type?: string | null
          hardware_finish?: string | null
          id?: string
          project_id: string
          style_tags?: string[] | null
          updated_at?: string
          wall_color?: string | null
        }
        Update: {
          backsplash_type?: string | null
          cabinets_color?: string | null
          countertop_type?: string | null
          created_at?: string
          floor_type?: string | null
          hardware_finish?: string | null
          id?: string
          project_id?: string
          style_tags?: string[] | null
          updated_at?: string
          wall_color?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "design_material_preferences_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "design_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      design_projects: {
        Row: {
          created_at: string
          id: string
          original_image_url: string | null
          property_id: string | null
          room_type: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          created_at?: string
          id?: string
          original_image_url?: string | null
          property_id?: string | null
          room_type?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          created_at?: string
          id?: string
          original_image_url?: string | null
          property_id?: string | null
          room_type?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_projects_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_projects_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
            referencedColumns: ["id"]
          },
        ]
      }
      design_shares: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          privacy_type: string
          project_id: string
          share_token: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          privacy_type?: string
          project_id: string
          share_token?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          privacy_type?: string
          project_id?: string
          share_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_shares_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "design_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      design_usage: {
        Row: {
          created_at: string
          generation_count: number
          id: string
          is_subscribed: boolean
          month_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          generation_count?: number
          id?: string
          is_subscribed?: boolean
          month_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          generation_count?: number
          id?: string
          is_subscribed?: boolean
          month_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      design_versions: {
        Row: {
          budget_mode: string | null
          created_at: string
          frozen: boolean
          id: string
          image_url: string | null
          parent_version_id: string | null
          project_id: string
          prompt_used: string | null
          style_label: string | null
          version_number: string
        }
        Insert: {
          budget_mode?: string | null
          created_at?: string
          frozen?: boolean
          id?: string
          image_url?: string | null
          parent_version_id?: string | null
          project_id: string
          prompt_used?: string | null
          style_label?: string | null
          version_number?: string
        }
        Update: {
          budget_mode?: string | null
          created_at?: string
          frozen?: boolean
          id?: string
          image_url?: string | null
          parent_version_id?: string | null
          project_id?: string
          prompt_used?: string | null
          style_label?: string | null
          version_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_versions_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "design_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "design_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      design_votes: {
        Row: {
          comment: string | null
          created_at: string
          fingerprint: string | null
          id: string
          project_id: string
          version_id: string
          vote_type: string
          voter_email: string | null
          voter_name: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          fingerprint?: string | null
          id?: string
          project_id: string
          version_id: string
          vote_type?: string
          voter_email?: string | null
          voter_name?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          fingerprint?: string | null
          id?: string
          project_id?: string
          version_id?: string
          vote_type?: string
          voter_email?: string | null
          voter_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_votes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "design_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_votes_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "design_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_rules: {
        Row: {
          category: string | null
          created_at: string
          description_fr: string | null
          id: string
          is_active: boolean | null
          rule_key: string
          rule_value: Json
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description_fr?: string | null
          id?: string
          is_active?: boolean | null
          rule_key: string
          rule_value?: Json
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description_fr?: string | null
          id?: string
          is_active?: boolean | null
          rule_key?: string
          rule_value?: Json
          updated_at?: string
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
          {
            foreignKeyName: "dna_fit_results_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
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
      dynamic_pricing: {
        Row: {
          base_price_cents: number | null
          city: string
          demand_multiplier: number | null
          final_price_cents: number | null
          id: string
          is_active: boolean | null
          problem_type: string
          sample_size: number | null
          supply_multiplier: number | null
          updated_at: string | null
          urgency_multiplier: number | null
        }
        Insert: {
          base_price_cents?: number | null
          city: string
          demand_multiplier?: number | null
          final_price_cents?: number | null
          id?: string
          is_active?: boolean | null
          problem_type: string
          sample_size?: number | null
          supply_multiplier?: number | null
          updated_at?: string | null
          urgency_multiplier?: number | null
        }
        Update: {
          base_price_cents?: number | null
          city?: string
          demand_multiplier?: number | null
          final_price_cents?: number | null
          id?: string
          is_active?: boolean | null
          problem_type?: string
          sample_size?: number | null
          supply_multiplier?: number | null
          updated_at?: string | null
          urgency_multiplier?: number | null
        }
        Relationships: []
      }
      dynamic_pricing_logs: {
        Row: {
          admin_override: boolean | null
          admin_override_reason: string | null
          base_price_cents: number
          cap_applied: boolean | null
          combined_multiplier: number
          contractor_id: string | null
          created_at: string
          demand_multiplier: number
          final_price_cents: number
          id: string
          intent_multiplier: number
          multipliers_json: Json | null
          request_id: string | null
          sla_surcharge_cents: number | null
          sla_tier: string | null
          storm_multiplier: number
          supply_multiplier: number
          time_multiplier: number
          urgency_multiplier: number
        }
        Insert: {
          admin_override?: boolean | null
          admin_override_reason?: string | null
          base_price_cents: number
          cap_applied?: boolean | null
          combined_multiplier?: number
          contractor_id?: string | null
          created_at?: string
          demand_multiplier?: number
          final_price_cents: number
          id?: string
          intent_multiplier?: number
          multipliers_json?: Json | null
          request_id?: string | null
          sla_surcharge_cents?: number | null
          sla_tier?: string | null
          storm_multiplier?: number
          supply_multiplier?: number
          time_multiplier?: number
          urgency_multiplier?: number
        }
        Update: {
          admin_override?: boolean | null
          admin_override_reason?: string | null
          base_price_cents?: number
          cap_applied?: boolean | null
          combined_multiplier?: number
          contractor_id?: string | null
          created_at?: string
          demand_multiplier?: number
          final_price_cents?: number
          id?: string
          intent_multiplier?: number
          multipliers_json?: Json | null
          request_id?: string | null
          sla_surcharge_cents?: number | null
          sla_tier?: string | null
          storm_multiplier?: number
          supply_multiplier?: number
          time_multiplier?: number
          urgency_multiplier?: number
        }
        Relationships: [
          {
            foreignKeyName: "dynamic_pricing_logs_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dynamic_pricing_logs_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dynamic_pricing_logs_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dynamic_pricing_logs_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
          {
            foreignKeyName: "dynamic_pricing_logs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "emergency_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      dynamic_pricing_settings: {
        Row: {
          description_fr: string | null
          id: string
          label_fr: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description_fr?: string | null
          id?: string
          label_fr: string
          setting_key: string
          setting_value: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description_fr?: string | null
          id?: string
          label_fr?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      emergency_assignments: {
        Row: {
          accepted_at: string | null
          auto_accept_event_id: string | null
          auto_accepted: boolean | null
          contractor_id: string
          eta_minutes: number | null
          id: string
          note: string | null
          request_id: string
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          auto_accept_event_id?: string | null
          auto_accepted?: boolean | null
          contractor_id: string
          eta_minutes?: number | null
          id?: string
          note?: string | null
          request_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          auto_accept_event_id?: string | null
          auto_accepted?: boolean | null
          contractor_id?: string
          eta_minutes?: number | null
          id?: string
          note?: string | null
          request_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_assignments_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_assignments_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_assignments_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_assignments_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
          {
            foreignKeyName: "emergency_assignments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "emergency_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_demand_metrics: {
        Row: {
          acceptance_count: number
          avg_price_cents: number | null
          avg_time_to_arrival_sec: number | null
          avg_time_to_assignment_sec: number | null
          category: string
          city_slug: string | null
          contractor_supply_count: number | null
          created_at: string
          demand_supply_ratio: number | null
          id: string
          period_end: string
          period_start: string
          refusal_count: number
          request_count: number
          storm_active: boolean | null
        }
        Insert: {
          acceptance_count?: number
          avg_price_cents?: number | null
          avg_time_to_arrival_sec?: number | null
          avg_time_to_assignment_sec?: number | null
          category: string
          city_slug?: string | null
          contractor_supply_count?: number | null
          created_at?: string
          demand_supply_ratio?: number | null
          id?: string
          period_end: string
          period_start: string
          refusal_count?: number
          request_count?: number
          storm_active?: boolean | null
        }
        Update: {
          acceptance_count?: number
          avg_price_cents?: number | null
          avg_time_to_arrival_sec?: number | null
          avg_time_to_assignment_sec?: number | null
          category?: string
          city_slug?: string | null
          contractor_supply_count?: number | null
          created_at?: string
          demand_supply_ratio?: number | null
          id?: string
          period_end?: string
          period_start?: string
          refusal_count?: number
          request_count?: number
          storm_active?: boolean | null
        }
        Relationships: []
      }
      emergency_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json | null
          request_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json | null
          request_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json | null
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "emergency_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_matches: {
        Row: {
          contractor_id: string
          created_at: string
          dispatch_order: number
          id: string
          match_score: number
          refusal_reason: string | null
          request_id: string
          responded_at: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          contractor_id: string
          created_at?: string
          dispatch_order?: number
          id?: string
          match_score?: number
          refusal_reason?: string | null
          request_id: string
          responded_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          contractor_id?: string
          created_at?: string
          dispatch_order?: number
          id?: string
          match_score?: number
          refusal_reason?: string | null
          request_id?: string
          responded_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_matches_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_matches_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_matches_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_matches_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
          {
            foreignKeyName: "emergency_matches_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "emergency_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_pricing_base: {
        Row: {
          avg_job_value_cents: number | null
          base_price_cents: number
          category: string
          city_slug: string | null
          competition_level: string | null
          created_at: string
          historical_acceptance_rate: number | null
          id: string
          is_active: boolean
          region: string | null
          updated_at: string
        }
        Insert: {
          avg_job_value_cents?: number | null
          base_price_cents?: number
          category: string
          city_slug?: string | null
          competition_level?: string | null
          created_at?: string
          historical_acceptance_rate?: number | null
          id?: string
          is_active?: boolean
          region?: string | null
          updated_at?: string
        }
        Update: {
          avg_job_value_cents?: number | null
          base_price_cents?: number
          category?: string
          city_slug?: string | null
          competition_level?: string | null
          created_at?: string
          historical_acceptance_rate?: number | null
          id?: string
          is_active?: boolean
          region?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      emergency_requests: {
        Row: {
          address: string | null
          asap_requested: boolean | null
          callback_requested: boolean | null
          category: string
          created_at: string
          current_dispatch_index: number | null
          description: string | null
          dispatch_delay_seconds: number | null
          dispatch_mode: string | null
          getting_worse: boolean | null
          id: string
          intent_score: number
          next_dispatch_at: string | null
          phone: string | null
          photo_urls: string[] | null
          preferred_contact: string | null
          property_id: string | null
          severity: string
          shortage_zone: boolean | null
          sla_accept_due_at: string | null
          sla_first_dispatch_due_at: string | null
          sla_response_due_at: string | null
          sla_status: string | null
          status: string
          storm_pattern: string | null
          storm_priority_score: number | null
          storm_related: boolean | null
          storm_session_id: string | null
          triage_json: Json | null
          triage_summary: string | null
          updated_at: string
          urgency_level: string
          user_id: string | null
          when_started: string | null
          widened_radius_used: boolean | null
        }
        Insert: {
          address?: string | null
          asap_requested?: boolean | null
          callback_requested?: boolean | null
          category?: string
          created_at?: string
          current_dispatch_index?: number | null
          description?: string | null
          dispatch_delay_seconds?: number | null
          dispatch_mode?: string | null
          getting_worse?: boolean | null
          id?: string
          intent_score?: number
          next_dispatch_at?: string | null
          phone?: string | null
          photo_urls?: string[] | null
          preferred_contact?: string | null
          property_id?: string | null
          severity?: string
          shortage_zone?: boolean | null
          sla_accept_due_at?: string | null
          sla_first_dispatch_due_at?: string | null
          sla_response_due_at?: string | null
          sla_status?: string | null
          status?: string
          storm_pattern?: string | null
          storm_priority_score?: number | null
          storm_related?: boolean | null
          storm_session_id?: string | null
          triage_json?: Json | null
          triage_summary?: string | null
          updated_at?: string
          urgency_level?: string
          user_id?: string | null
          when_started?: string | null
          widened_radius_used?: boolean | null
        }
        Update: {
          address?: string | null
          asap_requested?: boolean | null
          callback_requested?: boolean | null
          category?: string
          created_at?: string
          current_dispatch_index?: number | null
          description?: string | null
          dispatch_delay_seconds?: number | null
          dispatch_mode?: string | null
          getting_worse?: boolean | null
          id?: string
          intent_score?: number
          next_dispatch_at?: string | null
          phone?: string | null
          photo_urls?: string[] | null
          preferred_contact?: string | null
          property_id?: string | null
          severity?: string
          shortage_zone?: boolean | null
          sla_accept_due_at?: string | null
          sla_first_dispatch_due_at?: string | null
          sla_response_due_at?: string | null
          sla_status?: string | null
          status?: string
          storm_pattern?: string | null
          storm_priority_score?: number | null
          storm_related?: boolean | null
          storm_session_id?: string | null
          triage_json?: Json | null
          triage_summary?: string | null
          updated_at?: string
          urgency_level?: string
          user_id?: string | null
          when_started?: string | null
          widened_radius_used?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_status_events: {
        Row: {
          assignment_id: string
          created_at: string
          id: string
          note: string | null
          status: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          id?: string
          note?: string | null
          status: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          id?: string
          note?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_status_events_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "emergency_assignments"
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
          {
            foreignKeyName: "extraction_jobs_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
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
          {
            foreignKeyName: "field_validations_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      founder_invite_access_logs: {
        Row: {
          created_at: string
          entered_pin: string
          founder_invite_id: string
          id: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          entered_pin: string
          founder_invite_id: string
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          entered_pin?: string
          founder_invite_id?: string
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "founder_invite_access_logs_founder_invite_id_fkey"
            columns: ["founder_invite_id"]
            isOneToOne: false
            referencedRelation: "founder_invites"
            referencedColumns: ["id"]
          },
        ]
      }
      founder_invites: {
        Row: {
          access_pin: string
          ambassador_user_id: string
          created_at: string
          expires_at: string | null
          id: string
          max_uses: number
          referral_code: string
          status: string
          used_count: number
        }
        Insert: {
          access_pin: string
          ambassador_user_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          max_uses?: number
          referral_code: string
          status?: string
          used_count?: number
        }
        Update: {
          access_pin?: string
          ambassador_user_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          max_uses?: number
          referral_code?: string
          status?: string
          used_count?: number
        }
        Relationships: []
      }
      gated_unlock_events: {
        Row: {
          article_id: string
          converted_to_signup: boolean | null
          converted_to_subscription: boolean | null
          created_at: string
          id: string
          unlock_method: string
          user_id: string | null
        }
        Insert: {
          article_id: string
          converted_to_signup?: boolean | null
          converted_to_subscription?: boolean | null
          created_at?: string
          id?: string
          unlock_method?: string
          user_id?: string | null
        }
        Update: {
          article_id?: string
          converted_to_signup?: boolean | null
          converted_to_subscription?: boolean | null
          created_at?: string
          id?: string
          unlock_method?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gated_unlock_events_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "blog_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_pages_registry: {
        Row: {
          aiseo_score: number | null
          category: string | null
          city: string | null
          id: string
          indexed_status: string | null
          metadata: Json | null
          page_type: string | null
          profession: string | null
          published_at: string | null
          quality_score: number | null
          seo_score: number | null
          slug: string | null
          source_agent_key: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          aiseo_score?: number | null
          category?: string | null
          city?: string | null
          id?: string
          indexed_status?: string | null
          metadata?: Json | null
          page_type?: string | null
          profession?: string | null
          published_at?: string | null
          quality_score?: number | null
          seo_score?: number | null
          slug?: string | null
          source_agent_key?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          aiseo_score?: number | null
          category?: string | null
          city?: string | null
          id?: string
          indexed_status?: string | null
          metadata?: Json | null
          page_type?: string | null
          profession?: string | null
          published_at?: string | null
          quality_score?: number | null
          seo_score?: number | null
          slug?: string | null
          source_agent_key?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      geo_areas: {
        Row: {
          area_type: string
          created_at: string | null
          gdp_estimate: number | null
          id: string
          is_active: boolean | null
          name_fr: string
          parent_area_id: string | null
          population_estimate: number | null
          province_code: string | null
          seo_tier: string | null
          slug: string
        }
        Insert: {
          area_type?: string
          created_at?: string | null
          gdp_estimate?: number | null
          id?: string
          is_active?: boolean | null
          name_fr: string
          parent_area_id?: string | null
          population_estimate?: number | null
          province_code?: string | null
          seo_tier?: string | null
          slug: string
        }
        Update: {
          area_type?: string
          created_at?: string | null
          gdp_estimate?: number | null
          id?: string
          is_active?: boolean | null
          name_fr?: string
          parent_area_id?: string | null
          population_estimate?: number | null
          province_code?: string | null
          seo_tier?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "geo_areas_parent_area_id_fkey"
            columns: ["parent_area_id"]
            isOneToOne: false
            referencedRelation: "geo_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      grant_programs: {
        Row: {
          applicable_property_types: string[] | null
          applicable_regions: string[] | null
          coverage_pct: number | null
          created_at: string
          description_en: string | null
          description_fr: string | null
          eligibility_rules: Json | null
          ends_at: string | null
          id: string
          max_amount: number | null
          name_en: string | null
          name_fr: string
          program_key: string
          program_url: string | null
          provider: string
          provider_type: string | null
          required_fields: string[] | null
          starts_at: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          applicable_property_types?: string[] | null
          applicable_regions?: string[] | null
          coverage_pct?: number | null
          created_at?: string
          description_en?: string | null
          description_fr?: string | null
          eligibility_rules?: Json | null
          ends_at?: string | null
          id?: string
          max_amount?: number | null
          name_en?: string | null
          name_fr: string
          program_key: string
          program_url?: string | null
          provider: string
          provider_type?: string | null
          required_fields?: string[] | null
          starts_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          applicable_property_types?: string[] | null
          applicable_regions?: string[] | null
          coverage_pct?: number | null
          created_at?: string
          description_en?: string | null
          description_fr?: string | null
          eligibility_rules?: Json | null
          ends_at?: string | null
          id?: string
          max_amount?: number | null
          name_en?: string | null
          name_fr?: string
          program_key?: string
          program_url?: string | null
          provider?: string
          provider_type?: string | null
          required_fields?: string[] | null
          starts_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      graph_page_blueprints: {
        Row: {
          blueprint_type: string
          canonical_slug: string
          created_at: string | null
          generation_reason: string | null
          generation_status: string | null
          geo_area_id: string | null
          h1_fr: string | null
          id: string
          internal_link_targets: Json | null
          meta_description_fr: string | null
          meta_title_fr: string | null
          priority_score: number | null
          problem_id: string | null
          profession_id: string | null
          property_type_slug: string | null
          question_id: string | null
          related_keywords: Json | null
          schema_type: string | null
          solution_id: string | null
          target_keyword_fr: string | null
          title_fr: string | null
          updated_at: string | null
        }
        Insert: {
          blueprint_type: string
          canonical_slug: string
          created_at?: string | null
          generation_reason?: string | null
          generation_status?: string | null
          geo_area_id?: string | null
          h1_fr?: string | null
          id?: string
          internal_link_targets?: Json | null
          meta_description_fr?: string | null
          meta_title_fr?: string | null
          priority_score?: number | null
          problem_id?: string | null
          profession_id?: string | null
          property_type_slug?: string | null
          question_id?: string | null
          related_keywords?: Json | null
          schema_type?: string | null
          solution_id?: string | null
          target_keyword_fr?: string | null
          title_fr?: string | null
          updated_at?: string | null
        }
        Update: {
          blueprint_type?: string
          canonical_slug?: string
          created_at?: string | null
          generation_reason?: string | null
          generation_status?: string | null
          geo_area_id?: string | null
          h1_fr?: string | null
          id?: string
          internal_link_targets?: Json | null
          meta_description_fr?: string | null
          meta_title_fr?: string | null
          priority_score?: number | null
          problem_id?: string | null
          profession_id?: string | null
          property_type_slug?: string | null
          question_id?: string | null
          related_keywords?: Json | null
          schema_type?: string | null
          solution_id?: string | null
          target_keyword_fr?: string | null
          title_fr?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "graph_page_blueprints_geo_area_id_fkey"
            columns: ["geo_area_id"]
            isOneToOne: false
            referencedRelation: "geo_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "graph_page_blueprints_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "home_problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "graph_page_blueprints_profession_id_fkey"
            columns: ["profession_id"]
            isOneToOne: false
            referencedRelation: "home_professions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "graph_page_blueprints_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "homeowner_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "graph_page_blueprints_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "home_solutions"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_engine_metrics: {
        Row: {
          created_at: string
          dimension_key: string | null
          dimension_value: string | null
          id: string
          metadata: Json | null
          metric_date: string
          metric_type: string
          metric_value: number
        }
        Insert: {
          created_at?: string
          dimension_key?: string | null
          dimension_value?: string | null
          id?: string
          metadata?: Json | null
          metric_date?: string
          metric_type: string
          metric_value?: number
        }
        Update: {
          created_at?: string
          dimension_key?: string | null
          dimension_value?: string | null
          id?: string
          metadata?: Json | null
          metric_date?: string
          metric_type?: string
          metric_value?: number
        }
        Relationships: []
      }
      growth_events: {
        Row: {
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          metadata: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_engine: string
          status: string
          title: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_engine: string
          status?: string
          title?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_engine?: string
          status?: string
          title?: string | null
        }
        Relationships: []
      }
      home_problem_causes: {
        Row: {
          cause_id: string
          created_at: string | null
          id: string
          problem_id: string
          weight: number | null
        }
        Insert: {
          cause_id: string
          created_at?: string | null
          id?: string
          problem_id: string
          weight?: number | null
        }
        Update: {
          cause_id?: string
          created_at?: string | null
          id?: string
          problem_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "home_problem_causes_cause_id_fkey"
            columns: ["cause_id"]
            isOneToOne: false
            referencedRelation: "problem_causes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_problem_causes_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "home_problems"
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
      home_problem_symptoms: {
        Row: {
          created_at: string | null
          id: string
          problem_id: string
          symptom_id: string
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          problem_id: string
          symptom_id: string
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          problem_id?: string
          symptom_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "home_problem_symptoms_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "home_problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_problem_symptoms_symptom_id_fkey"
            columns: ["symptom_id"]
            isOneToOne: false
            referencedRelation: "problem_symptoms"
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
          aiseo_priority_score: number | null
          building_age_relevance: string | null
          climate_relevance: string[] | null
          cost_estimate_high: number | null
          cost_estimate_low: number | null
          cost_unit: string | null
          created_at: string
          demand_score: number | null
          description_en: string | null
          description_fr: string | null
          difficulty_score: number | null
          display_order: number | null
          google_difficulty_score: number | null
          homeowner_visible: boolean | null
          id: string
          is_active: boolean | null
          long_description_fr: string | null
          metadata: Json | null
          name_en: string
          name_fr: string
          professional_category: string | null
          profitability_score: number | null
          property_types: string[] | null
          recommended_solution_slugs: string[] | null
          seo_description_fr: string | null
          seo_keywords: string[] | null
          seo_priority_score: number | null
          seo_title_fr: string | null
          severity_level: string | null
          short_description_fr: string | null
          slug: string
          source_confidence: number | null
          total_priority_score: number | null
          typical_causes: Json | null
          updated_at: string
          urgency_score: number | null
        }
        Insert: {
          aiseo_priority_score?: number | null
          building_age_relevance?: string | null
          climate_relevance?: string[] | null
          cost_estimate_high?: number | null
          cost_estimate_low?: number | null
          cost_unit?: string | null
          created_at?: string
          demand_score?: number | null
          description_en?: string | null
          description_fr?: string | null
          difficulty_score?: number | null
          display_order?: number | null
          google_difficulty_score?: number | null
          homeowner_visible?: boolean | null
          id?: string
          is_active?: boolean | null
          long_description_fr?: string | null
          metadata?: Json | null
          name_en: string
          name_fr: string
          professional_category?: string | null
          profitability_score?: number | null
          property_types?: string[] | null
          recommended_solution_slugs?: string[] | null
          seo_description_fr?: string | null
          seo_keywords?: string[] | null
          seo_priority_score?: number | null
          seo_title_fr?: string | null
          severity_level?: string | null
          short_description_fr?: string | null
          slug: string
          source_confidence?: number | null
          total_priority_score?: number | null
          typical_causes?: Json | null
          updated_at?: string
          urgency_score?: number | null
        }
        Update: {
          aiseo_priority_score?: number | null
          building_age_relevance?: string | null
          climate_relevance?: string[] | null
          cost_estimate_high?: number | null
          cost_estimate_low?: number | null
          cost_unit?: string | null
          created_at?: string
          demand_score?: number | null
          description_en?: string | null
          description_fr?: string | null
          difficulty_score?: number | null
          display_order?: number | null
          google_difficulty_score?: number | null
          homeowner_visible?: boolean | null
          id?: string
          is_active?: boolean | null
          long_description_fr?: string | null
          metadata?: Json | null
          name_en?: string
          name_fr?: string
          professional_category?: string | null
          profitability_score?: number | null
          property_types?: string[] | null
          recommended_solution_slugs?: string[] | null
          seo_description_fr?: string | null
          seo_keywords?: string[] | null
          seo_priority_score?: number | null
          seo_title_fr?: string | null
          severity_level?: string | null
          short_description_fr?: string | null
          slug?: string
          source_confidence?: number | null
          total_priority_score?: number | null
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
          confidence_label: string | null
          confidence_level: number | null
          created_at: string
          data_sources_count: number | null
          exterior_score: number | null
          factor_breakdown: Json | null
          id: string
          interior_score: number | null
          maintenance_score: number | null
          notes: string | null
          overall_score: number
          property_id: string
          score_type: string | null
          structure_score: number | null
          systems_score: number | null
          user_id: string
        }
        Insert: {
          calculated_at?: string
          confidence_label?: string | null
          confidence_level?: number | null
          created_at?: string
          data_sources_count?: number | null
          exterior_score?: number | null
          factor_breakdown?: Json | null
          id?: string
          interior_score?: number | null
          maintenance_score?: number | null
          notes?: string | null
          overall_score?: number
          property_id: string
          score_type?: string | null
          structure_score?: number | null
          systems_score?: number | null
          user_id: string
        }
        Update: {
          calculated_at?: string
          confidence_label?: string | null
          confidence_level?: number | null
          created_at?: string
          data_sources_count?: number | null
          exterior_score?: number | null
          factor_breakdown?: Json | null
          id?: string
          interior_score?: number | null
          maintenance_score?: number | null
          notes?: string | null
          overall_score?: number
          property_id?: string
          score_type?: string | null
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
          {
            foreignKeyName: "home_scores_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
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
          {
            foreignKeyName: "homeowner_dna_profiles_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
            referencedColumns: ["id"]
          },
        ]
      }
      homeowner_messages: {
        Row: {
          action_label_fr: string | null
          action_url: string | null
          body_fr: string
          category: string
          channel: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_read: boolean | null
          metadata: Json | null
          priority: string | null
          property_id: string | null
          read_at: string | null
          title_fr: string
          user_id: string
        }
        Insert: {
          action_label_fr?: string | null
          action_url?: string | null
          body_fr: string
          category: string
          channel?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          priority?: string | null
          property_id?: string | null
          read_at?: string | null
          title_fr: string
          user_id: string
        }
        Update: {
          action_label_fr?: string | null
          action_url?: string | null
          body_fr?: string
          category?: string
          channel?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          priority?: string | null
          property_id?: string | null
          read_at?: string | null
          title_fr?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "homeowner_messages_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homeowner_messages_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
            referencedColumns: ["id"]
          },
        ]
      }
      homeowner_profiles: {
        Row: {
          adn_score: Json | null
          budget_range: string | null
          created_at: string
          home_age_range: string | null
          id: string
          ownership_status: string | null
          profile_id: string
          project_intent: string | null
          property_type: string | null
          timeline: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          adn_score?: Json | null
          budget_range?: string | null
          created_at?: string
          home_age_range?: string | null
          id?: string
          ownership_status?: string | null
          profile_id: string
          project_intent?: string | null
          property_type?: string | null
          timeline?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          adn_score?: Json | null
          budget_range?: string | null
          created_at?: string
          home_age_range?: string | null
          id?: string
          ownership_status?: string | null
          profile_id?: string
          project_intent?: string | null
          property_type?: string | null
          timeline?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "homeowner_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      homeowner_questions: {
        Row: {
          cost_note_fr: string | null
          created_at: string | null
          full_answer_fr: string | null
          id: string
          question_fr: string
          quick_answer_fr: string | null
          slug: string
          source_confidence: number | null
          updated_at: string | null
          urgency_note_fr: string | null
        }
        Insert: {
          cost_note_fr?: string | null
          created_at?: string | null
          full_answer_fr?: string | null
          id?: string
          question_fr: string
          quick_answer_fr?: string | null
          slug: string
          source_confidence?: number | null
          updated_at?: string | null
          urgency_note_fr?: string | null
        }
        Update: {
          cost_note_fr?: string | null
          created_at?: string | null
          full_answer_fr?: string | null
          id?: string
          question_fr?: string
          quick_answer_fr?: string | null
          slug?: string
          source_confidence?: number | null
          updated_at?: string | null
          urgency_note_fr?: string | null
        }
        Relationships: []
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
      jve_calculator_sessions: {
        Row: {
          city_id: string | null
          contractor_id: string | null
          created_at: string | null
          id: string
          inputs: Json
          outputs: Json
          recommended_exclusivity: string | null
          recommended_plan: string | null
          specialty_id: string | null
          trade_id: string | null
          user_id: string | null
        }
        Insert: {
          city_id?: string | null
          contractor_id?: string | null
          created_at?: string | null
          id?: string
          inputs?: Json
          outputs?: Json
          recommended_exclusivity?: string | null
          recommended_plan?: string | null
          specialty_id?: string | null
          trade_id?: string | null
          user_id?: string | null
        }
        Update: {
          city_id?: string | null
          contractor_id?: string | null
          created_at?: string | null
          id?: string
          inputs?: Json
          outputs?: Json
          recommended_exclusivity?: string | null
          recommended_plan?: string | null
          specialty_id?: string | null
          trade_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jve_calculator_sessions_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "jve_cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jve_calculator_sessions_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "jve_trade_specialties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jve_calculator_sessions_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "jve_trades"
            referencedColumns: ["id"]
          },
        ]
      }
      jve_cities: {
        Row: {
          competition_index: number | null
          cost_index: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name_fr: string
          population: number | null
          region_id: string
          seasonality_index: number | null
          slug: string
        }
        Insert: {
          competition_index?: number | null
          cost_index?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name_fr: string
          population?: number | null
          region_id: string
          seasonality_index?: number | null
          slug: string
        }
        Update: {
          competition_index?: number | null
          cost_index?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name_fr?: string
          population?: number | null
          region_id?: string
          seasonality_index?: number | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "jve_cities_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "jve_regions"
            referencedColumns: ["id"]
          },
        ]
      }
      jve_contractor_overrides: {
        Row: {
          avg_job_value_override: number | null
          closing_rate_override: number | null
          contractor_id: string
          created_at: string | null
          id: string
          monthly_capacity_override: number | null
          profit_margin_override: number | null
          specialty_id: string | null
          trade_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          avg_job_value_override?: number | null
          closing_rate_override?: number | null
          contractor_id: string
          created_at?: string | null
          id?: string
          monthly_capacity_override?: number | null
          profit_margin_override?: number | null
          specialty_id?: string | null
          trade_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          avg_job_value_override?: number | null
          closing_rate_override?: number | null
          contractor_id?: string
          created_at?: string | null
          id?: string
          monthly_capacity_override?: number | null
          profit_margin_override?: number | null
          specialty_id?: string | null
          trade_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jve_contractor_overrides_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "jve_trade_specialties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jve_contractor_overrides_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "jve_trades"
            referencedColumns: ["id"]
          },
        ]
      }
      jve_estimation_audit_log: {
        Row: {
          base_avg_value: number | null
          calculator_session_id: string | null
          city_multiplier: number | null
          competition_multiplier: number | null
          created_at: string | null
          final_estimated_value: number | null
          id: string
          reasoning: Json | null
          seasonality_multiplier: number | null
          urgency_multiplier: number | null
        }
        Insert: {
          base_avg_value?: number | null
          calculator_session_id?: string | null
          city_multiplier?: number | null
          competition_multiplier?: number | null
          created_at?: string | null
          final_estimated_value?: number | null
          id?: string
          reasoning?: Json | null
          seasonality_multiplier?: number | null
          urgency_multiplier?: number | null
        }
        Update: {
          base_avg_value?: number | null
          calculator_session_id?: string | null
          city_multiplier?: number | null
          competition_multiplier?: number | null
          created_at?: string | null
          final_estimated_value?: number | null
          id?: string
          reasoning?: Json | null
          seasonality_multiplier?: number | null
          urgency_multiplier?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "jve_estimation_audit_log_calculator_session_id_fkey"
            columns: ["calculator_session_id"]
            isOneToOne: false
            referencedRelation: "jve_calculator_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      jve_regions: {
        Row: {
          base_cost_index: number | null
          created_at: string | null
          id: string
          market_type: string | null
          name_fr: string
          slug: string
        }
        Insert: {
          base_cost_index?: number | null
          created_at?: string | null
          id?: string
          market_type?: string | null
          name_fr: string
          slug: string
        }
        Update: {
          base_cost_index?: number | null
          created_at?: string | null
          id?: string
          market_type?: string | null
          name_fr?: string
          slug?: string
        }
        Relationships: []
      }
      jve_trade_city_factors: {
        Row: {
          city_id: string
          city_multiplier: number | null
          competition_multiplier: number | null
          created_at: string | null
          id: string
          notes: string | null
          seasonality_multiplier: number | null
          specialty_id: string | null
          trade_id: string
          urgency_multiplier: number | null
        }
        Insert: {
          city_id: string
          city_multiplier?: number | null
          competition_multiplier?: number | null
          created_at?: string | null
          id?: string
          notes?: string | null
          seasonality_multiplier?: number | null
          specialty_id?: string | null
          trade_id: string
          urgency_multiplier?: number | null
        }
        Update: {
          city_id?: string
          city_multiplier?: number | null
          competition_multiplier?: number | null
          created_at?: string | null
          id?: string
          notes?: string | null
          seasonality_multiplier?: number | null
          specialty_id?: string | null
          trade_id?: string
          urgency_multiplier?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "jve_trade_city_factors_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "jve_cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jve_trade_city_factors_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "jve_trade_specialties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jve_trade_city_factors_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "jve_trades"
            referencedColumns: ["id"]
          },
        ]
      }
      jve_trade_performance_defaults: {
        Row: {
          created_at: string | null
          default_closing_rate: number | null
          default_monthly_capacity: number | null
          default_profit_margin: number | null
          high_closing_rate: number | null
          high_monthly_capacity: number | null
          high_profit_margin: number | null
          id: string
          low_closing_rate: number | null
          low_monthly_capacity: number | null
          low_profit_margin: number | null
          specialty_id: string | null
          trade_id: string
        }
        Insert: {
          created_at?: string | null
          default_closing_rate?: number | null
          default_monthly_capacity?: number | null
          default_profit_margin?: number | null
          high_closing_rate?: number | null
          high_monthly_capacity?: number | null
          high_profit_margin?: number | null
          id?: string
          low_closing_rate?: number | null
          low_monthly_capacity?: number | null
          low_profit_margin?: number | null
          specialty_id?: string | null
          trade_id: string
        }
        Update: {
          created_at?: string | null
          default_closing_rate?: number | null
          default_monthly_capacity?: number | null
          default_profit_margin?: number | null
          high_closing_rate?: number | null
          high_monthly_capacity?: number | null
          high_profit_margin?: number | null
          id?: string
          low_closing_rate?: number | null
          low_monthly_capacity?: number | null
          low_profit_margin?: number | null
          specialty_id?: string | null
          trade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jve_trade_performance_defaults_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "jve_trade_specialties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jve_trade_performance_defaults_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "jve_trades"
            referencedColumns: ["id"]
          },
        ]
      }
      jve_trade_specialties: {
        Row: {
          created_at: string | null
          description_fr: string | null
          id: string
          is_active: boolean | null
          name_en: string | null
          name_fr: string
          slug: string
          trade_id: string
        }
        Insert: {
          created_at?: string | null
          description_fr?: string | null
          id?: string
          is_active?: boolean | null
          name_en?: string | null
          name_fr: string
          slug: string
          trade_id: string
        }
        Update: {
          created_at?: string | null
          description_fr?: string | null
          id?: string
          is_active?: boolean | null
          name_en?: string | null
          name_fr?: string
          slug?: string
          trade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jve_trade_specialties_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "jve_trades"
            referencedColumns: ["id"]
          },
        ]
      }
      jve_trade_value_benchmarks: {
        Row: {
          benchmark_scope: string
          confidence_score: number | null
          created_at: string | null
          currency: string | null
          default_avg_value: number
          emergency_value: number | null
          id: string
          max_value: number
          median_value: number
          min_value: number
          premium_value: number | null
          source_type: string | null
          specialty_id: string | null
          trade_id: string
        }
        Insert: {
          benchmark_scope?: string
          confidence_score?: number | null
          created_at?: string | null
          currency?: string | null
          default_avg_value: number
          emergency_value?: number | null
          id?: string
          max_value: number
          median_value: number
          min_value: number
          premium_value?: number | null
          source_type?: string | null
          specialty_id?: string | null
          trade_id: string
        }
        Update: {
          benchmark_scope?: string
          confidence_score?: number | null
          created_at?: string | null
          currency?: string | null
          default_avg_value?: number
          emergency_value?: number | null
          id?: string
          max_value?: number
          median_value?: number
          min_value?: number
          premium_value?: number | null
          source_type?: string | null
          specialty_id?: string | null
          trade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jve_trade_value_benchmarks_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "jve_trade_specialties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jve_trade_value_benchmarks_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "jve_trades"
            referencedColumns: ["id"]
          },
        ]
      }
      jve_trades: {
        Row: {
          category: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name_en: string | null
          name_fr: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name_en?: string | null
          name_fr: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name_en?: string | null
          name_fr?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      landing_cta_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          metadata_json: Json | null
          page_name: string
          session_id: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          metadata_json?: Json | null
          page_name: string
          session_id?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          metadata_json?: Json | null
          page_name?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "landing_cta_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "lead_capture_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_capture_sessions: {
        Row: {
          campaign_name: string | null
          created_at: string
          device_type: string | null
          id: string
          landing_variant: string | null
          source_channel: string | null
          status: string
        }
        Insert: {
          campaign_name?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          landing_variant?: string | null
          source_channel?: string | null
          status?: string
        }
        Update: {
          campaign_name?: string | null
          created_at?: string
          device_type?: string | null
          id?: string
          landing_variant?: string | null
          source_channel?: string | null
          status?: string
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
          {
            foreignKeyName: "lead_qualifications_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_contractor_id: string | null
          assigned_match_id: string | null
          booked_at: string | null
          budget_max: number | null
          budget_min: number | null
          city: string | null
          created_at: string | null
          id: string
          intent: string | null
          language: string | null
          last_matched_at: string | null
          lead_type: string
          matching_status: string | null
          owner_profile_id: string | null
          payload: Json | null
          project_category: string | null
          property_id: string | null
          seriousness_score: number | null
          specialty_needed: string | null
          status: string | null
          urgency: string | null
        }
        Insert: {
          assigned_contractor_id?: string | null
          assigned_match_id?: string | null
          booked_at?: string | null
          budget_max?: number | null
          budget_min?: number | null
          city?: string | null
          created_at?: string | null
          id?: string
          intent?: string | null
          language?: string | null
          last_matched_at?: string | null
          lead_type: string
          matching_status?: string | null
          owner_profile_id?: string | null
          payload?: Json | null
          project_category?: string | null
          property_id?: string | null
          seriousness_score?: number | null
          specialty_needed?: string | null
          status?: string | null
          urgency?: string | null
        }
        Update: {
          assigned_contractor_id?: string | null
          assigned_match_id?: string | null
          booked_at?: string | null
          budget_max?: number | null
          budget_min?: number | null
          city?: string | null
          created_at?: string | null
          id?: string
          intent?: string | null
          language?: string | null
          last_matched_at?: string | null
          lead_type?: string
          matching_status?: string | null
          owner_profile_id?: string | null
          payload?: Json | null
          project_category?: string | null
          property_id?: string | null
          seriousness_score?: number | null
          specialty_needed?: string | null
          status?: string | null
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_contractor_id_fkey"
            columns: ["assigned_contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_assigned_contractor_id_fkey"
            columns: ["assigned_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_assigned_contractor_id_fkey"
            columns: ["assigned_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_assigned_contractor_id_fkey"
            columns: ["assigned_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
          {
            foreignKeyName: "leads_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_imports: {
        Row: {
          confidence_score: number | null
          created_at: string
          error_message: string | null
          extracted_data: Json | null
          id: string
          import_status: string
          mapped_fields: Json | null
          property_id: string | null
          raw_html: string | null
          source_platform: string | null
          source_url: string
          submitted_by: string
          updated_at: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          error_message?: string | null
          extracted_data?: Json | null
          id?: string
          import_status?: string
          mapped_fields?: Json | null
          property_id?: string | null
          raw_html?: string | null
          source_platform?: string | null
          source_url: string
          submitted_by: string
          updated_at?: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          error_message?: string | null
          extracted_data?: Json | null
          id?: string
          import_status?: string
          mapped_fields?: Json | null
          property_id?: string | null
          raw_html?: string | null
          source_platform?: string | null
          source_url?: string
          submitted_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_imports_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_imports_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
            referencedColumns: ["id"]
          },
        ]
      }
      market_capacity: {
        Row: {
          active_slots: number
          city: string
          id: string
          max_slots: number
          specialty: string
          updated_at: string | null
          waiting_list_count: number
        }
        Insert: {
          active_slots?: number
          city: string
          id?: string
          max_slots?: number
          specialty: string
          updated_at?: string | null
          waiting_list_count?: number
        }
        Update: {
          active_slots?: number
          city?: string
          id?: string
          max_slots?: number
          specialty?: string
          updated_at?: string | null
          waiting_list_count?: number
        }
        Relationships: []
      }
      market_opportunities: {
        Row: {
          city: string | null
          created_at: string | null
          estimated_value_cents: number | null
          id: string
          metadata: Json | null
          problem_type: string
          property_id: string | null
          status: string | null
          updated_at: string | null
          urgency: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          estimated_value_cents?: number | null
          id?: string
          metadata?: Json | null
          problem_type?: string
          property_id?: string | null
          status?: string | null
          updated_at?: string | null
          urgency?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string | null
          estimated_value_cents?: number | null
          id?: string
          metadata?: Json | null
          problem_type?: string
          property_id?: string | null
          status?: string | null
          updated_at?: string | null
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "market_opportunities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_opportunities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
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
      match_decisions: {
        Row: {
          contractor_id: string
          created_at: string
          decision: string
          decline_code: string | null
          decline_reason: string | null
          id: string
          lead_id: string
          match_id: string
          notes: string | null
        }
        Insert: {
          contractor_id: string
          created_at?: string
          decision: string
          decline_code?: string | null
          decline_reason?: string | null
          id?: string
          lead_id: string
          match_id: string
          notes?: string | null
        }
        Update: {
          contractor_id?: string
          created_at?: string
          decision?: string
          decline_code?: string | null
          decline_reason?: string | null
          id?: string
          lead_id?: string
          match_id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_decisions_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_decisions_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_decisions_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_decisions_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
          {
            foreignKeyName: "match_decisions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_decisions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
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
            foreignKeyName: "match_evaluations_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
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
          {
            foreignKeyName: "match_evaluations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          broker_id: string | null
          contractor_id: string | null
          created_at: string | null
          id: string
          lead_id: string
          match_type: string
          rank_position: number | null
          reasons: Json | null
          responded_at: string | null
          response_status: string | null
          score: number
          status: string | null
        }
        Insert: {
          broker_id?: string | null
          contractor_id?: string | null
          created_at?: string | null
          id?: string
          lead_id: string
          match_type: string
          rank_position?: number | null
          reasons?: Json | null
          responded_at?: string | null
          response_status?: string | null
          score: number
          status?: string | null
        }
        Update: {
          broker_id?: string | null
          contractor_id?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string
          match_type?: string
          rank_position?: number | null
          reasons?: Json | null
          responded_at?: string | null
          response_status?: string | null
          score?: number
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "broker_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
          {
            foreignKeyName: "matches_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
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
          {
            foreignKeyName: "matching_runs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
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
      menu_items: {
        Row: {
          created_at: string | null
          description: string | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          is_seasonal: boolean | null
          item_type: string | null
          name: string
          section_id: string
          slug: string
          sort_order: number | null
          updated_at: string | null
          visibility_state: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          is_seasonal?: boolean | null
          item_type?: string | null
          name: string
          section_id: string
          slug: string
          sort_order?: number | null
          updated_at?: string | null
          visibility_state?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          is_seasonal?: boolean | null
          item_type?: string | null
          name?: string
          section_id?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
          visibility_state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "menu_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_profiles: {
        Row: {
          created_at: string | null
          description: string | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      menu_seasonal_rules: {
        Row: {
          active_months: number[] | null
          created_at: string | null
          id: string
          item_id: string
          off_season_behavior: string | null
          priority_weight: number | null
          region_slug: string | null
          upcoming_months: number[] | null
        }
        Insert: {
          active_months?: number[] | null
          created_at?: string | null
          id?: string
          item_id: string
          off_season_behavior?: string | null
          priority_weight?: number | null
          region_slug?: string | null
          upcoming_months?: number[] | null
        }
        Update: {
          active_months?: number[] | null
          created_at?: string | null
          id?: string
          item_id?: string
          off_season_behavior?: string | null
          priority_weight?: number | null
          region_slug?: string | null
          upcoming_months?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_seasonal_rules_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_sections: {
        Row: {
          created_at: string | null
          description: string | null
          icon_name: string | null
          id: string
          is_active: boolean | null
          name: string
          profile_slug: string
          slug: string
          sort_order: number | null
          updated_at: string | null
          visibility_state: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          profile_slug: string
          slug: string
          sort_order?: number | null
          updated_at?: string | null
          visibility_state?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          profile_slug?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
          visibility_state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_sections_profile_slug_fkey"
            columns: ["profile_slug"]
            isOneToOne: false
            referencedRelation: "menu_profiles"
            referencedColumns: ["slug"]
          },
        ]
      }
      menu_visibility_rules: {
        Row: {
          created_at: string | null
          enable_progressive_reveal: boolean | null
          id: string
          max_visible_items_per_section: number | null
          max_visible_sections: number | null
          profile_slug: string
          show_popular_now: boolean | null
          show_upcoming_soon: boolean | null
        }
        Insert: {
          created_at?: string | null
          enable_progressive_reveal?: boolean | null
          id?: string
          max_visible_items_per_section?: number | null
          max_visible_sections?: number | null
          profile_slug: string
          show_popular_now?: boolean | null
          show_upcoming_soon?: boolean | null
        }
        Update: {
          created_at?: string | null
          enable_progressive_reveal?: boolean | null
          id?: string
          max_visible_items_per_section?: number | null
          max_visible_sections?: number | null
          profile_slug?: string
          show_popular_now?: boolean | null
          show_upcoming_soon?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_visibility_rules_profile_slug_fkey"
            columns: ["profile_slug"]
            isOneToOne: false
            referencedRelation: "menu_profiles"
            referencedColumns: ["slug"]
          },
        ]
      }
      message_frequency_rules: {
        Row: {
          category: string
          cooldown_hours: number | null
          id: string
          is_active: boolean | null
          max_per_day: number | null
          max_per_week: number | null
        }
        Insert: {
          category: string
          cooldown_hours?: number | null
          id?: string
          is_active?: boolean | null
          max_per_day?: number | null
          max_per_week?: number | null
        }
        Update: {
          category?: string
          cooldown_hours?: number | null
          id?: string
          is_active?: boolean | null
          max_per_day?: number | null
          max_per_week?: number | null
        }
        Relationships: []
      }
      neighborhood_stats: {
        Row: {
          active_passports: number | null
          area_key: string
          area_type: string
          avg_score: number | null
          city: string | null
          computed_at: string
          id: string
          median_score: number | null
          neighborhood: string | null
          property_count: number | null
          recent_improvements: number | null
          street_name: string | null
          top_renovation_types: Json | null
        }
        Insert: {
          active_passports?: number | null
          area_key: string
          area_type?: string
          avg_score?: number | null
          city?: string | null
          computed_at?: string
          id?: string
          median_score?: number | null
          neighborhood?: string | null
          property_count?: number | null
          recent_improvements?: number | null
          street_name?: string | null
          top_renovation_types?: Json | null
        }
        Update: {
          active_passports?: number | null
          area_key?: string
          area_type?: string
          avg_score?: number | null
          city?: string | null
          computed_at?: string
          id?: string
          median_score?: number | null
          neighborhood?: string | null
          property_count?: number | null
          recent_improvements?: number | null
          street_name?: string | null
          top_renovation_types?: Json | null
        }
        Relationships: []
      }
      nexus_events: {
        Row: {
          created_at: string | null
          delta_score: number | null
          event_type: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          delta_score?: number | null
          event_type: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          delta_score?: number | null
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      nexus_levels: {
        Row: {
          badge_color: string | null
          created_at: string | null
          id: string
          level_name: string
          min_score: number | null
          perks_json: Json | null
          role: string
        }
        Insert: {
          badge_color?: string | null
          created_at?: string | null
          id?: string
          level_name: string
          min_score?: number | null
          perks_json?: Json | null
          role: string
        }
        Update: {
          badge_color?: string | null
          created_at?: string | null
          id?: string
          level_name?: string
          min_score?: number | null
          perks_json?: Json | null
          role?: string
        }
        Relationships: []
      }
      nexus_profiles: {
        Row: {
          breakdown_json: Json | null
          created_at: string | null
          global_score: number | null
          id: string
          is_active: boolean | null
          level: string | null
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          breakdown_json?: Json | null
          created_at?: string | null
          global_score?: number | null
          id?: string
          is_active?: boolean | null
          level?: string | null
          role?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          breakdown_json?: Json | null
          created_at?: string | null
          global_score?: number | null
          id?: string
          is_active?: boolean | null
          level?: string | null
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      nexus_signals: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          signal_type: string
          source: string | null
          user_id: string
          value: number | null
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          signal_type: string
          source?: string | null
          user_id: string
          value?: number | null
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          signal_type?: string
          source?: string | null
          user_id?: string
          value?: number | null
          weight?: number | null
        }
        Relationships: []
      }
      notification_digests: {
        Row: {
          channel: string
          created_at: string
          digest_type: string
          id: string
          notification_ids: string[]
          profile_id: string
          sent_at: string | null
          status: string
        }
        Insert: {
          channel?: string
          created_at?: string
          digest_type?: string
          id?: string
          notification_ids?: string[]
          profile_id: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          channel?: string
          created_at?: string
          digest_type?: string
          id?: string
          notification_ids?: string[]
          profile_id?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_digests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          channel: string
          created_at: string
          email_override: string | null
          id: string
          is_enabled: boolean
          notification_type: string
          phone_number: string | null
          profile_id: string
          updated_at: string
        }
        Insert: {
          channel?: string
          created_at?: string
          email_override?: string | null
          id?: string
          is_enabled?: boolean
          notification_type?: string
          phone_number?: string | null
          profile_id: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          email_override?: string | null
          id?: string
          is_enabled?: boolean
          notification_type?: string
          phone_number?: string | null
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          channel: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json
          profile_id: string | null
          read_at: string | null
          sms_sent_at: string | null
          sms_status: string | null
          status: string
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          channel?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          profile_id?: string | null
          read_at?: string | null
          sms_sent_at?: string | null
          sms_status?: string | null
          status?: string
          title: string
          type: string
        }
        Update: {
          body?: string | null
          channel?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          profile_id?: string | null
          read_at?: string | null
          sms_sent_at?: string | null
          sms_status?: string | null
          status?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_allocations: {
        Row: {
          allocation_mode: string | null
          allocation_score: number | null
          contractor_id: string
          conversion_result: string | null
          created_at: string | null
          id: string
          opportunity_id: string
          price_charged_cents: number | null
          responded_at: string | null
          status: string | null
        }
        Insert: {
          allocation_mode?: string | null
          allocation_score?: number | null
          contractor_id: string
          conversion_result?: string | null
          created_at?: string | null
          id?: string
          opportunity_id: string
          price_charged_cents?: number | null
          responded_at?: string | null
          status?: string | null
        }
        Update: {
          allocation_mode?: string | null
          allocation_score?: number | null
          contractor_id?: string
          conversion_result?: string | null
          created_at?: string | null
          id?: string
          opportunity_id?: string
          price_charged_cents?: number | null
          responded_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_allocations_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_allocations_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_allocations_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_allocations_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
          {
            foreignKeyName: "opportunity_allocations_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "market_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      optimization_actions: {
        Row: {
          action_type: string
          applied_at: string | null
          created_at: string
          id: string
          insight_id: string
          new_value: Json | null
          old_value: Json | null
          status: string
          target_placement_id: string | null
          target_rule_id: string | null
        }
        Insert: {
          action_type: string
          applied_at?: string | null
          created_at?: string
          id?: string
          insight_id: string
          new_value?: Json | null
          old_value?: Json | null
          status?: string
          target_placement_id?: string | null
          target_rule_id?: string | null
        }
        Update: {
          action_type?: string
          applied_at?: string | null
          created_at?: string
          id?: string
          insight_id?: string
          new_value?: Json | null
          old_value?: Json | null
          status?: string
          target_placement_id?: string | null
          target_rule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "optimization_actions_insight_id_fkey"
            columns: ["insight_id"]
            isOneToOne: false
            referencedRelation: "optimization_insights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optimization_actions_target_placement_id_fkey"
            columns: ["target_placement_id"]
            isOneToOne: false
            referencedRelation: "qr_placements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "optimization_actions_target_rule_id_fkey"
            columns: ["target_rule_id"]
            isOneToOne: false
            referencedRelation: "reward_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      optimization_insights: {
        Row: {
          city: string | null
          confidence_score: number
          created_at: string
          feature: string | null
          id: string
          insight_type: string
          metric_type: string
          metric_value: number
          placement_id: string | null
          role: string | null
        }
        Insert: {
          city?: string | null
          confidence_score?: number
          created_at?: string
          feature?: string | null
          id?: string
          insight_type: string
          metric_type: string
          metric_value?: number
          placement_id?: string | null
          role?: string | null
        }
        Update: {
          city?: string | null
          confidence_score?: number
          created_at?: string
          feature?: string | null
          id?: string
          insight_type?: string
          metric_type?: string
          metric_value?: number
          placement_id?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "optimization_insights_placement_id_fkey"
            columns: ["placement_id"]
            isOneToOne: false
            referencedRelation: "qr_placements"
            referencedColumns: ["id"]
          },
        ]
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
      placement_assets: {
        Row: {
          asset_type: string
          created_at: string
          file_url: string | null
          id: string
          metadata: Json | null
          placement_id: string
        }
        Insert: {
          asset_type: string
          created_at?: string
          file_url?: string | null
          id?: string
          metadata?: Json | null
          placement_id: string
        }
        Update: {
          asset_type?: string
          created_at?: string
          file_url?: string | null
          id?: string
          metadata?: Json | null
          placement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "placement_assets_placement_id_fkey"
            columns: ["placement_id"]
            isOneToOne: false
            referencedRelation: "qr_placements"
            referencedColumns: ["id"]
          },
        ]
      }
      placement_deep_links: {
        Row: {
          created_at: string
          deep_link_id: string | null
          id: string
          mode: string
          placement_id: string
        }
        Insert: {
          created_at?: string
          deep_link_id?: string | null
          id?: string
          mode?: string
          placement_id: string
        }
        Update: {
          created_at?: string
          deep_link_id?: string | null
          id?: string
          mode?: string
          placement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "placement_deep_links_deep_link_id_fkey"
            columns: ["deep_link_id"]
            isOneToOne: false
            referencedRelation: "deep_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placement_deep_links_placement_id_fkey"
            columns: ["placement_id"]
            isOneToOne: false
            referencedRelation: "qr_placements"
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
      platform_events: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event_category: string
          event_type: string
          id: string
          metadata: Json | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_category?: string
          event_type: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_category?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          user_id?: string | null
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
          {
            foreignKeyName: "portfolio_properties_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
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
      pricing_transactions: {
        Row: {
          amount_cents: number
          balance_after_cents: number | null
          contractor_id: string
          created_at: string
          description_fr: string | null
          id: string
          metadata: Json | null
          pricing_log_id: string | null
          request_id: string | null
          transaction_type: string
          wallet_id: string | null
        }
        Insert: {
          amount_cents: number
          balance_after_cents?: number | null
          contractor_id: string
          created_at?: string
          description_fr?: string | null
          id?: string
          metadata?: Json | null
          pricing_log_id?: string | null
          request_id?: string | null
          transaction_type: string
          wallet_id?: string | null
        }
        Update: {
          amount_cents?: number
          balance_after_cents?: number | null
          contractor_id?: string
          created_at?: string
          description_fr?: string | null
          id?: string
          metadata?: Json | null
          pricing_log_id?: string | null
          request_id?: string | null
          transaction_type?: string
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_transactions_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_transactions_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_transactions_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_transactions_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
          {
            foreignKeyName: "pricing_transactions_pricing_log_id_fkey"
            columns: ["pricing_log_id"]
            isOneToOne: false
            referencedRelation: "dynamic_pricing_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_transactions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "emergency_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "contractor_wallet"
            referencedColumns: ["id"]
          },
        ]
      }
      problem_causes: {
        Row: {
          created_at: string | null
          description_fr: string | null
          id: string
          name_fr: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          description_fr?: string | null
          id?: string
          name_fr: string
          slug: string
        }
        Update: {
          created_at?: string | null
          description_fr?: string | null
          id?: string
          name_fr?: string
          slug?: string
        }
        Relationships: []
      }
      problem_geo_targets: {
        Row: {
          created_at: string | null
          demand_score: number | null
          geo_area_id: string
          id: string
          is_enabled: boolean | null
          priority_score: number | null
          problem_id: string
        }
        Insert: {
          created_at?: string | null
          demand_score?: number | null
          geo_area_id: string
          id?: string
          is_enabled?: boolean | null
          priority_score?: number | null
          problem_id: string
        }
        Update: {
          created_at?: string | null
          demand_score?: number | null
          geo_area_id?: string
          id?: string
          is_enabled?: boolean | null
          priority_score?: number | null
          problem_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "problem_geo_targets_geo_area_id_fkey"
            columns: ["geo_area_id"]
            isOneToOne: false
            referencedRelation: "geo_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "problem_geo_targets_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "home_problems"
            referencedColumns: ["id"]
          },
        ]
      }
      problem_professionals: {
        Row: {
          created_at: string | null
          id: string
          problem_id: string
          profession_id: string
          recommended_order: number | null
          relevance_score: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          problem_id: string
          profession_id: string
          recommended_order?: number | null
          relevance_score?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          problem_id?: string
          profession_id?: string
          recommended_order?: number | null
          relevance_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "problem_professionals_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "home_problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "problem_professionals_profession_id_fkey"
            columns: ["profession_id"]
            isOneToOne: false
            referencedRelation: "home_professions"
            referencedColumns: ["id"]
          },
        ]
      }
      problem_symptoms: {
        Row: {
          created_at: string | null
          description_fr: string | null
          id: string
          name_fr: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          description_fr?: string | null
          id?: string
          name_fr: string
          slug: string
        }
        Update: {
          created_at?: string | null
          description_fr?: string | null
          id?: string
          name_fr?: string
          slug?: string
        }
        Relationships: []
      }
      problem_value_tags: {
        Row: {
          created_at: string | null
          id: string
          problem_id: string
          value_tag_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          problem_id: string
          value_tag_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          problem_id?: string
          value_tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "problem_value_tags_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "home_problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "problem_value_tags_value_tag_id_fkey"
            columns: ["value_tag_id"]
            isOneToOne: false
            referencedRelation: "value_tags"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "profile_alignment_answers_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
          {
            foreignKeyName: "profile_alignment_answers_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_alignment_answers_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
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
          address_line_1: string | null
          affiliate_code: string | null
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          invited_by_user_id: string | null
          language: string | null
          last_name: string | null
          onboarding_completed: boolean | null
          phone: string | null
          postal_code: string | null
          province: string | null
          referral_code: string | null
          salutation: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type?: string | null
          address_line_1?: string | null
          affiliate_code?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          invited_by_user_id?: string | null
          language?: string | null
          last_name?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          referral_code?: string | null
          salutation?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: string | null
          address_line_1?: string | null
          affiliate_code?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          invited_by_user_id?: string | null
          language?: string | null
          last_name?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          referral_code?: string | null
          salutation?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_briefs: {
        Row: {
          brief_json: Json
          created_at: string
          design_project_id: string
          id: string
          ready_for_matching: boolean
          selected_version_id: string | null
          user_id: string
        }
        Insert: {
          brief_json?: Json
          created_at?: string
          design_project_id: string
          id?: string
          ready_for_matching?: boolean
          selected_version_id?: string | null
          user_id: string
        }
        Update: {
          brief_json?: Json
          created_at?: string
          design_project_id?: string
          id?: string
          ready_for_matching?: boolean
          selected_version_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_briefs_design_project_id_fkey"
            columns: ["design_project_id"]
            isOneToOne: false
            referencedRelation: "design_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_briefs_selected_version_id_fkey"
            columns: ["selected_version_id"]
            isOneToOne: false
            referencedRelation: "design_versions"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "project_context_snapshots_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
            referencedColumns: ["id"]
          },
        ]
      }
      project_likes: {
        Row: {
          created_at: string | null
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_likes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "renovation_projects"
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
            foreignKeyName: "project_matches_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
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
      project_saves: {
        Row: {
          created_at: string | null
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_saves_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "renovation_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_team_members: {
        Row: {
          accepted_at: string | null
          contractor_id: string
          created_at: string | null
          id: string
          role_label: string
          scope_slugs: string[] | null
          status: string | null
          team_id: string
        }
        Insert: {
          accepted_at?: string | null
          contractor_id: string
          created_at?: string | null
          id?: string
          role_label: string
          scope_slugs?: string[] | null
          status?: string | null
          team_id: string
        }
        Update: {
          accepted_at?: string | null
          contractor_id?: string
          created_at?: string | null
          id?: string
          role_label?: string
          scope_slugs?: string[] | null
          status?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_team_members_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_team_members_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_team_members_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_team_members_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
          {
            foreignKeyName: "project_team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "project_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      project_teams: {
        Row: {
          appointment_id: string | null
          compatibility_score: number | null
          confidence_score: number | null
          created_at: string | null
          id: string
          lead_contractor_id: string
          project_id: string | null
          status: string | null
          team_name: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          compatibility_score?: number | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          lead_contractor_id: string
          project_id?: string | null
          status?: string | null
          team_name?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          compatibility_score?: number | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          lead_contractor_id?: string
          project_id?: string | null
          status?: string | null
          team_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_teams_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_teams_lead_contractor_id_fkey"
            columns: ["lead_contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_teams_lead_contractor_id_fkey"
            columns: ["lead_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_teams_lead_contractor_id_fkey"
            columns: ["lead_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_teams_lead_contractor_id_fkey"
            columns: ["lead_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      project_votes: {
        Row: {
          concept_id: string
          created_at: string | null
          id: string
          project_id: string
          voter_fingerprint: string | null
          voter_id: string | null
        }
        Insert: {
          concept_id: string
          created_at?: string | null
          id?: string
          project_id: string
          voter_fingerprint?: string | null
          voter_id?: string | null
        }
        Update: {
          concept_id?: string
          created_at?: string | null
          id?: string
          project_id?: string
          voter_fingerprint?: string | null
          voter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_votes_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "renovation_concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_votes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "renovation_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_work_taxonomy: {
        Row: {
          contractor_professions: string[] | null
          homeowner_examples: string[] | null
          label_en: string | null
          label_fr: string
          parent_slug: string | null
          seo_keywords: string[] | null
          slug: string
        }
        Insert: {
          contractor_professions?: string[] | null
          homeowner_examples?: string[] | null
          label_en?: string | null
          label_fr: string
          parent_slug?: string | null
          seo_keywords?: string[] | null
          slug: string
        }
        Update: {
          contractor_professions?: string[] | null
          homeowner_examples?: string[] | null
          label_en?: string | null
          label_fr?: string
          parent_slug?: string | null
          seo_keywords?: string[] | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_work_taxonomy_parent_slug_fkey"
            columns: ["parent_slug"]
            isOneToOne: false
            referencedRelation: "project_work_taxonomy"
            referencedColumns: ["slug"]
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
          matching_status: string | null
          photo_urls: string[] | null
          preferred_contact: string | null
          property_id: string
          status: string
          subcategory: string | null
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
          matching_status?: string | null
          photo_urls?: string[] | null
          preferred_contact?: string | null
          property_id: string
          status?: string
          subcategory?: string | null
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
          matching_status?: string | null
          photo_urls?: string[] | null
          preferred_contact?: string | null
          property_id?: string
          status?: string
          subcategory?: string | null
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
          {
            foreignKeyName: "projects_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
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
          certification_status: string | null
          city: string | null
          claim_status: string | null
          claimed_at: string | null
          claimed_by: string | null
          condition: Database["public"]["Enums"]["property_condition"] | null
          country: string | null
          created_at: string
          estimated_score: number | null
          full_address: string | null
          id: string
          latitude: number | null
          listing_import_id: string | null
          longitude: number | null
          lot_size: number | null
          neighborhood: string | null
          normalized_address: string | null
          photo_url: string | null
          postal_code: string | null
          property_type: string | null
          province: string | null
          public_status: string | null
          slug: string | null
          square_footage: number | null
          street_name: string | null
          street_number: string | null
          unit: string | null
          updated_at: string
          user_id: string
          year_built: number | null
        }
        Insert: {
          address: string
          certification_status?: string | null
          city?: string | null
          claim_status?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          condition?: Database["public"]["Enums"]["property_condition"] | null
          country?: string | null
          created_at?: string
          estimated_score?: number | null
          full_address?: string | null
          id?: string
          latitude?: number | null
          listing_import_id?: string | null
          longitude?: number | null
          lot_size?: number | null
          neighborhood?: string | null
          normalized_address?: string | null
          photo_url?: string | null
          postal_code?: string | null
          property_type?: string | null
          province?: string | null
          public_status?: string | null
          slug?: string | null
          square_footage?: number | null
          street_name?: string | null
          street_number?: string | null
          unit?: string | null
          updated_at?: string
          user_id: string
          year_built?: number | null
        }
        Update: {
          address?: string
          certification_status?: string | null
          city?: string | null
          claim_status?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          condition?: Database["public"]["Enums"]["property_condition"] | null
          country?: string | null
          created_at?: string
          estimated_score?: number | null
          full_address?: string | null
          id?: string
          latitude?: number | null
          listing_import_id?: string | null
          longitude?: number | null
          lot_size?: number | null
          neighborhood?: string | null
          normalized_address?: string | null
          photo_url?: string | null
          postal_code?: string | null
          property_type?: string | null
          province?: string | null
          public_status?: string | null
          slug?: string | null
          square_footage?: number | null
          street_name?: string | null
          street_number?: string | null
          unit?: string | null
          updated_at?: string
          user_id?: string
          year_built?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_listing_import_id_fkey"
            columns: ["listing_import_id"]
            isOneToOne: false
            referencedRelation: "listing_imports"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "property_ai_extractions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
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
          {
            foreignKeyName: "property_aliases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
            referencedColumns: ["id"]
          },
        ]
      }
      property_claims: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          property_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
          verification_code: string | null
          verification_data: Json | null
          verification_method: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          property_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
          verification_code?: string | null
          verification_data?: Json | null
          verification_method?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          property_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          verification_code?: string | null
          verification_data?: Json | null
          verification_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_claims_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_claims_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
            referencedColumns: ["id"]
          },
        ]
      }
      property_completion_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          description_fr: string | null
          dismissed_at: string | null
          estimated_minutes: number | null
          field_key: string | null
          id: string
          points: number | null
          priority: number | null
          property_id: string
          section_key: string
          status: string
          task_key: string
          title_fr: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description_fr?: string | null
          dismissed_at?: string | null
          estimated_minutes?: number | null
          field_key?: string | null
          id?: string
          points?: number | null
          priority?: number | null
          property_id: string
          section_key: string
          status?: string
          task_key: string
          title_fr: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description_fr?: string | null
          dismissed_at?: string | null
          estimated_minutes?: number | null
          field_key?: string | null
          id?: string
          points?: number | null
          priority?: number | null
          property_id?: string
          section_key?: string
          status?: string
          task_key?: string
          title_fr?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_completion_tasks_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_completion_tasks_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
            referencedColumns: ["id"]
          },
        ]
      }
      property_documents: {
        Row: {
          created_at: string
          document_type: string
          extracted_json: Json | null
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
          extracted_json?: Json | null
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
          extracted_json?: Json | null
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
          {
            foreignKeyName: "property_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
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
            foreignKeyName: "property_events_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
          {
            foreignKeyName: "property_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
            referencedColumns: ["id"]
          },
        ]
      }
      property_grant_eligibility: {
        Row: {
          answers: Json | null
          computed_at: string
          confidence_score: number | null
          created_at: string
          eligibility_status: string
          estimated_amount: number | null
          id: string
          missing_fields: string[] | null
          notes: string | null
          program_id: string
          property_id: string
          recommendation_fr: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json | null
          computed_at?: string
          confidence_score?: number | null
          created_at?: string
          eligibility_status?: string
          estimated_amount?: number | null
          id?: string
          missing_fields?: string[] | null
          notes?: string | null
          program_id: string
          property_id: string
          recommendation_fr?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json | null
          computed_at?: string
          confidence_score?: number | null
          created_at?: string
          eligibility_status?: string
          estimated_amount?: number | null
          id?: string
          missing_fields?: string[] | null
          notes?: string | null
          program_id?: string
          property_id?: string
          recommendation_fr?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_grant_eligibility_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "grant_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_grant_eligibility_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_grant_eligibility_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
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
          {
            foreignKeyName: "property_insights_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
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
          {
            foreignKeyName: "property_master_records_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "v_property_map_markers"
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
          {
            foreignKeyName: "property_members_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
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
            foreignKeyName: "property_merge_candidates_property_a_id_fkey"
            columns: ["property_a_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_merge_candidates_property_b_id_fkey"
            columns: ["property_b_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_merge_candidates_property_b_id_fkey"
            columns: ["property_b_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
            referencedColumns: ["id"]
          },
        ]
      }
      property_passport_sections: {
        Row: {
          completion_pct: number | null
          id: string
          property_id: string
          section_data: Json | null
          section_key: string
          updated_at: string
        }
        Insert: {
          completion_pct?: number | null
          id?: string
          property_id: string
          section_data?: Json | null
          section_key: string
          updated_at?: string
        }
        Update: {
          completion_pct?: number | null
          id?: string
          property_id?: string
          section_data?: Json | null
          section_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_passport_sections_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_passport_sections_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
            referencedColumns: ["id"]
          },
        ]
      }
      property_predictions: {
        Row: {
          category: string | null
          cost_max: number | null
          cost_min: number | null
          cost_unit: string | null
          created_at: string
          explanation_fr: string | null
          generated_at: string
          id: string
          is_active: boolean | null
          predicted_year: number | null
          prediction_type: string
          probability_score: number | null
          property_id: string
          source_confidence: string | null
          title_fr: string
          urgency: string | null
        }
        Insert: {
          category?: string | null
          cost_max?: number | null
          cost_min?: number | null
          cost_unit?: string | null
          created_at?: string
          explanation_fr?: string | null
          generated_at?: string
          id?: string
          is_active?: boolean | null
          predicted_year?: number | null
          prediction_type: string
          probability_score?: number | null
          property_id: string
          source_confidence?: string | null
          title_fr: string
          urgency?: string | null
        }
        Update: {
          category?: string | null
          cost_max?: number | null
          cost_min?: number | null
          cost_unit?: string | null
          created_at?: string
          explanation_fr?: string | null
          generated_at?: string
          id?: string
          is_active?: boolean | null
          predicted_year?: number | null
          prediction_type?: string
          probability_score?: number | null
          property_id?: string
          source_confidence?: string | null
          title_fr?: string
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_predictions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_predictions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
            referencedColumns: ["id"]
          },
        ]
      }
      property_qr_codes: {
        Row: {
          contractor_id: string | null
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          label: string | null
          project_id: string | null
          property_id: string
          public_city: string | null
          public_project_type: string | null
          public_status: string | null
          qr_type: Database["public"]["Enums"]["qr_type"]
          token: string
          updated_at: string
        }
        Insert: {
          contractor_id?: string | null
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          project_id?: string | null
          property_id: string
          public_city?: string | null
          public_project_type?: string | null
          public_status?: string | null
          qr_type: Database["public"]["Enums"]["qr_type"]
          token?: string
          updated_at?: string
        }
        Update: {
          contractor_id?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          project_id?: string | null
          property_id?: string
          public_city?: string | null
          public_project_type?: string | null
          public_status?: string | null
          qr_type?: Database["public"]["Enums"]["qr_type"]
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_qr_codes_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_qr_codes_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_qr_codes_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_qr_codes_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
          {
            foreignKeyName: "property_qr_codes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_qr_codes_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_qr_codes_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
            referencedColumns: ["id"]
          },
        ]
      }
      property_recommendations: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          estimated_cost_max: number | null
          estimated_cost_min: number | null
          id: string
          priority: string | null
          property_id: string
          reasoning: Json | null
          recommended_profession: string | null
          recommended_timeline: string | null
          source: string | null
          source_ref: string | null
          title: string
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          estimated_cost_max?: number | null
          estimated_cost_min?: number | null
          id?: string
          priority?: string | null
          property_id: string
          reasoning?: Json | null
          recommended_profession?: string | null
          recommended_timeline?: string | null
          source?: string | null
          source_ref?: string | null
          title: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          estimated_cost_max?: number | null
          estimated_cost_min?: number | null
          id?: string
          priority?: string | null
          property_id?: string
          reasoning?: Json | null
          recommended_profession?: string | null
          recommended_timeline?: string | null
          source?: string | null
          source_ref?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_recommendations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_recommendations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
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
          source: string | null
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
          source?: string | null
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
          source?: string | null
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
          {
            foreignKeyName: "property_scores_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
            referencedColumns: ["id"]
          },
        ]
      }
      property_shares: {
        Row: {
          accepted_at: string | null
          id: string
          invited_at: string
          owner_user_id: string
          property_id: string
          role: string
          shared_with_email: string
          shared_with_user_id: string | null
          status: string
        }
        Insert: {
          accepted_at?: string | null
          id?: string
          invited_at?: string
          owner_user_id: string
          property_id: string
          role?: string
          shared_with_email: string
          shared_with_user_id?: string | null
          status?: string
        }
        Update: {
          accepted_at?: string | null
          id?: string
          invited_at?: string
          owner_user_id?: string
          property_id?: string
          role?: string
          shared_with_email?: string
          shared_with_user_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_shares_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_shares_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
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
          {
            foreignKeyName: "property_source_links_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_bookings: {
        Row: {
          booked_at: string | null
          category: string | null
          city: string | null
          company: string | null
          contractor_id: string | null
          email: string | null
          id: string
          name: string | null
          notes: string | null
          phone: string | null
          preferred_time: string | null
          project_type: string | null
          source: string | null
          status: string | null
        }
        Insert: {
          booked_at?: string | null
          category?: string | null
          city?: string | null
          company?: string | null
          contractor_id?: string | null
          email?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          phone?: string | null
          preferred_time?: string | null
          project_type?: string | null
          source?: string | null
          status?: string | null
        }
        Update: {
          booked_at?: string | null
          category?: string | null
          city?: string | null
          company?: string | null
          contractor_id?: string | null
          email?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          phone?: string | null
          preferred_time?: string | null
          project_type?: string | null
          source?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospect_bookings_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors_prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_email_campaigns: {
        Row: {
          body_html: string | null
          body_text: string | null
          bounced: boolean | null
          campaign_name: string | null
          click_count: number | null
          contractor_id: string
          created_at: string
          from_email: string | null
          from_name: string | null
          id: string
          open_count: number | null
          replied: boolean | null
          sent_at: string | null
          subject: string | null
          tracking_id: string | null
        }
        Insert: {
          body_html?: string | null
          body_text?: string | null
          bounced?: boolean | null
          campaign_name?: string | null
          click_count?: number | null
          contractor_id: string
          created_at?: string
          from_email?: string | null
          from_name?: string | null
          id?: string
          open_count?: number | null
          replied?: boolean | null
          sent_at?: string | null
          subject?: string | null
          tracking_id?: string | null
        }
        Update: {
          body_html?: string | null
          body_text?: string | null
          bounced?: boolean | null
          campaign_name?: string | null
          click_count?: number | null
          contractor_id?: string
          created_at?: string
          from_email?: string | null
          from_name?: string | null
          id?: string
          open_count?: number | null
          replied?: boolean | null
          sent_at?: string | null
          subject?: string | null
          tracking_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospect_email_campaigns_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors_prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_email_events: {
        Row: {
          campaign_id: string | null
          contractor_id: string | null
          created_at: string
          event_meta: Json | null
          event_type: string
          id: string
        }
        Insert: {
          campaign_id?: string | null
          contractor_id?: string | null
          created_at?: string
          event_meta?: Json | null
          event_type: string
          id?: string
        }
        Update: {
          campaign_id?: string | null
          contractor_id?: string | null
          created_at?: string
          event_meta?: Json | null
          event_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_email_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "prospect_email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_email_events_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors_prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_import_jobs: {
        Row: {
          errors: Json | null
          failed_count: number | null
          file_name: string | null
          finished_at: string | null
          id: string
          imported_count: number | null
          row_count: number | null
          started_at: string | null
          status: string | null
          storage_path: string | null
        }
        Insert: {
          errors?: Json | null
          failed_count?: number | null
          file_name?: string | null
          finished_at?: string | null
          id?: string
          imported_count?: number | null
          row_count?: number | null
          started_at?: string | null
          status?: string | null
          storage_path?: string | null
        }
        Update: {
          errors?: Json | null
          failed_count?: number | null
          file_name?: string | null
          finished_at?: string | null
          id?: string
          imported_count?: number | null
          row_count?: number | null
          started_at?: string | null
          status?: string | null
          storage_path?: string | null
        }
        Relationships: []
      }
      prospect_loom_jobs: {
        Row: {
          contractor_id: string | null
          created_at: string | null
          finished_at: string | null
          id: string
          personalized_intro: string | null
          screenshot_url: string | null
          script: string | null
          status: string | null
          thumbnail_url: string | null
          video_url: string | null
        }
        Insert: {
          contractor_id?: string | null
          created_at?: string | null
          finished_at?: string | null
          id?: string
          personalized_intro?: string | null
          screenshot_url?: string | null
          script?: string | null
          status?: string | null
          thumbnail_url?: string | null
          video_url?: string | null
        }
        Update: {
          contractor_id?: string | null
          created_at?: string | null
          finished_at?: string | null
          id?: string
          personalized_intro?: string | null
          screenshot_url?: string | null
          script?: string | null
          status?: string | null
          thumbnail_url?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospect_loom_jobs_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors_prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_scraper_jobs: {
        Row: {
          category: string | null
          city: string | null
          created_at: string | null
          finished_at: string | null
          id: string
          logs: Json | null
          query: string | null
          source: string | null
          status: string | null
          total_found: number | null
          total_inserted: number | null
        }
        Insert: {
          category?: string | null
          city?: string | null
          created_at?: string | null
          finished_at?: string | null
          id?: string
          logs?: Json | null
          query?: string | null
          source?: string | null
          status?: string | null
          total_found?: number | null
          total_inserted?: number | null
        }
        Update: {
          category?: string | null
          city?: string | null
          created_at?: string | null
          finished_at?: string | null
          id?: string
          logs?: Json | null
          query?: string | null
          source?: string | null
          status?: string | null
          total_found?: number | null
          total_inserted?: number | null
        }
        Relationships: []
      }
      prospect_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      qr_bundle_cards: {
        Row: {
          bundle_id: string
          card_order: number
          created_at: string
          cta_text: string
          deep_link_code: string | null
          description: string | null
          feature: string
          gradient: string | null
          headline: string
          icon: string | null
          id: string
          sub_feature: string | null
        }
        Insert: {
          bundle_id: string
          card_order?: number
          created_at?: string
          cta_text?: string
          deep_link_code?: string | null
          description?: string | null
          feature: string
          gradient?: string | null
          headline: string
          icon?: string | null
          id?: string
          sub_feature?: string | null
        }
        Update: {
          bundle_id?: string
          card_order?: number
          created_at?: string
          cta_text?: string
          deep_link_code?: string | null
          description?: string | null
          feature?: string
          gradient?: string | null
          headline?: string
          icon?: string | null
          id?: string
          sub_feature?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_bundle_cards_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "qr_bundle_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_bundle_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          owner_role: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          owner_role?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          owner_role?: string
        }
        Relationships: []
      }
      qr_conversions: {
        Row: {
          conversion_type: string
          converted_at: string | null
          converted_user_id: string | null
          id: string
          intent_slug: string
          metadata: Json | null
          referrer_user_id: string | null
          scan_id: string | null
        }
        Insert: {
          conversion_type: string
          converted_at?: string | null
          converted_user_id?: string | null
          id?: string
          intent_slug: string
          metadata?: Json | null
          referrer_user_id?: string | null
          scan_id?: string | null
        }
        Update: {
          conversion_type?: string
          converted_at?: string | null
          converted_user_id?: string | null
          id?: string
          intent_slug?: string
          metadata?: Json | null
          referrer_user_id?: string | null
          scan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_conversions_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "qr_scans"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_intents: {
        Row: {
          badge_text: string | null
          copy_variants: Json | null
          created_at: string | null
          cta_en: string | null
          cta_fr: string | null
          destination_path: string
          display_order: number | null
          gradient_class: string | null
          icon_name: string | null
          id: string
          intent_slug: string
          is_active: boolean | null
          is_restricted: boolean | null
          label_en: string | null
          label_fr: string
          limit_total: number | null
          role_target: string | null
          style_preset: string | null
          subtitle_en: string | null
          subtitle_fr: string | null
          updated_at: string | null
        }
        Insert: {
          badge_text?: string | null
          copy_variants?: Json | null
          created_at?: string | null
          cta_en?: string | null
          cta_fr?: string | null
          destination_path?: string
          display_order?: number | null
          gradient_class?: string | null
          icon_name?: string | null
          id?: string
          intent_slug: string
          is_active?: boolean | null
          is_restricted?: boolean | null
          label_en?: string | null
          label_fr: string
          limit_total?: number | null
          role_target?: string | null
          style_preset?: string | null
          subtitle_en?: string | null
          subtitle_fr?: string | null
          updated_at?: string | null
        }
        Update: {
          badge_text?: string | null
          copy_variants?: Json | null
          created_at?: string | null
          cta_en?: string | null
          cta_fr?: string | null
          destination_path?: string
          display_order?: number | null
          gradient_class?: string | null
          icon_name?: string | null
          id?: string
          intent_slug?: string
          is_active?: boolean | null
          is_restricted?: boolean | null
          label_en?: string | null
          label_fr?: string
          limit_total?: number | null
          role_target?: string | null
          style_preset?: string | null
          subtitle_en?: string | null
          subtitle_fr?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      qr_placements: {
        Row: {
          campaign_id: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          owner_user_id: string
          placement_type: string
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          owner_user_id: string
          placement_type: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          owner_user_id?: string
          placement_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      qr_scan_events: {
        Row: {
          created_at: string
          id: string
          ip_hash: string | null
          qr_code_id: string
          scan_context: string | null
          scanned_by: string | null
          scanner_role: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_hash?: string | null
          qr_code_id: string
          scan_context?: string | null
          scanned_by?: string | null
          scanner_role?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_hash?: string | null
          qr_code_id?: string
          scan_context?: string | null
          scanned_by?: string | null
          scanner_role?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_scan_events_qr_code_id_fkey"
            columns: ["qr_code_id"]
            isOneToOne: false
            referencedRelation: "property_qr_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_scans: {
        Row: {
          id: string
          intent_slug: string
          ip_hash: string | null
          link_id: string | null
          medium: string | null
          referrer_user_id: string | null
          scanned_at: string | null
          session_id: string | null
          source: string | null
          user_agent: string | null
          variant: string | null
        }
        Insert: {
          id?: string
          intent_slug: string
          ip_hash?: string | null
          link_id?: string | null
          medium?: string | null
          referrer_user_id?: string | null
          scanned_at?: string | null
          session_id?: string | null
          source?: string | null
          user_agent?: string | null
          variant?: string | null
        }
        Update: {
          id?: string
          intent_slug?: string
          ip_hash?: string | null
          link_id?: string | null
          medium?: string | null
          referrer_user_id?: string | null
          scanned_at?: string | null
          session_id?: string | null
          source?: string | null
          user_agent?: string | null
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_scans_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "qr_user_links"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_user_links: {
        Row: {
          created_at: string | null
          destination_url: string
          id: string
          intent_slug: string
          is_active: boolean | null
          short_code: string
          user_id: string
          variant: string | null
        }
        Insert: {
          created_at?: string | null
          destination_url: string
          id?: string
          intent_slug: string
          is_active?: boolean | null
          short_code?: string
          user_id: string
          variant?: string | null
        }
        Update: {
          created_at?: string | null
          destination_url?: string
          id?: string
          intent_slug?: string
          is_active?: boolean | null
          short_code?: string
          user_id?: string
          variant?: string | null
        }
        Relationships: []
      }
      qualified_conversions: {
        Row: {
          conversion_type: string
          created_at: string
          deep_link_id: string | null
          id: string
          invited_user_id: string | null
          inviter_user_id: string | null
          is_qualified: boolean
          qualified_at: string | null
        }
        Insert: {
          conversion_type: string
          created_at?: string
          deep_link_id?: string | null
          id?: string
          invited_user_id?: string | null
          inviter_user_id?: string | null
          is_qualified?: boolean
          qualified_at?: string | null
        }
        Update: {
          conversion_type?: string
          created_at?: string
          deep_link_id?: string | null
          id?: string
          invited_user_id?: string | null
          inviter_user_id?: string | null
          is_qualified?: boolean
          qualified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qualified_conversions_deep_link_id_fkey"
            columns: ["deep_link_id"]
            isOneToOne: false
            referencedRelation: "deep_links"
            referencedColumns: ["id"]
          },
        ]
      }
      question_problem_links: {
        Row: {
          created_at: string | null
          id: string
          problem_id: string
          question_id: string
          relevance_score: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          problem_id: string
          question_id: string
          relevance_score?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          problem_id?: string
          question_id?: string
          relevance_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "question_problem_links_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "home_problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_problem_links_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "homeowner_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      question_solution_links: {
        Row: {
          created_at: string | null
          id: string
          question_id: string
          relevance_score: number | null
          solution_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          question_id: string
          relevance_score?: number | null
          solution_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          question_id?: string
          relevance_score?: number | null
          solution_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_solution_links_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "homeowner_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_solution_links_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "home_solutions"
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
            foreignKeyName: "quotes_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
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
          {
            foreignKeyName: "quotes_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
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
      rbq_license_subcategories: {
        Row: {
          annex: string | null
          category_type: Database["public"]["Enums"]["rbq_category_type"] | null
          code: string
          is_active: boolean
          official_description_fr: string | null
          official_name_fr: string
          simplified_label_fr: string | null
          updated_at: string
        }
        Insert: {
          annex?: string | null
          category_type?:
            | Database["public"]["Enums"]["rbq_category_type"]
            | null
          code: string
          is_active?: boolean
          official_description_fr?: string | null
          official_name_fr: string
          simplified_label_fr?: string | null
          updated_at?: string
        }
        Update: {
          annex?: string | null
          category_type?:
            | Database["public"]["Enums"]["rbq_category_type"]
            | null
          code?: string
          is_active?: boolean
          official_description_fr?: string | null
          official_name_fr?: string
          simplified_label_fr?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rbq_license_work_types: {
        Row: {
          compatibility_level:
            | Database["public"]["Enums"]["compatibility_result"]
            | null
          id: string
          notes_fr: string | null
          rbq_code: string
          sort_order: number | null
          work_label_en: string | null
          work_label_fr: string
          work_slug: string
        }
        Insert: {
          compatibility_level?:
            | Database["public"]["Enums"]["compatibility_result"]
            | null
          id?: string
          notes_fr?: string | null
          rbq_code: string
          sort_order?: number | null
          work_label_en?: string | null
          work_label_fr: string
          work_slug: string
        }
        Update: {
          compatibility_level?:
            | Database["public"]["Enums"]["compatibility_result"]
            | null
          id?: string
          notes_fr?: string | null
          rbq_code?: string
          sort_order?: number | null
          work_label_en?: string | null
          work_label_fr?: string
          work_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "rbq_license_work_types_rbq_code_fkey"
            columns: ["rbq_code"]
            isOneToOne: false
            referencedRelation: "rbq_license_subcategories"
            referencedColumns: ["code"]
          },
        ]
      }
      rbq_project_compatibility_rules: {
        Row: {
          confidence_score: number | null
          explanation_en: string | null
          explanation_fr: string | null
          id: string
          project_work_slug: string
          rbq_code: string
          result: Database["public"]["Enums"]["compatibility_result"]
        }
        Insert: {
          confidence_score?: number | null
          explanation_en?: string | null
          explanation_fr?: string | null
          id?: string
          project_work_slug: string
          rbq_code: string
          result?: Database["public"]["Enums"]["compatibility_result"]
        }
        Update: {
          confidence_score?: number | null
          explanation_en?: string | null
          explanation_fr?: string | null
          id?: string
          project_work_slug?: string
          rbq_code?: string
          result?: Database["public"]["Enums"]["compatibility_result"]
        }
        Relationships: [
          {
            foreignKeyName: "rbq_project_compatibility_rules_project_work_slug_fkey"
            columns: ["project_work_slug"]
            isOneToOne: false
            referencedRelation: "project_work_taxonomy"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "rbq_project_compatibility_rules_rbq_code_fkey"
            columns: ["rbq_code"]
            isOneToOne: false
            referencedRelation: "rbq_license_subcategories"
            referencedColumns: ["code"]
          },
        ]
      }
      referral_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip_hash: string | null
          metadata: Json | null
          referral_code: string
          referrer_user_id: string | null
          role: string | null
          target_type: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          referral_code: string
          referrer_user_id?: string | null
          role?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          referral_code?: string
          referrer_user_id?: string | null
          role?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      referral_progress: {
        Row: {
          current_count: number
          id: string
          milestone_key: string
          target_count: number
          unlocked: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          current_count?: number
          id?: string
          milestone_key: string
          target_count: number
          unlocked?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          current_count?: number
          id?: string
          milestone_key?: string
          target_count?: number
          unlocked?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_rewards: {
        Row: {
          claimed_at: string | null
          created_at: string | null
          description_fr: string | null
          id: string
          is_claimed: boolean | null
          label_fr: string
          metadata: Json | null
          reward_level: string
          reward_type: string
          trigger_count: number
          user_id: string
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string | null
          description_fr?: string | null
          id?: string
          is_claimed?: boolean | null
          label_fr: string
          metadata?: Json | null
          reward_level: string
          reward_type: string
          trigger_count: number
          user_id: string
        }
        Update: {
          claimed_at?: string | null
          created_at?: string | null
          description_fr?: string | null
          id?: string
          is_claimed?: boolean | null
          label_fr?: string
          metadata?: Json | null
          reward_level?: string
          reward_type?: string
          trigger_count?: number
          user_id?: string
        }
        Relationships: []
      }
      refusal_seo_pages: {
        Row: {
          city_name: string | null
          city_slug: string | null
          conversions: number
          correct_solution: string | null
          cost_estimate_max: number | null
          cost_estimate_min: number | null
          cost_unit: string | null
          created_at: string
          demand_score: number | null
          faq_json: Json | null
          h1: string
          id: string
          internal_links_json: Json | null
          json_ld: Json | null
          material: string | null
          materials_detail: string | null
          meta_description: string
          meta_title: string
          page_type: string
          problem_explanation: string | null
          problem_slug: string | null
          profession_slug: string | null
          published_at: string | null
          recommended_professional: string | null
          signal_count: number
          slug: string
          solution_slug: string | null
          source_signal_ids: string[] | null
          status: string
          structure_context: string | null
          structure_type: string | null
          updated_at: string
          views: number
          why_contractors_refuse: string | null
        }
        Insert: {
          city_name?: string | null
          city_slug?: string | null
          conversions?: number
          correct_solution?: string | null
          cost_estimate_max?: number | null
          cost_estimate_min?: number | null
          cost_unit?: string | null
          created_at?: string
          demand_score?: number | null
          faq_json?: Json | null
          h1: string
          id?: string
          internal_links_json?: Json | null
          json_ld?: Json | null
          material?: string | null
          materials_detail?: string | null
          meta_description: string
          meta_title: string
          page_type?: string
          problem_explanation?: string | null
          problem_slug?: string | null
          profession_slug?: string | null
          published_at?: string | null
          recommended_professional?: string | null
          signal_count?: number
          slug: string
          solution_slug?: string | null
          source_signal_ids?: string[] | null
          status?: string
          structure_context?: string | null
          structure_type?: string | null
          updated_at?: string
          views?: number
          why_contractors_refuse?: string | null
        }
        Update: {
          city_name?: string | null
          city_slug?: string | null
          conversions?: number
          correct_solution?: string | null
          cost_estimate_max?: number | null
          cost_estimate_min?: number | null
          cost_unit?: string | null
          created_at?: string
          demand_score?: number | null
          faq_json?: Json | null
          h1?: string
          id?: string
          internal_links_json?: Json | null
          json_ld?: Json | null
          material?: string | null
          materials_detail?: string | null
          meta_description?: string
          meta_title?: string
          page_type?: string
          problem_explanation?: string | null
          problem_slug?: string | null
          profession_slug?: string | null
          published_at?: string | null
          recommended_professional?: string | null
          signal_count?: number
          slug?: string
          solution_slug?: string | null
          source_signal_ids?: string[] | null
          status?: string
          structure_context?: string | null
          structure_type?: string | null
          updated_at?: string
          views?: number
          why_contractors_refuse?: string | null
        }
        Relationships: []
      }
      renovation_concepts: {
        Row: {
          concept_type: string
          created_at: string | null
          description: string | null
          display_order: number | null
          estimated_budget_max: number | null
          estimated_budget_min: number | null
          id: string
          image_url: string | null
          project_id: string
          title: string | null
          vote_count: number | null
        }
        Insert: {
          concept_type?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          estimated_budget_max?: number | null
          estimated_budget_min?: number | null
          id?: string
          image_url?: string | null
          project_id: string
          title?: string | null
          vote_count?: number | null
        }
        Update: {
          concept_type?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          estimated_budget_max?: number | null
          estimated_budget_min?: number | null
          id?: string
          image_url?: string | null
          project_id?: string
          title?: string | null
          vote_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "renovation_concepts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "renovation_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      renovation_projects: {
        Row: {
          budget: string | null
          category: string
          city: string | null
          created_at: string | null
          goal: string | null
          id: string
          is_public: boolean | null
          like_count: number | null
          original_image_url: string | null
          project_summary: string | null
          session_id: string | null
          share_count: number | null
          slug: string | null
          style: string | null
          timeline: string | null
          updated_at: string | null
          user_id: string | null
          view_count: number | null
          vote_count: number | null
        }
        Insert: {
          budget?: string | null
          category: string
          city?: string | null
          created_at?: string | null
          goal?: string | null
          id?: string
          is_public?: boolean | null
          like_count?: number | null
          original_image_url?: string | null
          project_summary?: string | null
          session_id?: string | null
          share_count?: number | null
          slug?: string | null
          style?: string | null
          timeline?: string | null
          updated_at?: string | null
          user_id?: string | null
          view_count?: number | null
          vote_count?: number | null
        }
        Update: {
          budget?: string | null
          category?: string
          city?: string | null
          created_at?: string | null
          goal?: string | null
          id?: string
          is_public?: boolean | null
          like_count?: number | null
          original_image_url?: string | null
          project_summary?: string | null
          session_id?: string | null
          share_count?: number | null
          slug?: string | null
          style?: string | null
          timeline?: string | null
          updated_at?: string | null
          user_id?: string | null
          view_count?: number | null
          vote_count?: number | null
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
          {
            foreignKeyName: "review_insights_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
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
          {
            foreignKeyName: "review_items_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
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
          {
            foreignKeyName: "reviews_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      reward_rules: {
        Row: {
          city: string | null
          conversion_type: string
          created_at: string
          feature: string | null
          id: string
          is_active: boolean
          name: string
          owner_role: string
          priority: number
          required_count: number
          reward_type: string
          reward_value: Json
          updated_at: string
        }
        Insert: {
          city?: string | null
          conversion_type: string
          created_at?: string
          feature?: string | null
          id?: string
          is_active?: boolean
          name: string
          owner_role?: string
          priority?: number
          required_count: number
          reward_type: string
          reward_value?: Json
          updated_at?: string
        }
        Update: {
          city?: string | null
          conversion_type?: string
          created_at?: string
          feature?: string | null
          id?: string
          is_active?: boolean
          name?: string
          owner_role?: string
          priority?: number
          required_count?: number
          reward_type?: string
          reward_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      rewards: {
        Row: {
          created_at: string
          id: string
          reward_type: string
          reward_value: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reward_type: string
          reward_value?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reward_type?: string
          reward_value?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      roadmap_execution_decisions: {
        Row: {
          created_at: string
          decided_by: string | null
          decision_reason: string | null
          decision_type: string
          id: string
          module_slug: string
        }
        Insert: {
          created_at?: string
          decided_by?: string | null
          decision_reason?: string | null
          decision_type: string
          id?: string
          module_slug: string
        }
        Update: {
          created_at?: string
          decided_by?: string | null
          decision_reason?: string | null
          decision_type?: string
          id?: string
          module_slug?: string
        }
        Relationships: []
      }
      roadmap_execution_queue: {
        Row: {
          created_at: string
          id: string
          module_slug: string
          queue_position: number
          queue_status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          module_slug: string
          queue_position: number
          queue_status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          module_slug?: string
          queue_position?: number
          queue_status?: string
          updated_at?: string
        }
        Relationships: []
      }
      roadmap_execution_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          module_slug: string
          prompt_generated: string | null
          run_notes: string | null
          run_status: string
          run_type: string
          started_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          module_slug: string
          prompt_generated?: string | null
          run_notes?: string | null
          run_status?: string
          run_type?: string
          started_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          module_slug?: string
          prompt_generated?: string | null
          run_notes?: string | null
          run_status?: string
          run_type?: string
          started_at?: string | null
        }
        Relationships: []
      }
      roadmap_implementation_evidence: {
        Row: {
          created_at: string
          evidence_notes: string | null
          evidence_reference: string | null
          evidence_type: string
          id: string
          module_slug: string
        }
        Insert: {
          created_at?: string
          evidence_notes?: string | null
          evidence_reference?: string | null
          evidence_type: string
          id?: string
          module_slug: string
        }
        Update: {
          created_at?: string
          evidence_notes?: string | null
          evidence_reference?: string | null
          evidence_type?: string
          id?: string
          module_slug?: string
        }
        Relationships: []
      }
      roadmap_module_dependencies: {
        Row: {
          created_at: string
          dependency_type: string
          depends_on_module_slug: string
          id: string
          module_slug: string
        }
        Insert: {
          created_at?: string
          dependency_type?: string
          depends_on_module_slug: string
          id?: string
          module_slug: string
        }
        Update: {
          created_at?: string
          dependency_type?: string
          depends_on_module_slug?: string
          id?: string
          module_slug?: string
        }
        Relationships: []
      }
      roadmap_modules: {
        Row: {
          approval_required: boolean
          build_status: string
          created_at: string
          dependency_status: string
          id: string
          implementation_confidence: string
          is_required: boolean
          module_description: string | null
          module_name: string
          module_order: number
          module_slug: string
          phase_order: number
          phase_slug: string
          updated_at: string
        }
        Insert: {
          approval_required?: boolean
          build_status?: string
          created_at?: string
          dependency_status?: string
          id?: string
          implementation_confidence?: string
          is_required?: boolean
          module_description?: string | null
          module_name: string
          module_order: number
          module_slug: string
          phase_order: number
          phase_slug: string
          updated_at?: string
        }
        Update: {
          approval_required?: boolean
          build_status?: string
          created_at?: string
          dependency_status?: string
          id?: string
          implementation_confidence?: string
          is_required?: boolean
          module_description?: string | null
          module_name?: string
          module_order?: number
          module_slug?: string
          phase_order?: number
          phase_slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      sales_microcopy: {
        Row: {
          ab_test_variant: string | null
          audience: string
          clicks: number | null
          context: string
          conversion_rate: number | null
          created_at: string | null
          id: string
          impressions: number | null
          is_active: boolean | null
          placement: string
          priority: number | null
          psychology_principle: string | null
          text_en: string | null
          text_fr: string
          updated_at: string | null
        }
        Insert: {
          ab_test_variant?: string | null
          audience?: string
          clicks?: number | null
          context: string
          conversion_rate?: number | null
          created_at?: string | null
          id?: string
          impressions?: number | null
          is_active?: boolean | null
          placement: string
          priority?: number | null
          psychology_principle?: string | null
          text_en?: string | null
          text_fr: string
          updated_at?: string | null
        }
        Update: {
          ab_test_variant?: string | null
          audience?: string
          clicks?: number | null
          context?: string
          conversion_rate?: number | null
          created_at?: string | null
          id?: string
          impressions?: number | null
          is_active?: boolean | null
          placement?: string
          priority?: number | null
          psychology_principle?: string | null
          text_en?: string | null
          text_fr?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      scheduled_reminders: {
        Row: {
          appointment_id: string
          channel: string
          created_at: string
          id: string
          metadata: Json
          notification_id: string | null
          profile_id: string
          reminder_type: string
          scheduled_for: string
          sent_at: string | null
          status: string
        }
        Insert: {
          appointment_id: string
          channel?: string
          created_at?: string
          id?: string
          metadata?: Json
          notification_id?: string | null
          profile_id: string
          reminder_type: string
          scheduled_for: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          appointment_id?: string
          channel?: string
          created_at?: string
          id?: string
          metadata?: Json
          notification_id?: string | null
          profile_id?: string
          reminder_type?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_reminders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_reminders_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_reminders_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_admin_queue: {
        Row: {
          city: string | null
          created_at: string | null
          id: string
          payload: Json | null
          slug: string | null
          status: string | null
          type: string
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          id?: string
          payload?: Json | null
          slug?: string | null
          status?: string | null
          type: string
        }
        Update: {
          city?: string | null
          created_at?: string | null
          id?: string
          payload?: Json | null
          slug?: string | null
          status?: string | null
          type?: string
        }
        Relationships: []
      }
      seo_articles: {
        Row: {
          city: string
          content_html: string | null
          content_sections: Json | null
          conversion_score: number | null
          created_at: string | null
          faq: Json | null
          generation_model: string | null
          generation_status: string | null
          h1: string | null
          hero_image_prompt: string | null
          id: string
          intent_score: number | null
          internal_links: Json | null
          meta_description: string | null
          meta_title: string | null
          problem_slug: string | null
          published: boolean | null
          schema_json_ld: Json | null
          seo_score: number | null
          service_category: string | null
          slug: string
          title: string
          updated_at: string | null
          word_count: number | null
        }
        Insert: {
          city: string
          content_html?: string | null
          content_sections?: Json | null
          conversion_score?: number | null
          created_at?: string | null
          faq?: Json | null
          generation_model?: string | null
          generation_status?: string | null
          h1?: string | null
          hero_image_prompt?: string | null
          id?: string
          intent_score?: number | null
          internal_links?: Json | null
          meta_description?: string | null
          meta_title?: string | null
          problem_slug?: string | null
          published?: boolean | null
          schema_json_ld?: Json | null
          seo_score?: number | null
          service_category?: string | null
          slug: string
          title: string
          updated_at?: string | null
          word_count?: number | null
        }
        Update: {
          city?: string
          content_html?: string | null
          content_sections?: Json | null
          conversion_score?: number | null
          created_at?: string | null
          faq?: Json | null
          generation_model?: string | null
          generation_status?: string | null
          h1?: string | null
          hero_image_prompt?: string | null
          id?: string
          intent_score?: number | null
          internal_links?: Json | null
          meta_description?: string | null
          meta_title?: string | null
          problem_slug?: string | null
          published?: boolean | null
          schema_json_ld?: Json | null
          seo_score?: number | null
          service_category?: string | null
          slug?: string
          title?: string
          updated_at?: string | null
          word_count?: number | null
        }
        Relationships: []
      }
      seo_generation_queue: {
        Row: {
          city: string
          created_at: string
          error_message: string | null
          id: string
          problem: string
          processed_at: string | null
          property_type: string | null
          result_page_id: string | null
          status: string
          template_id: string | null
        }
        Insert: {
          city: string
          created_at?: string
          error_message?: string | null
          id?: string
          problem: string
          processed_at?: string | null
          property_type?: string | null
          result_page_id?: string | null
          status?: string
          template_id?: string | null
        }
        Update: {
          city?: string
          created_at?: string
          error_message?: string | null
          id?: string
          problem?: string
          processed_at?: string | null
          property_type?: string | null
          result_page_id?: string | null
          status?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seo_generation_queue_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "seo_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_local_generation_logs: {
        Row: {
          batch_name: string | null
          city: string | null
          created_at: string | null
          id: string
          notes: string | null
          status: string | null
          total_pages: number | null
        }
        Insert: {
          batch_name?: string | null
          city?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          total_pages?: number | null
        }
        Update: {
          batch_name?: string | null
          city?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          total_pages?: number | null
        }
        Relationships: []
      }
      seo_local_links: {
        Row: {
          anchor_text: string | null
          created_at: string | null
          from_slug: string
          id: string
          to_slug: string
        }
        Insert: {
          anchor_text?: string | null
          created_at?: string | null
          from_slug: string
          id?: string
          to_slug: string
        }
        Update: {
          anchor_text?: string | null
          created_at?: string | null
          from_slug?: string
          id?: string
          to_slug?: string
        }
        Relationships: []
      }
      seo_local_pages: {
        Row: {
          batch_name: string | null
          causes: string | null
          city: string
          cluster: string | null
          conversion_score: number | null
          cost_range: string | null
          created_at: string | null
          diagnostic: string | null
          faq: Json | null
          h1: string | null
          hero_image_prompt: string | null
          id: string
          intent_score: number | null
          intro: string | null
          meta_description: string | null
          meta_title: string | null
          problem: string
          published: boolean | null
          related_slugs: Json | null
          schema_json_ld: Json | null
          seo_score: number | null
          service_category: string | null
          slug: string
          solution: string | null
          timing: string | null
          updated_at: string | null
          urgency: string | null
        }
        Insert: {
          batch_name?: string | null
          causes?: string | null
          city: string
          cluster?: string | null
          conversion_score?: number | null
          cost_range?: string | null
          created_at?: string | null
          diagnostic?: string | null
          faq?: Json | null
          h1?: string | null
          hero_image_prompt?: string | null
          id?: string
          intent_score?: number | null
          intro?: string | null
          meta_description?: string | null
          meta_title?: string | null
          problem: string
          published?: boolean | null
          related_slugs?: Json | null
          schema_json_ld?: Json | null
          seo_score?: number | null
          service_category?: string | null
          slug: string
          solution?: string | null
          timing?: string | null
          updated_at?: string | null
          urgency?: string | null
        }
        Update: {
          batch_name?: string | null
          causes?: string | null
          city?: string
          cluster?: string | null
          conversion_score?: number | null
          cost_range?: string | null
          created_at?: string | null
          diagnostic?: string | null
          faq?: Json | null
          h1?: string | null
          hero_image_prompt?: string | null
          id?: string
          intent_score?: number | null
          intro?: string | null
          meta_description?: string | null
          meta_title?: string | null
          problem?: string
          published?: boolean | null
          related_slugs?: Json | null
          schema_json_ld?: Json | null
          seo_score?: number | null
          service_category?: string | null
          slug?: string
          solution?: string | null
          timing?: string | null
          updated_at?: string | null
          urgency?: string | null
        }
        Relationships: []
      }
      seo_metrics: {
        Row: {
          avg_rank: number | null
          clicks: number
          conversions: number
          id: string
          impressions: number
          page_id: string
          page_type: string
          updated_at: string
        }
        Insert: {
          avg_rank?: number | null
          clicks?: number
          conversions?: number
          id?: string
          impressions?: number
          page_id: string
          page_type?: string
          updated_at?: string
        }
        Update: {
          avg_rank?: number | null
          clicks?: number
          conversions?: number
          id?: string
          impressions?: number
          page_id?: string
          page_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      seo_pages: {
        Row: {
          body_md: string | null
          category_id: string | null
          city: string | null
          city_id: string | null
          content_data: Json | null
          created_at: string
          faq_json: Json | null
          h1: string | null
          id: string
          intent: string | null
          internal_links: Json | null
          is_published: boolean
          meta_description: string | null
          page_type: string
          profession: string | null
          published_at: string | null
          schema_json: Json | null
          slug: string
          specialty: string | null
          status: string | null
          title: string
          updated_at: string
          views: number | null
        }
        Insert: {
          body_md?: string | null
          category_id?: string | null
          city?: string | null
          city_id?: string | null
          content_data?: Json | null
          created_at?: string
          faq_json?: Json | null
          h1?: string | null
          id?: string
          intent?: string | null
          internal_links?: Json | null
          is_published?: boolean
          meta_description?: string | null
          page_type: string
          profession?: string | null
          published_at?: string | null
          schema_json?: Json | null
          slug: string
          specialty?: string | null
          status?: string | null
          title: string
          updated_at?: string
          views?: number | null
        }
        Update: {
          body_md?: string | null
          category_id?: string | null
          city?: string | null
          city_id?: string | null
          content_data?: Json | null
          created_at?: string
          faq_json?: Json | null
          h1?: string | null
          id?: string
          intent?: string | null
          internal_links?: Json | null
          is_published?: boolean
          meta_description?: string | null
          page_type?: string
          profession?: string | null
          published_at?: string | null
          schema_json?: Json | null
          slug?: string
          specialty?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          views?: number | null
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
      seo_property_type_pages: {
        Row: {
          canonical_url: string | null
          city_id: string | null
          city_slug: string | null
          content_blocks: Json | null
          content_quality_score: number | null
          created_at: string | null
          faq: Json | null
          generation_status: string | null
          h1: string
          id: string
          internal_links: Json | null
          is_indexed: boolean | null
          is_published: boolean | null
          last_crawled_at: string | null
          meta_description: string | null
          meta_title: string | null
          page_type: string
          priority_score: number | null
          problem_id: string | null
          problem_slug: string | null
          property_family: string
          property_type_slug: string
          published_at: string | null
          schema_json: Json | null
          slug: string
          target_keyword: string | null
          uniqueness_score: number | null
          updated_at: string | null
        }
        Insert: {
          canonical_url?: string | null
          city_id?: string | null
          city_slug?: string | null
          content_blocks?: Json | null
          content_quality_score?: number | null
          created_at?: string | null
          faq?: Json | null
          generation_status?: string | null
          h1: string
          id?: string
          internal_links?: Json | null
          is_indexed?: boolean | null
          is_published?: boolean | null
          last_crawled_at?: string | null
          meta_description?: string | null
          meta_title?: string | null
          page_type?: string
          priority_score?: number | null
          problem_id?: string | null
          problem_slug?: string | null
          property_family: string
          property_type_slug: string
          published_at?: string | null
          schema_json?: Json | null
          slug: string
          target_keyword?: string | null
          uniqueness_score?: number | null
          updated_at?: string | null
        }
        Update: {
          canonical_url?: string | null
          city_id?: string | null
          city_slug?: string | null
          content_blocks?: Json | null
          content_quality_score?: number | null
          created_at?: string | null
          faq?: Json | null
          generation_status?: string | null
          h1?: string
          id?: string
          internal_links?: Json | null
          is_indexed?: boolean | null
          is_published?: boolean | null
          last_crawled_at?: string | null
          meta_description?: string | null
          meta_title?: string | null
          page_type?: string
          priority_score?: number | null
          problem_id?: string | null
          problem_slug?: string | null
          property_family?: string
          property_type_slug?: string
          published_at?: string | null
          schema_json?: Json | null
          slug?: string
          target_keyword?: string | null
          uniqueness_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seo_property_type_pages_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seo_property_type_pages_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "home_problems"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_templates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          structure_json: Json
          template_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          structure_json?: Json
          template_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          structure_json?: Json
          template_type?: string
        }
        Relationships: []
      }
      service_areas: {
        Row: {
          city_name: string
          city_slug: string
          created_at: string
          id: string
          is_active: boolean
          market_tier: string
          population: number | null
          province_code: string
          region_name: string | null
          updated_at: string
        }
        Insert: {
          city_name: string
          city_slug: string
          created_at?: string
          id?: string
          is_active?: boolean
          market_tier?: string
          population?: number | null
          province_code?: string
          region_name?: string | null
          updated_at?: string
        }
        Update: {
          city_name?: string
          city_slug?: string
          created_at?: string
          id?: string
          is_active?: boolean
          market_tier?: string
          population?: number | null
          province_code?: string
          region_name?: string | null
          updated_at?: string
        }
        Relationships: []
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
      signature_requests: {
        Row: {
          category: string
          city: string
          company_name: string
          contact_name: string
          contractor_id: string | null
          created_at: string
          email: string
          id: string
          message: string | null
          monthly_budget: string | null
          phone: string | null
          specialty: string | null
          status: string
          wants_exclusivity: boolean | null
          website: string | null
        }
        Insert: {
          category: string
          city: string
          company_name: string
          contact_name: string
          contractor_id?: string | null
          created_at?: string
          email: string
          id?: string
          message?: string | null
          monthly_budget?: string | null
          phone?: string | null
          specialty?: string | null
          status?: string
          wants_exclusivity?: boolean | null
          website?: string | null
        }
        Update: {
          category?: string
          city?: string
          company_name?: string
          contact_name?: string
          contractor_id?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          monthly_budget?: string | null
          phone?: string | null
          specialty?: string | null
          status?: string
          wants_exclusivity?: boolean | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signature_requests_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_requests_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_requests_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_requests_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      sla_assignments: {
        Row: {
          achieved: boolean | null
          actual_response_minutes: number | null
          breach_reason: string | null
          created_at: string
          guaranteed_response_minutes: number
          id: string
          refund_amount_cents: number | null
          refund_issued: boolean | null
          request_id: string
          resolved_at: string | null
          sla_tier_id: string
          sla_tier_name: string
        }
        Insert: {
          achieved?: boolean | null
          actual_response_minutes?: number | null
          breach_reason?: string | null
          created_at?: string
          guaranteed_response_minutes: number
          id?: string
          refund_amount_cents?: number | null
          refund_issued?: boolean | null
          request_id: string
          resolved_at?: string | null
          sla_tier_id: string
          sla_tier_name: string
        }
        Update: {
          achieved?: boolean | null
          actual_response_minutes?: number | null
          breach_reason?: string | null
          created_at?: string
          guaranteed_response_minutes?: number
          id?: string
          refund_amount_cents?: number | null
          refund_issued?: boolean | null
          request_id?: string
          resolved_at?: string | null
          sla_tier_id?: string
          sla_tier_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "sla_assignments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "emergency_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sla_assignments_sla_tier_id_fkey"
            columns: ["sla_tier_id"]
            isOneToOne: false
            referencedRelation: "sla_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_tiers: {
        Row: {
          created_at: string
          dispatch_rules_override: Json | null
          display_order: number
          id: string
          is_active: boolean
          label_fr: string
          name: string
          price_multiplier: number
          priority_boost: number
          response_time_minutes: number
          surcharge_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          dispatch_rules_override?: Json | null
          display_order?: number
          id?: string
          is_active?: boolean
          label_fr: string
          name: string
          price_multiplier?: number
          priority_boost?: number
          response_time_minutes: number
          surcharge_cents?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          dispatch_rules_override?: Json | null
          display_order?: number
          id?: string
          is_active?: boolean
          label_fr?: string
          name?: string
          price_multiplier?: number
          priority_boost?: number
          response_time_minutes?: number
          surcharge_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      smart_bookings: {
        Row: {
          address_line1: string | null
          alex_session_id: string | null
          amount_total_cents: number | null
          appointment_quality_score: number | null
          appointment_type_id: string | null
          booking_rank_score: number | null
          buffer_after_minutes: number | null
          buffer_before_minutes: number | null
          cancellation_reason: string | null
          cancelled_at: string | null
          city: string | null
          client_email: string | null
          client_name: string
          client_phone: string | null
          close_probability: number | null
          close_probability_score: number | null
          completed_at: string | null
          confirmed_at: string | null
          contractor_amount_cents: number | null
          contractor_id: string
          created_at: string | null
          dna_match_score: number | null
          estimated_job_value: number | null
          estimated_job_value_cents: number | null
          google_calendar_event_id: string | null
          id: string
          internal_summary: string | null
          lat: number | null
          lng: number | null
          payment_status: string | null
          postal_code: string | null
          property_type: string | null
          province: string | null
          qr_id: string | null
          requested_notes: string | null
          scheduled_end: string
          scheduled_start: string
          source: string | null
          source_campaign: string | null
          source_detail: string | null
          status: string | null
          travel_minutes_after: number | null
          travel_minutes_before: number | null
          unpro_fee_cents: number | null
          updated_at: string | null
          urgency_level: string | null
        }
        Insert: {
          address_line1?: string | null
          alex_session_id?: string | null
          amount_total_cents?: number | null
          appointment_quality_score?: number | null
          appointment_type_id?: string | null
          booking_rank_score?: number | null
          buffer_after_minutes?: number | null
          buffer_before_minutes?: number | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          city?: string | null
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          close_probability?: number | null
          close_probability_score?: number | null
          completed_at?: string | null
          confirmed_at?: string | null
          contractor_amount_cents?: number | null
          contractor_id: string
          created_at?: string | null
          dna_match_score?: number | null
          estimated_job_value?: number | null
          estimated_job_value_cents?: number | null
          google_calendar_event_id?: string | null
          id?: string
          internal_summary?: string | null
          lat?: number | null
          lng?: number | null
          payment_status?: string | null
          postal_code?: string | null
          property_type?: string | null
          province?: string | null
          qr_id?: string | null
          requested_notes?: string | null
          scheduled_end: string
          scheduled_start: string
          source?: string | null
          source_campaign?: string | null
          source_detail?: string | null
          status?: string | null
          travel_minutes_after?: number | null
          travel_minutes_before?: number | null
          unpro_fee_cents?: number | null
          updated_at?: string | null
          urgency_level?: string | null
        }
        Update: {
          address_line1?: string | null
          alex_session_id?: string | null
          amount_total_cents?: number | null
          appointment_quality_score?: number | null
          appointment_type_id?: string | null
          booking_rank_score?: number | null
          buffer_after_minutes?: number | null
          buffer_before_minutes?: number | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          city?: string | null
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          close_probability?: number | null
          close_probability_score?: number | null
          completed_at?: string | null
          confirmed_at?: string | null
          contractor_amount_cents?: number | null
          contractor_id?: string
          created_at?: string | null
          dna_match_score?: number | null
          estimated_job_value?: number | null
          estimated_job_value_cents?: number | null
          google_calendar_event_id?: string | null
          id?: string
          internal_summary?: string | null
          lat?: number | null
          lng?: number | null
          payment_status?: string | null
          postal_code?: string | null
          property_type?: string | null
          province?: string | null
          qr_id?: string | null
          requested_notes?: string | null
          scheduled_end?: string
          scheduled_start?: string
          source?: string | null
          source_campaign?: string | null
          source_detail?: string | null
          status?: string | null
          travel_minutes_after?: number | null
          travel_minutes_before?: number | null
          unpro_fee_cents?: number | null
          updated_at?: string | null
          urgency_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "smart_bookings_appointment_type_id_fkey"
            columns: ["appointment_type_id"]
            isOneToOne: false
            referencedRelation: "booking_appointment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_bookings_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_bookings_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_bookings_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_bookings_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      smart_decline_logs: {
        Row: {
          appointment_id: string | null
          contractor_id: string
          created_at: string | null
          decline_type: string
          id: string
          reason_code: string | null
          reason_text: string | null
          redirect_contractor_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          contractor_id: string
          created_at?: string | null
          decline_type?: string
          id?: string
          reason_code?: string | null
          reason_text?: string | null
          redirect_contractor_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          contractor_id?: string
          created_at?: string | null
          decline_type?: string
          id?: string
          reason_code?: string | null
          reason_text?: string | null
          redirect_contractor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "smart_decline_logs_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_decline_logs_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_decline_logs_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_decline_logs_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_decline_logs_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
          {
            foreignKeyName: "smart_decline_logs_redirect_contractor_id_fkey"
            columns: ["redirect_contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_decline_logs_redirect_contractor_id_fkey"
            columns: ["redirect_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_decline_logs_redirect_contractor_id_fkey"
            columns: ["redirect_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_decline_logs_redirect_contractor_id_fkey"
            columns: ["redirect_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
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
      storm_mode_sessions: {
        Row: {
          activation_type: string
          admin_note: string | null
          auto_expire: boolean | null
          categories: string[] | null
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          name: string
          scope_type: string
          scope_values: string[] | null
          severity_level: string
          started_at: string
          status: string
        }
        Insert: {
          activation_type?: string
          admin_note?: string | null
          auto_expire?: boolean | null
          categories?: string[] | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          name: string
          scope_type?: string
          scope_values?: string[] | null
          severity_level?: string
          started_at?: string
          status?: string
        }
        Update: {
          activation_type?: string
          admin_note?: string | null
          auto_expire?: boolean | null
          categories?: string[] | null
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          name?: string
          scope_type?: string
          scope_values?: string[] | null
          severity_level?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      storm_rules: {
        Row: {
          action_json: Json
          category: string | null
          condition_json: Json
          created_at: string
          id: string
          is_active: boolean | null
          region: string | null
          rule_name: string
        }
        Insert: {
          action_json?: Json
          category?: string | null
          condition_json?: Json
          created_at?: string
          id?: string
          is_active?: boolean | null
          region?: string | null
          rule_name: string
        }
        Update: {
          action_json?: Json
          category?: string | null
          condition_json?: Json
          created_at?: string
          id?: string
          is_active?: boolean | null
          region?: string | null
          rule_name?: string
        }
        Relationships: []
      }
      subcontract_requests: {
        Row: {
          appointment_id: string | null
          city_slug: string | null
          created_at: string | null
          id: string
          matched_contractor_id: string | null
          material_slugs: string[] | null
          project_id: string | null
          requesting_contractor_id: string
          scope_description: string
          scope_slugs: string[] | null
          status: string | null
          structure_type: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          city_slug?: string | null
          created_at?: string | null
          id?: string
          matched_contractor_id?: string | null
          material_slugs?: string[] | null
          project_id?: string | null
          requesting_contractor_id: string
          scope_description: string
          scope_slugs?: string[] | null
          status?: string | null
          structure_type?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          city_slug?: string | null
          created_at?: string | null
          id?: string
          matched_contractor_id?: string | null
          material_slugs?: string[] | null
          project_id?: string | null
          requesting_contractor_id?: string
          scope_description?: string
          scope_slugs?: string[] | null
          status?: string | null
          structure_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcontract_requests_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontract_requests_matched_contractor_id_fkey"
            columns: ["matched_contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontract_requests_matched_contractor_id_fkey"
            columns: ["matched_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontract_requests_matched_contractor_id_fkey"
            columns: ["matched_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontract_requests_matched_contractor_id_fkey"
            columns: ["matched_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
          {
            foreignKeyName: "subcontract_requests_requesting_contractor_id_fkey"
            columns: ["requesting_contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontract_requests_requesting_contractor_id_fkey"
            columns: ["requesting_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontract_requests_requesting_contractor_id_fkey"
            columns: ["requesting_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontract_requests_requesting_contractor_id_fkey"
            columns: ["requesting_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      syndicate_audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          syndicate_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          syndicate_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          syndicate_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "syndicate_audit_logs_syndicate_id_fkey"
            columns: ["syndicate_id"]
            isOneToOne: false
            referencedRelation: "syndicates"
            referencedColumns: ["id"]
          },
        ]
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
      syndicate_components: {
        Row: {
          category: string
          condition_rating: string | null
          created_at: string
          estimated_replacement_cost: number | null
          id: string
          install_year: number | null
          last_inspection_date: string | null
          name: string
          notes: string | null
          remaining_life_years: number | null
          syndicate_id: string
          updated_at: string
          useful_life_years: number | null
        }
        Insert: {
          category?: string
          condition_rating?: string | null
          created_at?: string
          estimated_replacement_cost?: number | null
          id?: string
          install_year?: number | null
          last_inspection_date?: string | null
          name: string
          notes?: string | null
          remaining_life_years?: number | null
          syndicate_id: string
          updated_at?: string
          useful_life_years?: number | null
        }
        Update: {
          category?: string
          condition_rating?: string | null
          created_at?: string
          estimated_replacement_cost?: number | null
          id?: string
          install_year?: number | null
          last_inspection_date?: string | null
          name?: string
          notes?: string | null
          remaining_life_years?: number | null
          syndicate_id?: string
          updated_at?: string
          useful_life_years?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "syndicate_components_syndicate_id_fkey"
            columns: ["syndicate_id"]
            isOneToOne: false
            referencedRelation: "syndicates"
            referencedColumns: ["id"]
          },
        ]
      }
      syndicate_documents: {
        Row: {
          created_at: string
          document_type: string
          file_name: string
          file_size: number | null
          file_type: string | null
          id: string
          storage_path: string
          syndicate_id: string
          tags: string[] | null
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          document_type?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          storage_path: string
          syndicate_id: string
          tags?: string[] | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          storage_path?: string
          syndicate_id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "syndicate_documents_syndicate_id_fkey"
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
            foreignKeyName: "syndicate_maintenance_items_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
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
      syndicate_maintenance_logs: {
        Row: {
          component_id: string | null
          cost: number | null
          created_at: string
          created_by: string | null
          description: string | null
          documents: Json | null
          id: string
          performed_by: string | null
          performed_date: string
          syndicate_id: string
          task_id: string | null
          title: string
        }
        Insert: {
          component_id?: string | null
          cost?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          documents?: Json | null
          id?: string
          performed_by?: string | null
          performed_date?: string
          syndicate_id: string
          task_id?: string | null
          title: string
        }
        Update: {
          component_id?: string | null
          cost?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          documents?: Json | null
          id?: string
          performed_by?: string | null
          performed_date?: string
          syndicate_id?: string
          task_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "syndicate_maintenance_logs_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "syndicate_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syndicate_maintenance_logs_syndicate_id_fkey"
            columns: ["syndicate_id"]
            isOneToOne: false
            referencedRelation: "syndicates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syndicate_maintenance_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "syndicate_maintenance_tasks"
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
      syndicate_maintenance_tasks: {
        Row: {
          actual_cost: number | null
          assigned_to: string | null
          category: string | null
          completed_date: string | null
          component_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          estimated_cost: number | null
          id: string
          priority: string | null
          recurrence: string | null
          status: string | null
          syndicate_id: string
          title: string
          updated_at: string
        }
        Insert: {
          actual_cost?: number | null
          assigned_to?: string | null
          category?: string | null
          completed_date?: string | null
          component_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          estimated_cost?: number | null
          id?: string
          priority?: string | null
          recurrence?: string | null
          status?: string | null
          syndicate_id: string
          title: string
          updated_at?: string
        }
        Update: {
          actual_cost?: number | null
          assigned_to?: string | null
          category?: string | null
          completed_date?: string | null
          component_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          estimated_cost?: number | null
          id?: string
          priority?: string | null
          recurrence?: string | null
          status?: string | null
          syndicate_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "syndicate_maintenance_tasks_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "syndicate_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syndicate_maintenance_tasks_syndicate_id_fkey"
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
            foreignKeyName: "syndicate_members_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
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
            foreignKeyName: "syndicate_project_interests_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
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
            foreignKeyName: "syndicate_projects_actual_contractor_id_fkey"
            columns: ["actual_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
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
      syndicate_quote_analyses: {
        Row: {
          comparison_result: Json | null
          created_at: string
          created_by: string | null
          id: string
          project_title: string
          quotes: Json | null
          recommendation: string | null
          status: string | null
          syndicate_id: string
          updated_at: string
        }
        Insert: {
          comparison_result?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          project_title: string
          quotes?: Json | null
          recommendation?: string | null
          status?: string | null
          syndicate_id: string
          updated_at?: string
        }
        Update: {
          comparison_result?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          project_title?: string
          quotes?: Json | null
          recommendation?: string | null
          status?: string | null
          syndicate_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "syndicate_quote_analyses_syndicate_id_fkey"
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
          building_type: string | null
          city: string | null
          created_at: string
          created_by: string
          description: string | null
          fiscal_year_start: number | null
          health_score: number | null
          id: string
          insurance_policy_number: string | null
          insurance_provider: string | null
          insurance_renewal_date: string | null
          loi16_inspection_date: string | null
          loi16_inspection_done: boolean | null
          loi16_report_storage_path: string | null
          name: string
          onboarding_completed: boolean | null
          plan_tier: string | null
          postal_code: string | null
          province: string | null
          unit_count: number | null
          updated_at: string
          year_built: number | null
        }
        Insert: {
          address?: string | null
          building_type?: string | null
          city?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          fiscal_year_start?: number | null
          health_score?: number | null
          id?: string
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          insurance_renewal_date?: string | null
          loi16_inspection_date?: string | null
          loi16_inspection_done?: boolean | null
          loi16_report_storage_path?: string | null
          name: string
          onboarding_completed?: boolean | null
          plan_tier?: string | null
          postal_code?: string | null
          province?: string | null
          unit_count?: number | null
          updated_at?: string
          year_built?: number | null
        }
        Update: {
          address?: string | null
          building_type?: string | null
          city?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          fiscal_year_start?: number | null
          health_score?: number | null
          id?: string
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          insurance_renewal_date?: string | null
          loi16_inspection_date?: string | null
          loi16_inspection_done?: boolean | null
          loi16_report_storage_path?: string | null
          name?: string
          onboarding_completed?: boolean | null
          plan_tier?: string | null
          postal_code?: string | null
          province?: string | null
          unit_count?: number | null
          updated_at?: string
          year_built?: number | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      territories: {
        Row: {
          category_name: string
          category_slug: string
          city_name: string
          city_slug: string
          competition_score: number | null
          created_at: string
          demand_score: number | null
          generation_source: string | null
          id: string
          is_active: boolean
          market_tier: string
          max_entrepreneurs: number
          occupied_elite: number
          occupied_premium: number
          occupied_pro: number
          occupied_recrue: number
          occupied_signature: number
          province_code: string
          region_name: string | null
          slots_elite: number
          slots_premium: number
          slots_pro: number
          slots_recrue: number
          slots_signature: number
          status: string
          strategic_score: number | null
          updated_at: string
        }
        Insert: {
          category_name: string
          category_slug: string
          city_name: string
          city_slug: string
          competition_score?: number | null
          created_at?: string
          demand_score?: number | null
          generation_source?: string | null
          id?: string
          is_active?: boolean
          market_tier?: string
          max_entrepreneurs?: number
          occupied_elite?: number
          occupied_premium?: number
          occupied_pro?: number
          occupied_recrue?: number
          occupied_signature?: number
          province_code?: string
          region_name?: string | null
          slots_elite?: number
          slots_premium?: number
          slots_pro?: number
          slots_recrue?: number
          slots_signature?: number
          status?: string
          strategic_score?: number | null
          updated_at?: string
        }
        Update: {
          category_name?: string
          category_slug?: string
          city_name?: string
          city_slug?: string
          competition_score?: number | null
          created_at?: string
          demand_score?: number | null
          generation_source?: string | null
          id?: string
          is_active?: boolean
          market_tier?: string
          max_entrepreneurs?: number
          occupied_elite?: number
          occupied_premium?: number
          occupied_pro?: number
          occupied_recrue?: number
          occupied_signature?: number
          province_code?: string
          region_name?: string | null
          slots_elite?: number
          slots_premium?: number
          slots_pro?: number
          slots_recrue?: number
          slots_signature?: number
          status?: string
          strategic_score?: number | null
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
            foreignKeyName: "territory_assignments_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
          {
            foreignKeyName: "territory_assignments_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "territory_assignments_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "v_territories"
            referencedColumns: ["id"]
          },
        ]
      }
      territory_generation_logs: {
        Row: {
          categories_count: number
          cities_count: number
          created_at: string
          created_count: number
          error_count: number
          executed_by: string | null
          id: string
          mode: string
          payload: Json | null
          skipped_count: number
          total_combinations: number
          updated_count: number
        }
        Insert: {
          categories_count?: number
          cities_count?: number
          created_at?: string
          created_count?: number
          error_count?: number
          executed_by?: string | null
          id?: string
          mode: string
          payload?: Json | null
          skipped_count?: number
          total_combinations?: number
          updated_count?: number
        }
        Update: {
          categories_count?: number
          cities_count?: number
          created_at?: string
          created_count?: number
          error_count?: number
          executed_by?: string | null
          id?: string
          mode?: string
          payload?: Json | null
          skipped_count?: number
          total_combinations?: number
          updated_count?: number
        }
        Relationships: []
      }
      territory_waitlist: {
        Row: {
          activated_at: string | null
          cluster: string | null
          contractor_id: string
          created_at: string
          id: string
          niche_demand_score: number | null
          notes: string | null
          profile_completeness: number | null
          replaced_contractor_id: string | null
          specialty: string | null
          specialty_scarcity_score: number | null
          status: string
          territory_id: string
          trust_signals_score: number | null
          updated_at: string
          waitlist_score: number | null
        }
        Insert: {
          activated_at?: string | null
          cluster?: string | null
          contractor_id: string
          created_at?: string
          id?: string
          niche_demand_score?: number | null
          notes?: string | null
          profile_completeness?: number | null
          replaced_contractor_id?: string | null
          specialty?: string | null
          specialty_scarcity_score?: number | null
          status?: string
          territory_id: string
          trust_signals_score?: number | null
          updated_at?: string
          waitlist_score?: number | null
        }
        Update: {
          activated_at?: string | null
          cluster?: string | null
          contractor_id?: string
          created_at?: string
          id?: string
          niche_demand_score?: number | null
          notes?: string | null
          profile_completeness?: number | null
          replaced_contractor_id?: string | null
          specialty?: string | null
          specialty_scarcity_score?: number | null
          status?: string
          territory_id?: string
          trust_signals_score?: number | null
          updated_at?: string
          waitlist_score?: number | null
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
            foreignKeyName: "territory_waitlist_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
          {
            foreignKeyName: "territory_waitlist_replaced_contractor_id_fkey"
            columns: ["replaced_contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "territory_waitlist_replaced_contractor_id_fkey"
            columns: ["replaced_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "territory_waitlist_replaced_contractor_id_fkey"
            columns: ["replaced_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "territory_waitlist_replaced_contractor_id_fkey"
            columns: ["replaced_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
          {
            foreignKeyName: "territory_waitlist_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "territory_waitlist_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "v_territories"
            referencedColumns: ["id"]
          },
        ]
      }
      title_tests: {
        Row: {
          article_id: string
          clicks: number | null
          created_at: string
          ctr: number | null
          id: string
          impressions: number | null
          is_winner: boolean | null
          variant_index: number
          variant_title: string
        }
        Insert: {
          article_id: string
          clicks?: number | null
          created_at?: string
          ctr?: number | null
          id?: string
          impressions?: number | null
          is_winner?: boolean | null
          variant_index?: number
          variant_title: string
        }
        Update: {
          article_id?: string
          clicks?: number | null
          created_at?: string
          ctr?: number | null
          id?: string
          impressions?: number | null
          is_winner?: boolean | null
          variant_index?: number
          variant_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "title_tests_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "blog_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_backlog: {
        Row: {
          angle: string | null
          audience_type: string
          category: string
          city: string | null
          created_at: string
          id: string
          metadata: Json | null
          priority: number
          source: string | null
          status: string
          title_suggestion: string
          updated_at: string
        }
        Insert: {
          angle?: string | null
          audience_type?: string
          category?: string
          city?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          priority?: number
          source?: string | null
          status?: string
          title_suggestion: string
          updated_at?: string
        }
        Update: {
          angle?: string | null
          audience_type?: string
          category?: string
          city?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          priority?: number
          source?: string | null
          status?: string
          title_suggestion?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_likes: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          channel: string
          created_at: string
          id: string
          message: string
          metadata: Json | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          status?: string
          type?: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
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
      user_shares: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          share_method: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          share_method?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          share_method?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_voice_profiles: {
        Row: {
          created_at: string
          embedding_json: Json | null
          id: string
          is_active: boolean
          last_sample_at: string | null
          metadata: Json
          profile_name: string
          provider: string
          sample_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          embedding_json?: Json | null
          id?: string
          is_active?: boolean
          last_sample_at?: string | null
          metadata?: Json
          profile_name?: string
          provider?: string
          sample_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          embedding_json?: Json | null
          id?: string
          is_active?: boolean
          last_sample_at?: string | null
          metadata?: Json
          profile_name?: string
          provider?: string
          sample_count?: number
          updated_at?: string
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
      value_tags: {
        Row: {
          category: string | null
          created_at: string | null
          description_fr: string | null
          id: string
          label_fr: string
          slug: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description_fr?: string | null
          id?: string
          label_fr: string
          slug: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description_fr?: string | null
          id?: string
          label_fr?: string
          slug?: string
        }
        Relationships: []
      }
      verification_reports: {
        Row: {
          contractor_identity: Json | null
          created_at: string
          id: string
          input_type: string
          input_value: string
          license_fit_score: number | null
          license_scope: Json | null
          matched_contractor_id: string | null
          neq_validation: Json | null
          project_description: string | null
          rbq_validation: Json | null
          risk_signals: Json | null
          trust_score: number | null
          updated_at: string
          user_id: string | null
          verdict: string | null
          visual_validation: Json | null
        }
        Insert: {
          contractor_identity?: Json | null
          created_at?: string
          id?: string
          input_type: string
          input_value: string
          license_fit_score?: number | null
          license_scope?: Json | null
          matched_contractor_id?: string | null
          neq_validation?: Json | null
          project_description?: string | null
          rbq_validation?: Json | null
          risk_signals?: Json | null
          trust_score?: number | null
          updated_at?: string
          user_id?: string | null
          verdict?: string | null
          visual_validation?: Json | null
        }
        Update: {
          contractor_identity?: Json | null
          created_at?: string
          id?: string
          input_type?: string
          input_value?: string
          license_fit_score?: number | null
          license_scope?: Json | null
          matched_contractor_id?: string | null
          neq_validation?: Json | null
          project_description?: string | null
          rbq_validation?: Json | null
          risk_signals?: Json | null
          trust_score?: number | null
          updated_at?: string
          user_id?: string | null
          verdict?: string | null
          visual_validation?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_reports_matched_contractor_id_fkey"
            columns: ["matched_contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_reports_matched_contractor_id_fkey"
            columns: ["matched_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_reports_matched_contractor_id_fkey"
            columns: ["matched_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_reports_matched_contractor_id_fkey"
            columns: ["matched_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
        ]
      }
      voice_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          session_id: string
        }
        Insert: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          session_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "voice_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_sessions: {
        Row: {
          context_json: Json | null
          created_at: string
          deep_link_id: string | null
          feature: string
          id: string
          transcript: string | null
          user_id: string | null
        }
        Insert: {
          context_json?: Json | null
          created_at?: string
          deep_link_id?: string | null
          feature?: string
          id?: string
          transcript?: string | null
          user_id?: string | null
        }
        Update: {
          context_json?: Json | null
          created_at?: string
          deep_link_id?: string | null
          feature?: string
          id?: string
          transcript?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      waitlist_replacements: {
        Row: {
          activated_contractor_id: string | null
          activated_from_waitlist_id: string | null
          activated_score: number | null
          created_at: string
          executed_by: string | null
          id: string
          removed_contractor_id: string
          removed_reason: string
          removed_score: number | null
          territory_id: string
        }
        Insert: {
          activated_contractor_id?: string | null
          activated_from_waitlist_id?: string | null
          activated_score?: number | null
          created_at?: string
          executed_by?: string | null
          id?: string
          removed_contractor_id: string
          removed_reason?: string
          removed_score?: number | null
          territory_id: string
        }
        Update: {
          activated_contractor_id?: string | null
          activated_from_waitlist_id?: string | null
          activated_score?: number | null
          created_at?: string
          executed_by?: string | null
          id?: string
          removed_contractor_id?: string
          removed_reason?: string
          removed_score?: number | null
          territory_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_replacements_activated_contractor_id_fkey"
            columns: ["activated_contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_replacements_activated_contractor_id_fkey"
            columns: ["activated_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_replacements_activated_contractor_id_fkey"
            columns: ["activated_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_replacements_activated_contractor_id_fkey"
            columns: ["activated_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
          {
            foreignKeyName: "waitlist_replacements_activated_from_waitlist_id_fkey"
            columns: ["activated_from_waitlist_id"]
            isOneToOne: false
            referencedRelation: "territory_waitlist"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_replacements_removed_contractor_id_fkey"
            columns: ["removed_contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_replacements_removed_contractor_id_fkey"
            columns: ["removed_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_full_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_replacements_removed_contractor_id_fkey"
            columns: ["removed_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_replacements_removed_contractor_id_fkey"
            columns: ["removed_contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
          {
            foreignKeyName: "waitlist_replacements_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_replacements_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "v_territories"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "profile_alignment_answers_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
          },
          {
            foreignKeyName: "profile_alignment_answers_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_alignment_answers_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
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
      v_contractor_trust_summary: {
        Row: {
          aipp_score: number | null
          appointment_show_rate: number | null
          business_name: string | null
          close_rate: number | null
          complaint_rate: number | null
          contractor_id: string | null
          insurance_verified: boolean | null
          neq_verified: boolean | null
          profile_completeness_score: number | null
          rating: number | null
          rbq_verified: boolean | null
          response_time_avg_hours: number | null
          review_count: number | null
          review_sentiment_score: number | null
          trust_score: number | null
          unpro_score: number | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_credentials_count: number | null
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
            foreignKeyName: "match_evaluations_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "v_contractor_trust_summary"
            referencedColumns: ["contractor_id"]
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
          {
            foreignKeyName: "match_evaluations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_map_markers"
            referencedColumns: ["id"]
          },
        ]
      }
      v_property_map_markers: {
        Row: {
          certification_status: string | null
          city: string | null
          created_at: string | null
          estimated_score: number | null
          id: string | null
          latitude: number | null
          longitude: number | null
          neighborhood: string | null
          photo_url: string | null
          property_type: string | null
          public_status: string | null
          slug: string | null
          year_built: number | null
        }
        Insert: {
          certification_status?: string | null
          city?: string | null
          created_at?: string | null
          estimated_score?: number | null
          id?: string | null
          latitude?: never
          longitude?: never
          neighborhood?: string | null
          photo_url?: string | null
          property_type?: string | null
          public_status?: string | null
          slug?: string | null
          year_built?: number | null
        }
        Update: {
          certification_status?: string | null
          city?: string | null
          created_at?: string | null
          estimated_score?: number | null
          id?: string | null
          latitude?: never
          longitude?: never
          neighborhood?: string | null
          photo_url?: string | null
          property_type?: string | null
          public_status?: string | null
          slug?: string | null
          year_built?: number | null
        }
        Relationships: []
      }
      v_renovation_activity_map: {
        Row: {
          city: string | null
          contractor_name: string | null
          contractor_slug: string | null
          contribution_status:
            | Database["public"]["Enums"]["contribution_status"]
            | null
          created_at: string | null
          id: string | null
          latitude: number | null
          longitude: number | null
          neighborhood: string | null
          work_date: string | null
          work_type: string | null
        }
        Relationships: []
      }
      v_territories: {
        Row: {
          available_elite: number | null
          available_premium: number | null
          available_pro: number | null
          available_recrue: number | null
          available_signature: number | null
          available_total: number | null
          category_name: string | null
          category_slug: string | null
          city_name: string | null
          city_slug: string | null
          competition_score: number | null
          created_at: string | null
          demand_score: number | null
          generation_source: string | null
          id: string | null
          is_active: boolean | null
          is_overbooked: boolean | null
          market_tier: string | null
          max_entrepreneurs: number | null
          occupied_elite: number | null
          occupied_premium: number | null
          occupied_pro: number | null
          occupied_recrue: number | null
          occupied_signature: number | null
          occupied_total: number | null
          province_code: string | null
          region_name: string | null
          slots_elite: number | null
          slots_premium: number | null
          slots_pro: number | null
          slots_recrue: number | null
          slots_signature: number | null
          status: string | null
          strategic_score: number | null
          updated_at: string | null
        }
        Insert: {
          available_elite?: never
          available_premium?: never
          available_pro?: never
          available_recrue?: never
          available_signature?: never
          available_total?: never
          category_name?: string | null
          category_slug?: string | null
          city_name?: string | null
          city_slug?: string | null
          competition_score?: number | null
          created_at?: string | null
          demand_score?: number | null
          generation_source?: string | null
          id?: string | null
          is_active?: boolean | null
          is_overbooked?: never
          market_tier?: string | null
          max_entrepreneurs?: number | null
          occupied_elite?: number | null
          occupied_premium?: number | null
          occupied_pro?: number | null
          occupied_recrue?: number | null
          occupied_signature?: number | null
          occupied_total?: never
          province_code?: string | null
          region_name?: string | null
          slots_elite?: number | null
          slots_premium?: number | null
          slots_pro?: number | null
          slots_recrue?: number | null
          slots_signature?: number | null
          status?: string | null
          strategic_score?: number | null
          updated_at?: string | null
        }
        Update: {
          available_elite?: never
          available_premium?: never
          available_pro?: never
          available_recrue?: never
          available_signature?: never
          available_total?: never
          category_name?: string | null
          category_slug?: string | null
          city_name?: string | null
          city_slug?: string | null
          competition_score?: number | null
          created_at?: string | null
          demand_score?: number | null
          generation_source?: string | null
          id?: string | null
          is_active?: boolean | null
          is_overbooked?: never
          market_tier?: string | null
          max_entrepreneurs?: number | null
          occupied_elite?: number | null
          occupied_premium?: number | null
          occupied_pro?: number | null
          occupied_recrue?: number | null
          occupied_signature?: number | null
          occupied_total?: never
          province_code?: string | null
          region_name?: string | null
          slots_elite?: number | null
          slots_premium?: number | null
          slots_pro?: number | null
          slots_recrue?: number | null
          slots_signature?: number | null
          status?: string | null
          strategic_score?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      vw_jve_trade_estimation_defaults: {
        Row: {
          city_slug: string | null
          confidence_score: number | null
          estimated_avg_value: number | null
          estimated_capacity: number | null
          estimated_closing_rate: number | null
          estimated_profit_margin: number | null
          specialty_slug: string | null
          trade_slug: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_contractor_live_score: {
        Args: { p_contractor_id: string }
        Returns: Json
      }
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
      calculate_waitlist_score: {
        Args: { p_waitlist_id: string }
        Returns: Json
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_territories: {
        Args: {
          p_category_slugs?: string[]
          p_city_slugs?: string[]
          p_executed_by?: string
          p_generation_source?: string
          p_mode?: string
          p_overwrite_existing_capacities?: boolean
        }
        Returns: Json
      }
      get_avg_job_value: {
        Args: {
          p_city_slug?: string
          p_is_emergency?: boolean
          p_is_premium?: boolean
          p_specialty_slug?: string
          p_trade_slug: string
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
      get_territory_capacity: {
        Args: {
          p_allow_signature_in_micro?: boolean
          p_category_slug: string
          p_market_tier: string
        }
        Returns: {
          max_entrepreneurs: number
          slots_elite: number
          slots_premium: number
          slots_pro: number
          slots_recrue: number
          slots_signature: number
        }[]
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
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      owns_verification_run: {
        Args: { _run_id: string; _user_id: string }
        Returns: boolean
      }
      process_waitlist_replacement: {
        Args: { p_territory_id: string; p_threshold?: number }
        Returns: Json
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      resolve_qr_token: { Args: { _token: string }; Returns: Json }
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
      set_current_authority_score: {
        Args: { _contractor_id: string; _score_id: string }
        Returns: undefined
      }
      set_current_contractor_aipp_score: {
        Args: { _contractor_id: string; _score_id: string }
        Returns: undefined
      }
      unpro_aipp_tier: { Args: { score: number }; Returns: string }
      validate_article_readiness: {
        Args: { _article_id: string }
        Returns: Json
      }
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
        | "confirmed"
        | "reschedule_requested"
      compatibility_result: "compatible" | "partial" | "verify" | "incompatible"
      contribution_status: "pending" | "approved" | "rejected" | "expired"
      duplicate_review_status:
        | "pending"
        | "confirmed_duplicate"
        | "not_duplicate"
        | "same_brand_separate_location"
        | "needs_more_proof"
        | "merged"
      entity_confidence:
        | "clear_unique"
        | "likely_duplicate"
        | "possible_duplicate"
        | "ambiguous_shared_identity"
        | "suspicious_low_confidence"
      identity_coherence:
        | "strong"
        | "moderate"
        | "weak"
        | "contradictory"
        | "unknown"
      image_asset_type:
        | "truck"
        | "contract"
        | "business_card"
        | "invoice"
        | "storefront"
        | "logo"
        | "unknown"
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
      neq_status: "active" | "inactive" | "struck_off" | "not_found" | "unknown"
      project_fit: "compatible" | "partial" | "verify" | "incompatible"
      property_condition: "excellent" | "good" | "fair" | "poor" | "critical"
      qr_type: "property_plate" | "electrical_panel" | "jobsite_temporary"
      quote_status: "pending" | "analyzed" | "accepted" | "rejected"
      rbq_category_type: "general" | "specialty"
      rbq_status: "valid" | "expired" | "suspended" | "not_found" | "unknown"
      risk_severity: "low" | "medium" | "high"
      syndicate_member_role:
        | "owner"
        | "board_member"
        | "manager"
        | "administrator"
      verification_input_type:
        | "phone"
        | "name"
        | "rbq"
        | "neq"
        | "website"
        | "upload"
      verification_status: "unverified" | "pending" | "verified" | "rejected"
      verification_verdict:
        | "succes"
        | "attention"
        | "non_succes"
        | "se_tenir_loin"
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
        "confirmed",
        "reschedule_requested",
      ],
      compatibility_result: ["compatible", "partial", "verify", "incompatible"],
      contribution_status: ["pending", "approved", "rejected", "expired"],
      duplicate_review_status: [
        "pending",
        "confirmed_duplicate",
        "not_duplicate",
        "same_brand_separate_location",
        "needs_more_proof",
        "merged",
      ],
      entity_confidence: [
        "clear_unique",
        "likely_duplicate",
        "possible_duplicate",
        "ambiguous_shared_identity",
        "suspicious_low_confidence",
      ],
      identity_coherence: [
        "strong",
        "moderate",
        "weak",
        "contradictory",
        "unknown",
      ],
      image_asset_type: [
        "truck",
        "contract",
        "business_card",
        "invoice",
        "storefront",
        "logo",
        "unknown",
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
      neq_status: ["active", "inactive", "struck_off", "not_found", "unknown"],
      project_fit: ["compatible", "partial", "verify", "incompatible"],
      property_condition: ["excellent", "good", "fair", "poor", "critical"],
      qr_type: ["property_plate", "electrical_panel", "jobsite_temporary"],
      quote_status: ["pending", "analyzed", "accepted", "rejected"],
      rbq_category_type: ["general", "specialty"],
      rbq_status: ["valid", "expired", "suspended", "not_found", "unknown"],
      risk_severity: ["low", "medium", "high"],
      syndicate_member_role: [
        "owner",
        "board_member",
        "manager",
        "administrator",
      ],
      verification_input_type: [
        "phone",
        "name",
        "rbq",
        "neq",
        "website",
        "upload",
      ],
      verification_status: ["unverified", "pending", "verified", "rejected"],
      verification_verdict: [
        "succes",
        "attention",
        "non_succes",
        "se_tenir_loin",
      ],
      vote_status: ["draft", "open", "closed", "cancelled"],
    },
  },
} as const
