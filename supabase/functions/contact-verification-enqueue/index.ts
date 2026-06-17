// UNPRO — Contact Verification Enqueue
// Computes match confidence between scraped lead and RBQ/NEQ registries,
// resolves phone line-type, and upserts to contact_verification_queue.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

interface Body {
  business_name: string;
  contact_person_name?: string;
  role?: string;
  email?: string;
  phone?: string;
  website?: string;
  google_business_url?: string;
  rbq_number?: string;
  rbq_business_name?: string;
  rbq_status?: string;
  neq_number?: string;
  neq_business_name?: string;
  neq_status?: string;
  google_rating?: number;
  google_reviews_count?: number;
  category?: string;
  city?: string;
  source_lead_id?: string;
  source_table?: string;
}

const PRIORITY_TRADES = [
  "roofing", "toiture", "insulation", "isolation", "plumbing", "plomberie",
  "electrical", "électrique", "electrique", "hvac", "chauffage", "climatisation",
  "mold", "moisissure", "foundation", "fondation", "windows", "doors", "fenêtres",
  "portes", "landscaping", "paysagement", "renovation", "rénovation",
];
const PRIORITY_REGIONS = [
  "montréal", "montreal", "laval", "longueuil", "brossard", "boucherville",
  "terrebonne", "mascouche", "repentigny", "blainville", "boisbriand", "saint-jérôme",
  "rive-nord", "rive-sud", "lanaudière", "lanaudiere", "laurentides",
];

function norm(s?: string | null) {
  return (s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function jaroWinkler(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const m = Math.max(a.length, b.length);
  const window = Math.floor(m / 2) - 1;
  const aMatch = new Array(a.length).fill(false);
  const bMatch = new Array(b.length).fill(false);
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    const lo = Math.max(0, i - window);
    const hi = Math.min(i + window + 1, b.length);
    for (let j = lo; j < hi; j++) {
      if (bMatch[j] || a[i] !== b[j]) continue;
      aMatch[i] = bMatch[j] = true;
      matches++;
      break;
    }
  }
  if (!matches) return 0;
  let k = 0, trans = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatch[i]) continue;
    while (!bMatch[k]) k++;
    if (a[i] !== b[k]) trans++;
    k++;
  }
  const jaro = (matches / a.length + matches / b.length + (matches - trans / 2) / matches) / 3;
  let prefix = 0;
  for (let i = 0; i < Math.min(4, a.length, b.length); i++) {
    if (a[i] === b[i]) prefix++; else break;
  }
  return jaro + prefix * 0.1 * (1 - jaro);
}

function nameMatch(a?: string | null, b?: string | null): number {
  const x = norm(a), y = norm(b);
  if (!x || !y) return 0;
  return jaroWinkler(x, y);
}

