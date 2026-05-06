// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { role, terms_version, accepted, user_agent, form } = body || {};

    if (!role || !terms_version || !accepted || !form?.email) {
      return json({ error: "Champs requis manquants." }, 400);
    }
    const allowedRoles = ["affiliate", "ambassador", "certified_partner"];
    if (!allowedRoles.includes(role)) return json({ error: "Rôle invalide." }, 400);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE);

    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || null;

    // Resolve user (if authenticated)
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
      const { data } = await userClient.auth.getUser();
      userId = data.user?.id ?? null;
    }

    // Check existing partner
    if (userId) {
      const { data: existing } = await admin.from("partners").select("id").eq("user_id", userId).maybeSingle();
      if (existing) {
        return json({ error: "Une demande existe déjà pour ce compte.", partner_id: existing.id }, 409);
      }
    }

    const { data: partner, error: pErr } = await admin.from("partners").insert({
      user_id: userId,
      email: form.email,
      first_name: form.first_name,
      last_name: form.last_name,
      phone: form.phone,
      city: form.city,
      company: form.company || null,
      partner_type: role,
      partner_tier: role === "affiliate" ? "affiliate" : "certified",
      partner_status: "pending",
      partner_application_status: "pending",
      application_submitted_at: new Date().toISOString(),
      application_data: {
        sales_experience: form.sales_experience,
        network_size: form.network_size,
        goals: form.goals,
        motivation: form.motivation,
      },
    }).select("id").single();

    if (pErr) return json({ error: pErr.message }, 400);

    await admin.from("partner_terms_acceptance").insert({
      partner_id: partner.id, user_id: userId,
      role, terms_version, accepted: true,
      ip_address: ip, user_agent: user_agent || null,
    });

    await admin.from("partner_audit_logs").insert({
      partner_id: partner.id, user_id: userId,
      action: "application_submitted",
      metadata: { role, terms_version },
      ip_address: ip,
    });

    return json({ ok: true, partner_id: partner.id, requires_login: !userId });
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
