/**
 * UNPRO — Duplicate Detection Edge Function
 * Scans contractor table for duplicate pairs and flags suspicious profiles.
 * Admin-only. Called on-demand or via scheduled task.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── Normalization helpers (mirrored from frontend) ── */
function normPhone(phone: string | null): string | null {
  if (!phone) return null;
  return phone.replace(/[^0-9]/g, "").slice(-10);
}

function normDomain(website: string | null): string | null {
  if (!website) return null;
  try {
    const url = new URL(website.startsWith("http") ? website : `https://${website}`);
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return website.toLowerCase().replace(/^www\./, "");
  }
}

function normName(name: string | null): string | null {
  if (!name) return null;
  return name
    .toLowerCase()
    .replace(/[^a-zàâçéèêëîïôùûüÿñ0-9\s]/g, "")
    .replace(
      /\b(inc|ltee|ltd|enr|cie|co|llc|senc|construction|renovations?|entreprises?|services?|les|la|le|du|des|de)\b/g,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
}

function nameSimilarity(a: string | null, b: string | null): number {
  const na = normName(a);
  const nb = normName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const tokensA = new Set(na.split(" "));
  const tokensB = new Set(nb.split(" "));
  const intersection = [...tokensA].filter((t) => tokensB.has(t));
  const union = new Set([...tokensA, ...tokensB]);
  return union.size > 0 ? intersection.length / union.size : 0;
}

function emailDomain(email: string | null): string | null {
  if (!email || !email.includes("@")) return null;
  return email.split("@")[1]?.toLowerCase() ?? null;
}

const WEIGHTS = {
  exact_rbq: 95,
  exact_neq: 90,
  same_website_domain: 80,
  same_phone: 70,
  similar_name_same_city: 60,
  similar_name_only: 30,
  same_email_domain: 40,
  same_address: 50,
};

function scorePair(a: any, b: any): { score: number; signals: any[] } {
  const signals: any[] = [];

  if (a.license_number && b.license_number && a.license_number === b.license_number)
    signals.push({ signal: "exact_rbq", weight: WEIGHTS.exact_rbq, detail: `RBQ ${a.license_number}` });

  if (a.neq && b.neq && a.neq === b.neq)
    signals.push({ signal: "exact_neq", weight: WEIGHTS.exact_neq, detail: `NEQ ${a.neq}` });

  const domA = normDomain(a.website);
  const domB = normDomain(b.website);
  if (domA && domB && domA === domB)
    signals.push({ signal: "same_website_domain", weight: WEIGHTS.same_website_domain, detail: domA });

  const phoneA = normPhone(a.phone);
  const phoneB = normPhone(b.phone);
  if (phoneA && phoneB && phoneA === phoneB)
    signals.push({ signal: "same_phone", weight: WEIGHTS.same_phone, detail: phoneA });

  const sim = nameSimilarity(a.business_name, b.business_name);
  if (sim >= 0.7) {
    const sameCity = a.city && b.city && a.city.toLowerCase() === b.city.toLowerCase();
    if (sameCity) {
      signals.push({ signal: "similar_name_same_city", weight: WEIGHTS.similar_name_same_city, detail: `"${a.business_name}" ≈ "${b.business_name}" (${a.city})` });
    } else {
      signals.push({ signal: "similar_name_only", weight: WEIGHTS.similar_name_only, detail: `"${a.business_name}" ≈ "${b.business_name}"` });
    }
  }

  const edA = emailDomain(a.email);
  const edB = emailDomain(b.email);
  if (edA && edB && edA === edB && !["gmail.com", "outlook.com", "hotmail.com", "yahoo.com"].includes(edA))
    signals.push({ signal: "same_email_domain", weight: WEIGHTS.same_email_domain, detail: edA });

  if (a.address && b.address && a.address.toLowerCase().trim() === b.address.toLowerCase().trim())
    signals.push({ signal: "same_address", weight: WEIGHTS.same_address, detail: a.address });

  if (signals.length === 0) return { score: 0, signals };
  const sorted = signals.map((s: any) => s.weight).sort((x: number, y: number) => y - x);
  const score = Math.min(100, Math.round(sorted[0] + sorted.slice(1).reduce((s: number, w: number) => s + w * 0.1, 0)));
  return { score, signals };
}

function deriveConfidence(score: number): string {
  if (score >= 85) return "likely_duplicate";
  if (score >= 60) return "possible_duplicate";
  if (score >= 40) return "ambiguous_shared_identity";
  return "clear_unique";
}

function detectFlags(c: any): any[] {
  const flags: any[] = [];
  const core = [!!c.license_number, !!c.neq, !!c.phone, !!c.business_name].filter(Boolean).length;
  if (core <= 1) {
    flags.push({
      flag_type: "missing_identity",
      severity: core === 0 ? "critical" : "high",
      description: "Profil avec très peu d'identifiants vérifiables.",
      metadata: { core_count: core },
    });
  }
  if (!c.business_name && !c.website && !c.license_number) {
    flags.push({
      flag_type: "low_substance",
      severity: "high",
      description: "Aucune identité d'entreprise cohérente détectable.",
      metadata: {},
    });
  }
  if (c.website && c.email) {
    const wd = normDomain(c.website);
    const ed = emailDomain(c.email);
    if (wd && ed && wd !== ed && !["gmail.com", "outlook.com", "hotmail.com", "yahoo.com"].includes(ed)) {
      flags.push({
        flag_type: "conflicting_contacts",
        severity: "medium",
        description: `Domaine web (${wd}) diffère du domaine courriel (${ed}).`,
        metadata: { website_domain: wd, email_domain: ed },
      });
    }
  }
  return flags;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify admin
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "admin_required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch all contractors
    const { data: contractors, error: fetchErr } = await supabase
      .from("contractors")
      .select("id, business_name, phone, email, website, license_number, neq, city, address, admin_verified")
      .limit(1000);

    if (fetchErr) throw fetchErr;
    if (!contractors || contractors.length === 0) {
      return new Response(JSON.stringify({ candidates: 0, flags: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Pairwise comparison
    const candidates: any[] = [];
    const MIN_SCORE = 40;

    for (let i = 0; i < contractors.length; i++) {
      for (let j = i + 1; j < contractors.length; j++) {
        const { score, signals } = scorePair(contractors[i], contractors[j]);
        if (score >= MIN_SCORE) {
          candidates.push({
            contractor_id: contractors[i].id,
            candidate_contractor_id: contractors[j].id,
            duplicate_confidence_score: score,
            entity_confidence: deriveConfidence(score),
            reasons_json: signals,
            matching_signals: Object.fromEntries(signals.map((s: any) => [s.signal, s.detail])),
            review_status: "pending",
          });
        }
      }
    }

    // Upsert candidates
    let candidatesInserted = 0;
    if (candidates.length > 0) {
      const { error: upsertErr } = await supabase
        .from("contractor_duplicate_candidates")
        .upsert(candidates, { onConflict: "contractor_id,candidate_contractor_id", ignoreDuplicates: false });
      if (upsertErr) console.error("Upsert candidates error:", upsertErr);
      else candidatesInserted = candidates.length;
    }

    // Entity flags
    let flagsInserted = 0;
    for (const c of contractors) {
      const flags = detectFlags(c);
      for (const f of flags) {
        const { error: flagErr } = await supabase
          .from("contractor_entity_flags")
          .upsert(
            { contractor_id: c.id, ...f, metadata_json: f.metadata },
            { onConflict: "contractor_id,flag_type", ignoreDuplicates: false }
          );
        if (!flagErr) flagsInserted++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        contractors_scanned: contractors.length,
        candidates_found: candidatesInserted,
        flags_created: flagsInserted,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Duplicate scan error:", err);
    return new Response(
      JSON.stringify({ error: err.message ?? "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
