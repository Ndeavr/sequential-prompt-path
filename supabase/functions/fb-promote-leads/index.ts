// Promote selected facebook_extracted_comments to fb_contractor_leads with dedupe + AIPP score
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function normPhone(s?: string | null) {
  if (!s) return null;
  const d = s.replace(/[^\d]/g, "");
  return d.length >= 10 ? d.slice(-10) : null;
}
function normEmail(s?: string | null) { return s ? s.toLowerCase().trim() : null; }
function normCompany(s?: string | null) {
  if (!s) return null;
  return s.toLowerCase().replace(/\b(inc|ltée|ltee|ltd|enr|senc)\b\.?/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}
function dupKey(c: any) {
  return [normPhone(c.phone), normEmail(c.email), normCompany(c.company_name)].filter(Boolean).join("|") || null;
}

function aippScore(l: any): number {
  let s = 0;
  if (l.rbq_number) s += 20;
  if (l.neq_number) s += 10;
  if (l.website_url) s += 15;
  if (l.google_business_url) s += 15;
  if (l.google_rating && Number(l.google_rating) >= 4.5) s += 10;
  if (l.google_review_count && Number(l.google_review_count) >= 25) s += 10;
  if (l.email && !/(gmail|hotmail|yahoo|outlook|live)\./i.test(l.email)) s += 5;
  if (l.trade_category) s += 5;
  if (l.city) s += 5;
  if (l.availability_text) s += 5;
  return Math.min(s, 100);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
    const svc = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: isAdmin } = await svc.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: corsHeaders });

    const { comment_ids } = (await req.json()) as { comment_ids: string[] };
    if (!comment_ids?.length) return new Response(JSON.stringify({ created: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: comments } = await svc.from("facebook_extracted_comments").select("*").in("id", comment_ids);
    let created = 0, duplicates = 0;
    for (const c of comments ?? []) {
      const key = dupKey({ ...c, availability_text: c.availability_text });
      // dedupe
      let isDup = false;
      if (key) {
        const { data: existing } = await svc.from("fb_contractor_leads").select("id").eq("duplicate_key", key).maybeSingle();
        if (existing) isDup = true;
      }
      const lead = {
        source: "facebook_comment",
        source_comment_id: c.id,
        company_name: c.company_name,
        contact_name: c.commenter_name,
        phone: c.phone,
        email: c.email,
        city: c.city,
        trade_category: c.trade_category,
        facebook_url: c.commenter_profile_url,
        duplicate_key: key,
        status: isDup ? "duplicate" : "new",
        aipp_score: 0,
        enrichment_confidence: c.confidence_score ?? 0,
      };
      lead.aipp_score = aippScore(lead);
      const { error } = await svc.from("fb_contractor_leads").insert(lead);
      if (!error) {
        if (isDup) duplicates++; else created++;
        await svc.from("facebook_extracted_comments").update({ status: isDup ? "duplicate" : "promoted" }).eq("id", c.id);
      }
    }

    return new Response(JSON.stringify({ created, duplicates }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("[fb-promote-leads]", e);
    return new Response(JSON.stringify({ error: e?.message ?? "unknown" }), { status: 500, headers: corsHeaders });
  }
});
