/**
 * enrich-contractor-from-official-site
 * Fetches homepage + /contact-style pages, extracts real coordinates.
 * Never invents data. Writes only fields it actually found, with source URL.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CANDIDATE_PATHS = ["", "/contact", "/nous-joindre", "/contactez-nous", "/a-propos", "/about"];

const RBQ_RE = /\b\d{4}[-\s]?\d{4}[-\s]?\d{2}\b/;
const QC_POSTAL_RE = /\b([A-Z]\d[A-Z])[ -]?(\d[A-Z]\d)\b/;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const TEL_HREF_RE = /href=["']tel:([^"']+)["']/gi;
const MAILTO_RE = /href=["']mailto:([^"']+)["']/gi;

async function fetchText(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": "UNPRO-Enrichment/1.0 (+https://unpro.ca)" },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!r.ok) return null;
    const ct = r.headers.get("content-type") ?? "";
    if (!ct.includes("text")) return null;
    return await r.text();
  } catch { return null; }
}

function normalizePhone(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return null;
}

function scoreQuality(fields: {
  website: boolean; phone: boolean; email: boolean;
  address: boolean; gbp: boolean; rbq: boolean; services: boolean;
}): number {
  return (
    (fields.website ? 20 : 0) +
    (fields.phone ? 20 : 0) +
    (fields.email ? 15 : 0) +
    (fields.address ? 15 : 0) +
    (fields.gbp ? 10 : 0) +
    (fields.rbq ? 10 : 0) +
    (fields.services ? 10 : 0)
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { prospect_id } = await req.json();
    if (!prospect_id) throw new Error("prospect_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: prospect, error: fetchErr } = await supabase
      .from("verified_contractor_prospects")
      .select("*")
      .eq("id", prospect_id)
      .single();
    if (fetchErr || !prospect) throw new Error(fetchErr?.message ?? "prospect not found");
    if (!prospect.website_url) throw new Error("no website_url to enrich from");

    let origin: URL;
    try { origin = new URL(prospect.website_url); }
    catch { throw new Error(`invalid website_url: ${prospect.website_url}`); }

    const phones = new Set<string>();
    const emails = new Set<string>();
    let rbq: string | null = null;
    let postal: string | null = null;
    let addressLine: string | null = null;
    const sourcePages: string[] = [];

    for (const p of CANDIDATE_PATHS) {
      const url = new URL(p || "/", origin).toString();
      const html = await fetchText(url);
      if (!html) continue;
      sourcePages.push(url);

      for (const m of html.matchAll(TEL_HREF_RE)) {
        const n = normalizePhone(m[1]);
        if (n && !/555\d{4}$/.test(n)) phones.add(n);
      }
      for (const m of html.matchAll(MAILTO_RE)) {
        emails.add(m[1].trim().toLowerCase());
      }
      const emailMatches = html.match(EMAIL_RE);
      if (emailMatches) for (const e of emailMatches) emails.add(e.toLowerCase());

      if (!rbq) { const m = html.match(RBQ_RE); if (m) rbq = m[0]; }
      if (!postal) {
        const m = html.match(QC_POSTAL_RE);
        if (m) postal = `${m[1]} ${m[2]}`;
      }
      if (!addressLine) {
        const addrMatch = html.match(/(\d{1,6}[^<\n]{5,80}(Qc|Québec|Quebec)[^<\n]{0,40})/i);
        if (addrMatch) addressLine = addrMatch[1].replace(/\s+/g, " ").trim();
      }
    }

    const phoneList = Array.from(phones);
    const emailList = Array.from(emails).filter(e => !e.startsWith("no-reply") && !e.includes("example."));

    const update: Record<string, unknown> = {
      last_enriched_at: new Date().toISOString(),
      source_urls: { ...(prospect.source_urls ?? {}), pages: sourcePages },
    };
    let ph = false, em = false, ad = false, rb = false;
    if (phoneList.length > 0) {
      update.phone_primary = phoneList[0];
      update.phone_source_url = sourcePages[0];
      ph = true;
      if (phoneList.length > 1) update.phone_secondary = phoneList[1];
    }
    if (emailList.length > 0) {
      update.email = emailList[0];
      update.email_source_url = sourcePages[0];
      em = true;
    }
    if (addressLine) {
      update.street_address = addressLine;
      update.address_source_url = sourcePages[0];
      ad = true;
    }
    if (postal) update.postal_code = postal;
    if (rbq) {
      update.rbq_number = rbq;
      update.rbq_source_url = sourcePages[0];
      rb = true;
    }

    const quality = scoreQuality({
      website: true,
      phone: ph || !!prospect.phone_primary,
      email: em || !!prospect.email,
      address: ad || !!prospect.street_address,
      gbp: !!prospect.google_business_url,
      rbq: rb || !!prospect.rbq_number,
      services: (prospect.service_areas ?? []).length > 0,
    });
    update.data_quality_score = quality;
    if (quality >= 70 && (ph || prospect.phone_primary) && (prospect.city || postal)) {
      update.verification_status = "verified";
      update.verified_at = new Date().toISOString();
    }

    const { error: updErr } = await supabase.from("verified_contractor_prospects")
      .update(update).eq("id", prospect_id);
    if (updErr) throw new Error(updErr.message);

    return new Response(JSON.stringify({
      ok: true,
      found: { phones: phoneList, emails: emailList, rbq, postal, addressLine },
      quality_score: quality,
      pages_scanned: sourcePages.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