function domainFromEmail(email?: string | null): string | null {
  if (!email) return null;
  const m = email.match(/@([^@\s]+)$/);
  return m ? m[1].toLowerCase() : null;
}
function domainFromUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch { return null; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
    const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supa = createClient(SUPA_URL, SRK, { auth: { autoRefreshToken: false, persistSession: false } });

    const body = (await req.json()) as Body;
    if (!body.business_name) return json({ error: "business_name required" }, 400);

    // ── Compute match confidence ──
    const reasons: { signal: string; score: number; detail?: string }[] = [];
    const webDomain = domainFromUrl(body.website);
    const emailDomain = domainFromEmail(body.email);

    const rbqMatch = nameMatch(body.business_name, body.rbq_business_name);
    const neqMatch = nameMatch(body.business_name, body.neq_business_name);
    if (rbqMatch >= 0.92) reasons.push({ signal: "rbq_name_match", score: rbqMatch });
    if (neqMatch >= 0.92) reasons.push({ signal: "neq_name_match", score: neqMatch });
    if (rbqMatch > 0 && rbqMatch < 0.92) reasons.push({ signal: "rbq_name_conflict", score: rbqMatch, detail: body.rbq_business_name });
    if (neqMatch > 0 && neqMatch < 0.92) reasons.push({ signal: "neq_name_conflict", score: neqMatch, detail: body.neq_business_name });

    if (webDomain && emailDomain && webDomain === emailDomain)
      reasons.push({ signal: "email_domain_matches_website", score: 1 });
    if (webDomain && body.business_name && jaroWinkler(norm(webDomain.split(".")[0]), norm(body.business_name)) >= 0.85)
      reasons.push({ signal: "website_domain_matches_business", score: 1 });

    const hasRbq = !!body.rbq_number;
    const hasNeq = !!body.neq_number;
    const hasEmail = !!body.email;
    const hasPhone = !!body.phone;

    let confidence: "high" | "medium" | "low" | "conflict" = "low";
    const hasConflict = reasons.some(r => r.signal.endsWith("_conflict"));
    if (hasConflict) confidence = "conflict";
    else if ((rbqMatch >= 0.92 || neqMatch >= 0.92) && (webDomain || hasEmail)) confidence = "high";
    else if (rbqMatch >= 0.92 || neqMatch >= 0.92 || (webDomain && hasEmail && webDomain === emailDomain)) confidence = "medium";
    else if (hasPhone || hasEmail) confidence = "low";

    // ── Phone validation ──
    let phone_type: string = "unknown";
    let phone_e164: string | null = null;
    if (body.phone) {
      try {
        const r = await fetch(`${SUPA_URL}/functions/v1/twilio-lookup-phone`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SRK}` },
          body: JSON.stringify({ phone: body.phone }),
        });
        const lookup = await r.json().catch(() => ({}));
        if (lookup?.phone_type) phone_type = lookup.phone_type;
        if (lookup?.phone_e164) phone_e164 = lookup.phone_e164;
      } catch { /* non-blocking */ }
    } else {
      phone_type = "invalid";
    }

    // ── Best contact method ──
    let best_contact_method: string = "unknown";
    if (phone_type === "mobile" && hasEmail) best_contact_method = "email"; // manual outreach prefers email when available
    else if (phone_type === "mobile") best_contact_method = "sms";
    else if (phone_type === "landline" && hasEmail) best_contact_method = "email";
    else if (phone_type === "landline") best_contact_method = "phone_call";
    else if (hasEmail) best_contact_method = "email";
    else if (body.website) best_contact_method = "contact_form";

    // ── Priority score ──
    let score = 0;
    if (body.rbq_status === "valide" || body.rbq_status === "valid") score += 30;
    else if (hasRbq) score += 15;
    if (hasNeq) score += 20;
    if (hasEmail) score += 20;
    if (phone_type === "landline" && hasEmail) score += 15;
    if ((body.google_rating ?? 0) >= 4.3 && (body.google_reviews_count ?? 0) >= 20) score += 10;
    const catNorm = norm(body.category);
    if (PRIORITY_TRADES.some(t => catNorm.includes(t))) score += 15;
    const cityNorm = norm(body.city);
    if (PRIORITY_REGIONS.some(r => cityNorm.includes(norm(r)))) score += 10;

    // ── Dedupe by source_lead_id / phone / email ──
    let existingId: string | null = null;
    if (body.source_lead_id) {
      const { data } = await supa.from("contact_verification_queue")
        .select("id").eq("source_lead_id", body.source_lead_id).maybeSingle();
      existingId = data?.id ?? null;
    }
    if (!existingId && (phone_e164 || body.email)) {
      const q = supa.from("contact_verification_queue").select("id");
      if (phone_e164) q.eq("phone", phone_e164);
      else if (body.email) q.eq("email", body.email.toLowerCase());
      const { data } = await q.maybeSingle();
      existingId = data?.id ?? null;
    }
    if (existingId) score -= 50;

    const payload = {
      business_name: body.business_name,
      contact_person_name: body.contact_person_name ?? null,
      role: body.role ?? null,
      email: body.email?.toLowerCase() ?? null,
      phone: phone_e164 ?? body.phone ?? null,
      phone_type,
      website: body.website ?? null,
      google_business_url: body.google_business_url ?? null,
      rbq_number: body.rbq_number ?? null,
      rbq_business_name: body.rbq_business_name ?? null,
      rbq_status: body.rbq_status ?? null,
      neq_number: body.neq_number ?? null,
      neq_business_name: body.neq_business_name ?? null,
      neq_status: body.neq_status ?? null,
      match_confidence: confidence,
      match_reasons: reasons,
      verification_status: confidence === "high" ? "verified" : (confidence === "conflict" ? "needs_manual_review" : "needs_manual_review"),
      best_contact_method,
      manual_contact_priority_score: score,
      source_lead_id: body.source_lead_id ?? null,
      source_table: body.source_table ?? null,
    };

    let row;
    if (existingId) {
      const { data, error } = await supa.from("contact_verification_queue")
        .update(payload).eq("id", existingId).select("*").single();
      if (error) return json({ error: error.message }, 500);
      row = data;
    } else {
      const { data, error } = await supa.from("contact_verification_queue")
        .insert(payload).select("*").single();
      if (error) return json({ error: error.message }, 500);
      row = data;
    }

    return json({ ok: true, id: row.id, match_confidence: confidence, phone_type, best_contact_method, priority_score: score, deduped: !!existingId });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
