// @ts-nocheck
// Shared admin actions: approve | reject | suspend partner application
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export async function handlePartnerAction(req: Request, action: "approve" | "reject" | "suspend") {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return j({ error: "Unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await userClient.auth.getUser();
    const adminUserId = u.user?.id;
    if (!adminUserId) return j({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: roleData } = await admin.from("user_roles").select("role").eq("user_id", adminUserId);
    if (!(roleData ?? []).some((r: any) => r.role === "admin")) return j({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const { partner_id, admin_notes } = body || {};
    if (!partner_id) return j({ error: "partner_id requis" }, 400);

    const patch: any = {
      admin_notes: admin_notes ?? null,
      application_reviewed_at: new Date().toISOString(),
      application_reviewed_by: adminUserId,
    };

    if (action === "approve") {
      patch.partner_application_status = "approved";
      patch.partner_status = "approved";
      patch.approved_at = new Date().toISOString();
    } else if (action === "reject") {
      patch.partner_application_status = "rejected";
      patch.partner_status = "rejected";
    } else {
      patch.partner_application_status = "suspended";
      patch.partner_status = "suspended";
    }

    const { data: partner, error: uErr } = await admin.from("partners")
      .update(patch).eq("id", partner_id).select("user_id, partner_type").single();
    if (uErr) return j({ error: uErr.message }, 400);

    if (action === "approve" && partner?.user_id) {
      await admin.from("user_roles").insert({ user_id: partner.user_id, role: "partner" })
        .then((r: any) => r.error && console.warn("role insert", r.error.message));
    }

    await admin.from("partner_audit_logs").insert({
      partner_id, user_id: adminUserId,
      action: `application_${action}d`,
      metadata: { admin_notes },
    });

    return j({ ok: true });
  } catch (e) {
    return j({ error: String(e?.message ?? e) }, 500);
  }
}

function j(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
