// Phase 6 — Final report snapshot for the Recovery Sprint panel.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const one = async (q: any) => (await q).count ?? 0;
  const imported = await one(sb.from("contractor_leads").select("id", { count: "exact", head: true }));
  const contactable = await one(sb.from("contractor_leads").select("id", { count: "exact", head: true }).or("phone.not.is.null,email.not.is.null"));
  const ready = await one(sb.from("contractor_leads").select("id", { count: "exact", head: true }).eq("lead_status", "ready_for_contact"));
  const queued = await one(sb.from("alex_outreach_queue").select("id", { count: "exact", head: true }).eq("status", "pending"));
  const has_website = await one(sb.from("contractor_leads").select("id", { count: "exact", head: true }).not("website_url", "is", null));
  const no_contact = await one(sb.from("contractor_leads").select("id", { count: "exact", head: true }).is("phone", null).is("email", null));

  const { data: top20 } = await sb
    .from("contractor_leads")
    .select("id, company_name, phone, email, lead_status, priority_score, city")
    .eq("lead_status", "ready_for_contact")
    .order("priority_score", { ascending: false, nullsFirst: false })
    .limit(20);

  const { data: fastest10 } = await sb
    .from("contractor_leads")
    .select("id, company_name, phone, email, phone_type, city")
    .eq("lead_status", "ready_for_contact")
    .or("phone_type.eq.mobile,email.not.is.null")
    .order("priority_score", { ascending: false, nullsFirst: false })
    .limit(10);

  return new Response(JSON.stringify({
    ok: true,
    counters: { imported, contactable, ready_for_contact: ready, queued, has_website, no_contact },
    top20: top20 ?? [],
    fastest_10_activations: fastest10 ?? [],
    generated_at: new Date().toISOString(),
  }), { headers: { ...cors, "Content-Type": "application/json" } });
});
