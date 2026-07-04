// Pull up to 25 SMS-qualified contractor prospects from v_sms_sprint_eligible,
// balance across cities × categories, assign variants A–E evenly, generate slugs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { normalizePhone } from "../_shared/normalizePhone.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CITIES = ["Laval", "Terrebonne", "Repentigny", "Mascouche", "Montréal", "Longueuil"];
const CATEGORIES = ["attic-insulation", "roofing", "mold-removal", "foundation-repair", "french-drains", "hvac"];
const VARIANTS = ["A", "B", "C", "D", "E"] as const;

function makeSlug(prefix = "p"): string {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return `${prefix}-` + Array.from(bytes).map((b) => b.toString(36)).join("").slice(0, 14);
}

function cityMatch(row: any, wanted: string): boolean {
  if (!row.city) return false;
  const c = String(row.city).toLowerCase();
  return c.includes(wanted.toLowerCase());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(body.limit ?? 25, 25);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Resolve/create campaign
    let campaign_id = body.campaign_id ?? null;
    if (!campaign_id) {
      const { data: existing } = await supabase
        .from("sms_sprint_campaigns")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing) campaign_id = existing.id;
      else {
        const { data: created } = await supabase
          .from("sms_sprint_campaigns")
          .insert({ name: "SMS Founder Sprint" })
          .select("id").single();
        campaign_id = created!.id;
      }
    }

    // Pull a wide pool from eligibility view, category/city filtered
    const { data: pool, error } = await supabase
      .from("v_sms_sprint_eligible")
      .select("*")
      .in("category", CATEGORIES)
      .order("roi_score", { ascending: false })
      .limit(200);

    if (error) throw error;

    // Filter by city (contains-match), skip duplicates already in campaign
    const { data: existingRows } = await supabase
      .from("sms_sprint_prospects")
      .select("prospect_id")
      .eq("campaign_id", campaign_id);
    const already = new Set((existingRows ?? []).map((r) => r.prospect_id).filter(Boolean));

    // Group by city+category, round-robin pick
    const buckets = new Map<string, any[]>();
    const rejectedNoCity: any[] = [];
    for (const row of pool ?? []) {
      if (already.has(row.id)) continue;
      const matchedCity = CITIES.find((c) => cityMatch(row, c));
      if (!matchedCity) { rejectedNoCity.push(row); continue; }
      const key = `${matchedCity}|${row.category}`;
      const arr = buckets.get(key) ?? [];
      arr.push({ ...row, matched_city: matchedCity });
      buckets.set(key, arr);
    }

    const picked: any[] = [];
    const keys = Array.from(buckets.keys());
    let round = 0;
    while (picked.length < limit && keys.some((k) => (buckets.get(k)?.length ?? 0) > round)) {
      for (const k of keys) {
        const arr = buckets.get(k)!;
        if (arr.length > round) {
          picked.push(arr[round]);
          if (picked.length >= limit) break;
        }
      }
      round += 1;
    }

    // Assign variants evenly A..E
    const inserts: any[] = [];
    for (let i = 0; i < picked.length; i++) {
      const row = picked[i];
      const variant = VARIANTS[i % VARIANTS.length];
      const norm = normalizePhone(row.phone_raw);
      const slug = makeSlug();
      inserts.push({
        campaign_id,
        prospect_id: row.id,
        company_name: row.company_name,
        owner_name: row.owner_name,
        city: row.matched_city,
        category: row.category,
        roi_score: row.roi_score,
        phone_e164: norm.normalized,
        phone_type: row.phone_type ?? (row.has_mobile ? "mobile" : null),
        google_rating: row.google_rating,
        review_count: row.review_count,
        qualification_status: "qualified",
        variant,
        tracking_slug: slug,
      });
    }

    if (inserts.length) {
      const { error: insErr } = await supabase.from("sms_sprint_prospects").insert(inserts);
      if (insErr) throw insErr;
    }

    // Log rejections for dashboard visibility (city mismatch)
    const rejections = rejectedNoCity.slice(0, 50).map((r) => ({
      campaign_id,
      prospect_id: r.id,
      company_name: r.company_name,
      city: r.city,
      category: r.category,
      roi_score: r.roi_score,
      qualification_status: "rejected",
      rejection_reason: "city_not_in_target",
    }));
    if (rejections.length) {
      await supabase.from("sms_sprint_prospects").insert(rejections);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        campaign_id,
        pool_size: pool?.length ?? 0,
        qualified: inserts.length,
        rejected: rejectedNoCity.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as Error).message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
