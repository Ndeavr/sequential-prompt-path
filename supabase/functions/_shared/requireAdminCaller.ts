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

export async function requireAdminCaller(req: Request, cors: Record<string, string>): Promise<AdminCaller> {
  const deny = (status: number, error: string): AdminCaller => ({
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
  if (serviceKey && token === serviceKey) return { ok: true, kind: "service", userId: null };

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
  return { ok: true, kind: "admin", userId: data.user.id };
}

export function maskPhone(p: string | null | undefined): string {
  const s = String(p ?? "").replace(/\s+/g, "");
  if (s.length < 6) return "***";
  return `${s.slice(0, 3)}•••••${s.slice(-4)}`;
}
