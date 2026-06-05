/**
 * UNPRO — Production Reliability Framework
 * Canonical types for business-outcome reporting.
 * See mem://standards/production-reliability-framework
 */

export type BusinessOutcome = "achieved" | "blocked" | "failed" | "partial" | "pending";

/** Canonical failure codes. NEVER use free-form strings. Extend here when needed. */
export const FailureCode = {
  // Messaging
  SMS_QUOTA_REACHED: "SMS_QUOTA_REACHED",
  INVALID_PHONE: "INVALID_PHONE",
  TWILIO_AUTH_ERROR: "TWILIO_AUTH_ERROR",
  TWILIO_RATE_LIMIT: "TWILIO_RATE_LIMIT",
  TWILIO_PROVIDER_ERROR: "TWILIO_PROVIDER_ERROR",
  RESEND_PROVIDER_ERROR: "RESEND_PROVIDER_ERROR",
  EMAIL_QUOTA_REACHED: "EMAIL_QUOTA_REACHED",
  NO_MESSAGE_GENERATED: "NO_MESSAGE_GENERATED",
  OPT_OUT: "OPT_OUT",
  DUPLICATE_CONTACT: "DUPLICATE_CONTACT",
  DUPLICATE_LEAD: "DUPLICATE_LEAD",
  // Payments
  STRIPE_WEBHOOK_FAILED: "STRIPE_WEBHOOK_FAILED",
  PAYMENT_DECLINED: "PAYMENT_DECLINED",
  CHECKOUT_EXPIRED: "CHECKOUT_EXPIRED",
  // Activation
  CONTRACTOR_ALREADY_ACTIVATED: "CONTRACTOR_ALREADY_ACTIVATED",
  PROFILE_INCOMPLETE: "PROFILE_INCOMPLETE",
  // Launch
  SCOUT_NO_RESULTS: "SCOUT_NO_RESULTS",
  ENRICHMENT_FAILED: "ENRICHMENT_FAILED",
  VISIBILITY_SCORE_FAILED: "VISIBILITY_SCORE_FAILED",
  REPLY_CLASSIFICATION_FAILED: "REPLY_CLASSIFICATION_FAILED",
  ACTIVATION_FAILED: "ACTIVATION_FAILED",
  // Infra
  SUPABASE_TIMEOUT: "SUPABASE_TIMEOUT",
  MISSING_SECRET: "MISSING_SECRET",
  EXTERNAL_TIMEOUT: "EXTERNAL_TIMEOUT",
  UNKNOWN: "UNKNOWN",
} as const;
export type FailureCode = typeof FailureCode[keyof typeof FailureCode];

/** Canonical block reasons (non-error blocks: quotas, gating, dedupe, …). */
export const BlockReason = {
  SMS_QUOTA_REACHED: "SMS_QUOTA_REACHED",
  EMAIL_QUOTA_REACHED: "EMAIL_QUOTA_REACHED",
  DUPLICATE_CONTACT: "DUPLICATE_CONTACT",
  OPT_OUT: "OPT_OUT",
  SEND_WINDOW_CLOSED: "SEND_WINDOW_CLOSED",
  AWAITING_APPROVAL: "AWAITING_APPROVAL",
  NO_MESSAGE_GENERATED: "NO_MESSAGE_GENERATED",
  MISSING_SECRET: "MISSING_SECRET",
  LAUNCH_PAUSED: "LAUNCH_PAUSED",
  LAUNCH_IDLE: "LAUNCH_IDLE",
  FOLLOWUP_MAX_ATTEMPTS: "FOLLOWUP_MAX_ATTEMPTS",
} as const;
export type BlockReason = typeof BlockReason[keyof typeof BlockReason];

export interface OperationReport {
  operation: string;
  intent?: string;
  outcome: BusinessOutcome;
  failure_code?: FailureCode | null;
  block_reason?: BlockReason | null;
  affected_record?: string | null;
  service?: string | null;
  attempt?: number;
  next_retry_at?: string | null;
  revenue_impact_cents?: number | null;
  next_action?: string | null;
  payload?: Record<string, unknown>;
}

/** Standard retry backoff in minutes. */
export const RETRY_BACKOFF_MIN = [5, 30, 120, 720] as const;
