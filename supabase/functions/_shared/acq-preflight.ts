// Shared preflight + structured-response helpers for acq-* edge functions.
// Goal: every function returns HTTP 200 with `{ ok: boolean, ... }` so the UI
// can show the real cause instead of "non-2xx status code".

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
};

export type StructuredOk<T = Record<string, unknown>> = {
  ok: true;
  step: string;
} & T;

export type StructuredErr = {
  ok: false;
  step: string;
  error_code: string;
  message: string;
  missing?: string[];
  next_action?: string;
  details?: unknown;
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

export function structuredOk<T extends Record<string, unknown>>(
  step: string,
  payload: T,
): Response {
  return jsonResponse({ ok: true, step, ...payload });
}

export function structuredError(err: StructuredErr): Response {
  // Always 200 — the UI inspects `ok` to render error UI without raw crash.
  return jsonResponse(err, 200);
}

export const MODULE_SECRETS: Record<string, string[]> = {
  discover: ["GOOGLE_PLACES_API_KEY"],
  cascade: ["GOOGLE_PLACES_API_KEY"],
  extract: [], // FIRECRAWL optional (fallback to basic fetch)
  score_aipp: [], // rule-based by default
  generate_messages: ["LOVABLE_API_KEY"],
  test_email: ["RESEND_API_KEY"],
  test_sms: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"],
  launch_outreach: [],
};

export const SECRET_NEXT_ACTION: Record<string, string> = {
  GOOGLE_PLACES_API_KEY: "Ajouter GOOGLE_PLACES_API_KEY dans les secrets pour activer la découverte Google.",
  FIRECRAWL_API_KEY: "Ajouter FIRECRAWL_API_KEY pour l'extraction de site complète (fallback basique actif).",
  LOVABLE_API_KEY: "LOVABLE_API_KEY est auto-provisionné — contacter le support si manquant.",
  RESEND_API_KEY: "Ajouter RESEND_API_KEY ou connecter Resend dans les connecteurs pour activer l'email.",
  TWILIO_ACCOUNT_SID: "Ajouter les secrets Twilio (SID + AUTH_TOKEN) pour activer les SMS.",
  TWILIO_AUTH_TOKEN: "Ajouter les secrets Twilio (SID + AUTH_TOKEN) pour activer les SMS.",
  TWILIO_MESSAGING_SERVICE_SID: "Ajouter TWILIO_MESSAGING_SERVICE_SID ou un numéro From dédié.",
};

export function checkSecrets(names: string[]): string[] {
  return names.filter((n) => !Deno.env.get(n));
}

export function requireSecrets(step: string, names: string[]): Response | null {
  const missing = checkSecrets(names);
  if (missing.length === 0) return null;
  const next = missing.map((m) => SECRET_NEXT_ACTION[m] ?? `Configurer ${m}.`).join(" ");
  return structuredError({
    ok: false,
    step,
    error_code: "MISSING_SECRET",
    message: `Secrets requis manquants: ${missing.join(", ")}`,
    missing,
    next_action: next,
  });
}

export function svcClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export async function logAction(
  s: SupabaseClient,
  params: {
    action: string;
    status: "success" | "error" | "blocked";
    request_payload?: unknown;
    response_payload?: unknown;
    error_code?: string;
    error_message?: string;
    missing_secrets?: string[];
  },
): Promise<void> {
  try {
    await s.from("acquisition_action_logs").insert({
      action: params.action,
      status: params.status,
      request_payload: params.request_payload ?? null,
      response_payload: params.response_payload ?? null,
      error_code: params.error_code ?? null,
      error_message: params.error_message ?? null,
      missing_secrets: params.missing_secrets ?? null,
    });
  } catch (_e) {
    // never block on logging
  }
}

export async function updateHealth(
  s: SupabaseClient,
  system_name: string,
  patch: {
    status: "ok" | "degraded" | "paused" | "error";
    error_code?: string | null;
    message?: string | null;
    missing_secrets?: string[];
    proposed_fix?: string | null;
  },
): Promise<void> {
  try {
    await s.from("acquisition_system_health").upsert(
      {
        system_name,
        status: patch.status,
        error_code: patch.error_code ?? null,
        message: patch.message ?? null,
        missing_secrets: patch.missing_secrets ?? [],
        proposed_fix: patch.proposed_fix ?? null,
        last_checked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "system_name" },
    );
  } catch (_e) {
    // ignore
  }
}

/**
 * Wraps a handler so any throw is converted into a structured 200 response,
 * and every invocation is logged to acquisition_action_logs.
 */
export function wrap(
  action: string,
  handler: (req: Request, body: any, s: SupabaseClient) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    const s = svcClient();
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    try {
      const res = await handler(req, body, s);
      // best-effort log; clone to read body
      try {
        const clone = res.clone();
        const txt = await clone.text();
        let parsed: any = null;
        try { parsed = JSON.parse(txt); } catch { /* ignore */ }
        await logAction(s, {
          action,
          status: parsed?.ok === false ? "error" : "success",
          request_payload: body,
          response_payload: parsed ?? txt.slice(0, 2000),
          error_code: parsed?.error_code,
          error_message: parsed?.message,
          missing_secrets: parsed?.missing,
        });
      } catch { /* ignore */ }
      return res;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const stack = e instanceof Error ? e.stack : undefined;
      console.error(`[${action}] UNCAUGHT`, msg, stack);
      const payload: StructuredErr = {
        ok: false,
        step: action,
        error_code: "UNEXPECTED_ERROR",
        message: msg,
        next_action: "Consulter les logs (acquisition_action_logs) pour la trace complète.",
        details: { stack: stack?.slice(0, 1500) },
      };
      await logAction(s, {
        action,
        status: "error",
        request_payload: body,
        response_payload: payload,
        error_code: payload.error_code,
        error_message: msg,
      });
      return jsonResponse(payload, 200);
    }
  };
}
