// solicitation-build-queue — select top prospects, insert into contractor_outreach_queue.
// Admin/cron trigger. Never inserts duplicates for phones already active in queue.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const CATEGORY_PRIORITY: Record<string, number> = {
  isolation: 5, "isolation-entretoits": 5,
  toiture: 4, roofing: 4,
  fondation: 3, foundation: 3,
  moisissure: 2, mold: 2,
  hvac: 1, cvac: 1, chauffage: 1,
};

const DIRECTORY_BLOCKLIST = /soumission|renoquotes|homestars|reno-assistance|houzz|yelp|pj\.ca|annuaire|directory/i;

function normPhone(p: string | null | undefined): string | null {
  if (!p) return null;
  const d = p.replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return null;
}
function slug(): string { return Math.random().toString(36).slice(2, 10); }

function score(row: any): number {
  let s = 0;
  const cat = (row.category || row.category_slug || "").toLowerCase();
  s += CATEGORY_PRIORITY[cat] ?? 0;
  if ((row.reviews_count ?? 0) > 20) s += 2;
  if (row.website || row.facebook_url) s += 1;
  if (row.rbq || row.rbq_number) s += 2;
  return s;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const target = Math.min(Math.max(parseInt(body?.target ?? "25"), 1), 50);
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Pull candidate pool from contractors + contractor_prospects.
    const [conRes, proRes] = await Promise.all([
      sb.from("contractors").select("id, business_name, city, phone, email, website, rbq_number").limit(500),
      sb.from("contractor_prospects").select("id, business_name, city, phone, email, website, category_slug, reviews_count, rbq_number").limit(500),
    ]);
    const contractors = (conRes.data ?? []).map((r: any) => ({ ...r, source: "contractor", contractor_id: r.id, company_name: r.business_name }));
    const prospects = (proRes.data ?? []).map((r: any) => ({ ...r, source: "prospect", company_name: r.business_name, category: r.category_slug }));
    const pool = [...contractors, ...prospects];

    // Existing active phones to skip.
    const { data: existing } = await sb.from("contractor_outreach_queue")
      .select("phone").in("status", ["queued", "sms_sent", "clicked", "registered", "payment_started", "activated"]);
    const skip = new Set((existing ?? []).map((r: any) => r.phone));

    const candidates: any[] = [];
    for (const row of pool) {
      const phone = normPhone(row.phone);
      if (!phone) continue;
      if (skip.has(phone)) continue;
      if (row.company_name && DIRECTORY_BLOCKLIST.test(row.company_name)) continue;
      if (row.website && DIRECTORY_BLOCKLIST.test(row.website)) continue;
      candidates.push({
        contractor_id: row.contractor_id ?? null,
        company_name: row.company_name ?? "Entrepreneur",
        city: row.city ?? null,
        category: row.category ?? row.category_slug ?? null,
        phone,
        email: row.email ?? null,
        website: row.website ?? null,
        reviews_count: row.reviews_count ?? 0,
        _score: score(row),
      });
    }
    candidates.sort((a, b) => b._score - a._score);
    // Dedupe by phone within this batch (candidates from contractors + prospects can collide).
    const seen = new Set<string>();
    const deduped = candidates.filter((c) => {
      if (seen.has(c.phone)) return false;
      seen.add(c.phone);
      return true;
    });
    const chosen = deduped.slice(0, target);

    if (chosen.length === 0) return json({ inserted: 0, note: "no eligible candidates" });

    const rows = chosen.map((c) => ({
      contractor_id: c.contractor_id,
      company_name: c.company_name,
      city: c.city,
      category: c.category,
      phone: c.phone,
      email: c.email,
      website: c.website,
      reviews_count: c.reviews_count,
      score: c._score,
      tracking_slug: slug(),
      status: "queued",
    }));
    const { error } = await sb.from("contractor_outreach_queue").insert(rows);
    if (error) return json({ error: error.message }, 500);
    return json({ inserted: rows.length, sample: rows.slice(0, 3) });
  } catch (e: any) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});
