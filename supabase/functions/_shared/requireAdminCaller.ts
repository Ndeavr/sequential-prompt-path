/**
 * UNPRO — Canonical caller guard for sensitive edge functions (SMS senders).
 * Allows:
 *  - internal server calls using the service-role key (functions.invoke from other functions)
 *  - authenticated users holding role 'admin' in public.user_roles
 * Returns a Response (401/403) to short-circuit, or the caller identity.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type AdminCaller =
  | { ok: true; kind: "service" | "admin"; userId: string | null }
  | { ok: false; response: Response };

function decodeRole(token: string): string | null {
  try {
    const p = token.split(".")[1];
    if (!p) return null;
    const json = JSON.parse(atob(p.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json?.role === "string" ? json.role : null;
  } catch {
    return null;
  }
}

export async function requireAdminCaller(req: Request, cors: Record<string, string>, fn?: string): Promise<AdminCaller> {
  const deny = (status: number, error: string): AdminCaller => {
    if (fn) logAccess(fn, "blocked", { http_status: status, reason: error });
    return denyRaw(status, error);
  };
  const denyRaw = (status: number, error: string): AdminCaller => ({
    ok: false,
    response: new Response(JSON.stringify({ ok: false, error }), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    }),
  });

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return deny(401, "unauthorized");

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  // Internal server-to-server call.
  if (serviceKey && token === serviceKey) {
    if (fn) logAccess(fn, "pending", { caller_kind: "service" });
    return { ok: true, kind: "service", userId: null };
  }

  // Anon key alone is never enough.
  if (token === anonKey || decodeRole(token) === "anon") return deny(401, "unauthorized");

  const authClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data?.user) return deny(401, "unauthorized");

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: role, error: roleErr } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (roleErr) return deny(500, "role_check_failed");
  if (!role) return deny(403, "forbidden");
  if (fn) logAccess(fn, "pending", { caller_kind: "admin", user_id: data.user.id });
  return { ok: true, kind: "admin", userId: data.user.id };
}

export function maskPhone(p: string | null | undefined): string {
  const s = String(p ?? "").replace(/\s+/g, "");
  if (s.length < 6) return "***";
  return `${s.slice(0, 3)}•••••${s.slice(-4)}`;
}

/** Fire-and-forget access audit into platform_operation_outcomes (existing diagnostics table). */
function logAccess(fn: string, outcome: "blocked" | "pending", payload: Record<string, unknown>) {
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false } });
    sb.from("platform_operation_outcomes").insert({
      operation: `access.${fn}`,
      intent: "sensitive_endpoint_access",
      business_outcome: outcome,
      block_reason: outcome === "blocked" ? String(payload.reason ?? "denied") : null,
      service: "edge_auth",
      payload,
    }).then(({ error }: any) => { if (error) console.error("[requireAdminCaller] audit insert failed", error.message); });
  } catch (e) { console.error("[requireAdminCaller] audit failed", e); }
}

/**
 * Uniform safe mode for sensitive senders. Call right AFTER requireAdminCaller.
 * `validate_only: true` proves authorization and stops: no campaign, no
 * prospect, no queue write, never a provider call.
 */
export async function validateOnlyResponse(
  req: Request,
  cors: Record<string, string>,
  caller: Extract<AdminCaller, { ok: true }>,
  fn: string,
): Promise<Response | null> {
  let body: any = null;
  try { body = await req.clone().json(); } catch { return null; }
  if (body?.validate_only !== true) return null;
  return new Response(
    JSON.stringify({ ok: true, authorized: true, dry_run: true, validate_only: true, sent: 0, function: fn, caller_kind: caller.kind }),
    { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
  );
}
