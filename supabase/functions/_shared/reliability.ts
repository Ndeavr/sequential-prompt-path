/**
 * UNPRO — Reliability contract for Deno edge functions.
 * Mirror of src/lib/reliability/* — single source of canonical codes.
 * See mem://standards/production-reliability-framework
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type BusinessOutcome = "achieved" | "blocked" | "failed" | "partial" | "pending";

export const FailureCode = {
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
  STRIPE_WEBHOOK_FAILED: "STRIPE_WEBHOOK_FAILED",
  PAYMENT_DECLINED: "PAYMENT_DECLINED",
  CHECKOUT_EXPIRED: "CHECKOUT_EXPIRED",
  CONTRACTOR_ALREADY_ACTIVATED: "CONTRACTOR_ALREADY_ACTIVATED",
  PROFILE_INCOMPLETE: "PROFILE_INCOMPLETE",
  SUPABASE_TIMEOUT: "SUPABASE_TIMEOUT",
  MISSING_SECRET: "MISSING_SECRET",
  EXTERNAL_TIMEOUT: "EXTERNAL_TIMEOUT",
  UNKNOWN: "UNKNOWN",
} as const;
export type FailureCode = typeof FailureCode[keyof typeof FailureCode];

export const BlockReason = {
  SMS_QUOTA_REACHED: "SMS_QUOTA_REACHED",
  EMAIL_QUOTA_REACHED: "EMAIL_QUOTA_REACHED",
  DUPLICATE_CONTACT: "DUPLICATE_CONTACT",
  OPT_OUT: "OPT_OUT",
  SEND_WINDOW_CLOSED: "SEND_WINDOW_CLOSED",
  AWAITING_APPROVAL: "AWAITING_APPROVAL",
  NO_MESSAGE_GENERATED: "NO_MESSAGE_GENERATED",
  MISSING_SECRET: "MISSING_SECRET",
} as const;
export type BlockReason = typeof BlockReason[keyof typeof BlockReason];

export const RETRY_BACKOFF_MIN = [5, 30, 120, 720] as const;

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

function adminClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key);
}

/** Log every terminal state. Never throws. */
export async function reportOutcome(r: OperationReport): Promise<void> {
  try {
    const sb = adminClient();
    await sb.from("platform_operation_outcomes").insert({
      operation: r.operation,
      intent: r.intent ?? null,
      business_outcome: r.outcome,
      failure_code: r.failure_code ?? null,
      block_reason: r.block_reason ?? null,
      affected_record: r.affected_record ?? null,
      service: r.service ?? null,
      attempt: r.attempt ?? 1,
      next_retry_at: r.next_retry_at ?? null,
      revenue_impact_cents: r.revenue_impact_cents ?? null,
      next_action: r.next_action ?? null,
      payload: r.payload ?? null,
    });
  } catch (e) {
    console.error("[reliability] reportOutcome failed", e, r);
  }
}

export interface RetryOptions {
  maxAttempts?: number;
  shouldRetry?: (err: unknown, attempt: number) => boolean;
  delaysMs?: number[];
}

const defaultDelays = RETRY_BACKOFF_MIN.map((m) => m * 60_000);

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const delays = opts.delaysMs ?? defaultDelays;
  const max = opts.maxAttempts ?? delays.length + 1;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= max; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const retryable = opts.shouldRetry ? opts.shouldRetry(err, attempt) : true;
      if (!retryable || attempt >= max) break;
      await new Promise((r) => setTimeout(r, delays[Math.min(attempt - 1, delays.length - 1)]));
    }
  }
  throw lastErr;
}

export function nextRetryAt(attempt: number): string {
  const idx = Math.min(attempt - 1, RETRY_BACKOFF_MIN.length - 1);
  return new Date(Date.now() + RETRY_BACKOFF_MIN[idx] * 60_000).toISOString();
}
