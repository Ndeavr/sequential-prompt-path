/**
 * UNPRO — AI Self-Optimizing System Types
 */

export interface OptimizationOpportunity {
  id: string;
  screen_key: string;
  opportunity_type: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence_score: number;
  supporting_metrics: Record<string, unknown>;
  status: 'open' | 'in_progress' | 'resolved' | 'dismissed';
  created_at: string;
  updated_at: string;
}

export interface OptimizationExperiment {
  id: string;
  screen_key: string;
  experiment_type: ExperimentType;
  name: string;
  description: string | null;
  hypothesis: string | null;
  primary_metric: string;
  secondary_metrics: string[];
  status: ExperimentStatus;
  traffic_allocation_percent: number;
  minimum_sample_size: number;
  started_at: string | null;
  ended_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  variants?: OptimizationVariant[];
}

export type ExperimentType =
  | 'cta_copy_test'
  | 'cta_position_test'
  | 'trust_block_order_test'
  | 'share_prompt_test'
  | 'booking_reassurance_test'
  | 'compare_prompt_test'
  | 'alex_timing_test'
  | 'alex_copy_test'
  | 'empty_state_test'
  | 'sticky_cta_test'
  | 'section_order_test'
  | 'match_explanation_test';

export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed' | 'archived';

export interface OptimizationVariant {
  id: string;
  experiment_id: string;
  variant_key: string;
  variant_name: string;
  variant_type: string;
  config_json: Record<string, unknown>;
  is_control: boolean;
  status: string;
  created_at: string;
}

export interface ExperimentAssignment {
  id: string;
  experiment_id: string;
  variant_id: string;
  user_id: string | null;
  session_id: string | null;
  screen_key: string;
  assigned_at: string;
}

export interface ExperimentEvent {
  id: string;
  experiment_id: string;
  variant_id: string;
  user_id: string | null;
  session_id: string | null;
  screen_key: string;
  event_type: string;
  event_value: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface WinningVariant {
  id: string;
  experiment_id: string;
  variant_id: string;
  screen_key: string;
  decision_reason: string | null;
  primary_metric_lift_percent: number;
  confidence_score: number;
  approved_by: string | null;
  auto_promoted: boolean;
  created_at: string;
  experiment?: OptimizationExperiment;
  variant?: OptimizationVariant;
}

export interface OptimizationRule {
  id: string;
  rule_key: string;
  rule_name: string;
  scope: string;
  is_active: boolean;
  config_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface OptimizationAlert {
  id: string;
  experiment_id: string | null;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string | null;
  status: 'open' | 'resolved';
  created_at: string;
  resolved_at: string | null;
}

export interface UIBlock {
  id: string;
  block_key: string;
  screen_key: string;
  block_name: string;
  block_type: string;
  default_config: Record<string, unknown>;
  is_experimentable: boolean;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
}

export interface CopyVariant {
  id: string;
  screen_key: string;
  block_key: string;
  copy_type: string;
  language: string;
  variant_key: string;
  content: string;
  is_active: boolean;
  created_at: string;
}

export interface VariantMetrics {
  variant_id: string;
  variant_key: string;
  variant_name: string;
  is_control: boolean;
  impressions: number;
  conversions: number;
  ctr: number;
  lift_percent: number;
}

export const EXPERIMENT_TYPE_LABELS: Record<ExperimentType, string> = {
  cta_copy_test: 'Test CTA copy',
  cta_position_test: 'Test position CTA',
  trust_block_order_test: 'Test ordre bloc confiance',
  share_prompt_test: 'Test prompt partage',
  booking_reassurance_test: 'Test réassurance booking',
  compare_prompt_test: 'Test prompt comparaison',
  alex_timing_test: 'Test timing Alex',
  alex_copy_test: 'Test copy Alex',
  empty_state_test: 'Test état vide',
  sticky_cta_test: 'Test CTA sticky',
  section_order_test: 'Test ordre sections',
  match_explanation_test: 'Test explication match',
};

export const EXPERIMENT_STATUS_LABELS: Record<ExperimentStatus, string> = {
  draft: 'Brouillon',
  running: 'En cours',
  paused: 'En pause',
  completed: 'Terminé',
  archived: 'Archivé',
};

export const RISK_LEVEL_COLORS: Record<string, string> = {
  low: 'text-success',
  medium: 'text-warning',
  high: 'text-destructive',
  critical: 'text-destructive',
};

export const QUICK_EXPERIMENT_TEMPLATES = [
  { type: 'cta_copy_test' as ExperimentType, label: 'Test CTA', icon: 'MousePointer', description: 'Tester un nouveau texte de bouton' },
  { type: 'share_prompt_test' as ExperimentType, label: 'Test partage', icon: 'Share2', description: 'Tester un prompt de partage' },
  { type: 'booking_reassurance_test' as ExperimentType, label: 'Test réassurance', icon: 'ShieldCheck', description: 'Tester un bloc de confiance booking' },
  { type: 'alex_timing_test' as ExperimentType, label: 'Test Alex', icon: 'Bot', description: 'Tester le moment d\'intervention Alex' },
];
