// UNPRO — Process one Kijiji listing: fetch, extract, classify, dedupe, score, store.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  classifyListing, scoreAcquisition, priorityBucket,
  extractPhone, extractAllPhones, extractEmail, extractWebsite, extractRbq,
  normalizeBusinessName,
} from "../_shared/kijijiClassifier.ts";
import { normalizePhone } from "../_shared/normalizePhone.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const UA = "Mozilla/5.0 (compatible; UNPRO-Discovery/1.0; +https://unpro.ca)";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
  const body = await req.json().catch(() => ({}));
  const listingId: string | null = body.source_listing_id ?? null;
  const listingUrl: string | undefined = body.source_url;
  const bulkLimit: number = Math.min(body.limit ?? 20, 100);

  // Batch mode — process oldest N discovered stubs
  if (!listingId && !listingUrl) {
    const { data: stubs } = await sb
      .from("prospect_source_listings")
      .select("id, source_listing_id, source_url, city, province")
      .eq("source_key", "kijiji_services")
      .is("classification_confidence", null)
      .order("first_seen_at", { ascending: true })
      .limit(bulkLimit);
    const results: any[] = [];
    for (const s of stubs ?? []) {
      results.push(await processOne(sb, s.source_listing_id!, s.source_url, s.city, s.province));
    }
    return json({ success: true, processed: results.length, results });
  }

  const result = await processOne(sb, listingId!, listingUrl!);
  return json({ success: true, result });
});

async function processOne(
  sb: any,
  listingId: string,
  url: string,
  seedCity?: string | null,
  seedProvince?: string | null,
) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept": "text/html", "Accept-Language": "fr-CA,fr;q=0.9,en;q=0.8" },
    });
    if (res.status === 403 || res.status === 429 || res.status === 503) {
      return { listingId, error: "blocked_by_source", status: res.status };
    }
    if (!res.ok) return { listingId, error: `http_${res.status}` };

    const html = await res.text();

    // Extract fields (Kijiji uses JSON-LD blocks + og: tags)
    const title = pick(html, /<title>([^<]+)<\/title>/i) ?? "";
    const ogTitle = pick(html, /<meta property="og:title" content="([^"]+)"/i);
    const ogDesc  = pick(html, /<meta property="og:description" content="([^"]+)"/i);
    const description = ogDesc ?? stripHtmlDescription(html);

    // JSON-LD Product / LocalBusiness block
    const jsonLd = findJsonLd(html);
    const city  = jsonLd?.address?.addressLocality ?? seedCity ?? null;
    const region = jsonLd?.address?.addressRegion ?? null;
    const postedAt = jsonLd?.datePosted ?? jsonLd?.datePublished ?? null;
    const price = jsonLd?.offers?.price ?? null;
    const category = pick(html, /"categoryName"\s*:\s*"([^"]+)"/) ?? null;

    // Contact extraction (visible fields only)
    const contactBlob = `${title} ${description}`;
    const rawPhone = extractPhone(contactBlob);
    const allPhones = extractAllPhones(contactBlob);
    const email = extractEmail(contactBlob);
    const website = extractWebsite(html);
    const rbq = extractRbq(contactBlob);

    // Normalize phone
    const normalized = normalizePhone(rawPhone ?? "");

    // Classification
    const cls = classifyListing({
      title: ogTitle ?? title,
      description,
      category,
      city,
      province: region ?? seedProvince ?? "QC",
    });

    // Business name — try og:site_name / og:title extraction from JSON-LD seller
    const businessName =
      jsonLd?.seller?.name ??
      jsonLd?.provider?.name ??
      pick(html, /"sellerName"\s*:\s*"([^"]+)"/) ??
      null;

    // Duplicate check
    const isDuplicate = await checkDuplicate(sb, normalized.normalized, email, website, rbq, businessName, city);

    // Score
    const scoring = scoreAcquisition({
      primary_category: cls.primary_category,
      is_strategic_category: cls.is_strategic_category,
      city, province: region ?? "QC",
      phone_type: null, // set by validate-kijiji-contact
      phone_sms_capable: null,
      email, website, business_name: businessName, description,
      years_experience: extractYearsExperience(description),
      rbq_number: rbq,
      insured_claimed: /insured|assur[ée]/i.test(description ?? ""),
      free_estimate_claimed: /free estimate|estimation gratuite/i.test(description ?? ""),
      emergency_service_claimed: /24[\/\s]?7|urgence|emergency/i.test(description ?? ""),
      image_count: countMatches(html, /<img /gi),
      rating: null, review_count: null,
      posted_at: postedAt,
      is_duplicate: isDuplicate,
      shortage_market: false, // enriched later
    });

    const bucket = priorityBucket({
      score: scoring.score,
      classification_confidence: cls.classification_confidence,
      phone_type: null,
      phone_sms_capable: null,
      email,
      rejection_reason: cls.rejection_reason,
    });

    // Determine outreach eligibility
    let eligibility: string;
    if (cls.rejection_reason) eligibility = "rejected";
    else if (bucket === "REJECT") eligibility = "rejected";
    else if (bucket === "REVIEW") eligibility = "review";
    else if (isDuplicate) eligibility = "duplicate";
    else if (!rawPhone && !email) eligibility = "enrichment_queue";
    else eligibility = "eligible";

    // Upsert prospect_source_listings
    await sb.from("prospect_source_listings").upsert({
      source_key: "kijiji_services",
      source_listing_id: listingId,
      source_url: url,
      ad_title: ogTitle ?? title,
      ad_description: description,
      ad_language: cls.language,
      city, region, province: region ?? seedProvince ?? "QC",
      category,
      listing_intent: cls.intent,
      primary_category: cls.primary_category,
      secondary_categories: cls.secondary_categories,
      raw_phone: rawPhone,
      normalized_phone_e164: normalized.normalized,
      email, website,
      business_name: businessName,
      acquisition_score: scoring.score,
      classification_confidence: cls.classification_confidence,
      rejection_reason: cls.rejection_reason,
      posted_at: postedAt,
      last_seen_at: new Date().toISOString(),
      is_active: true,
      raw_payload: {
        price, jsonLd, all_phones: allPhones, rbq,
        score_breakdown: scoring.breakdown,
      },
    }, { onConflict: "source_key,source_listing_id" });

    // If eligible or review → upsert canonical prospect
    let prospectId: string | null = null;
    if (eligibility === "eligible" || eligibility === "review") {
      prospectId = await upsertProspect(sb, {
        source_key: "kijiji_services",
        source_priority: 90,
        business_name: businessName,
        phone: normalized.normalized,
        email, website,
        city, province: region ?? "QC",
        category_slug: cls.primary_category,
        acquisition_score: scoring.score,
        classification_confidence: cls.classification_confidence,
        listing_intent: cls.intent,
        priority_reason: computePriorityReason(scoring, cls, postedAt, website),
        outreach_eligibility: eligibility,
        rejection_reason: cls.rejection_reason,
      });
      if (prospectId) {
        await sb.from("prospect_source_listings")
          .update({ prospect_id: prospectId })
          .eq("source_key", "kijiji_services")
          .eq("source_listing_id", listingId);
      }
    }

    return {
      listingId,
      intent: cls.intent,
      primary_category: cls.primary_category,
      rejection_reason: cls.rejection_reason,
      confidence: cls.classification_confidence,
      score: scoring.score,
      bucket,
      eligibility,
      prospect_id: prospectId,
      is_duplicate: isDuplicate,
    };
  } catch (e) {
    return { listingId, error: String(e) };
  }
}

function pick(text: string, re: RegExp): string | null {
  const m = text.match(re);
  return m ? decodeEntities(m[1]) : null;
}
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}
function stripHtmlDescription(html: string): string {
  const m = html.match(/<meta name="description" content="([^"]+)"/i);
  return m ? decodeEntities(m[1]) : "";
}
function findJsonLd(html: string): any {
  const blocks = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
  for (const b of blocks) {
    try {
      const j = JSON.parse(b[1]);
      if (j["@type"] === "Product" || j["@type"] === "LocalBusiness" || j["@type"] === "Service") return j;
      if (Array.isArray(j)) return j.find(x => x["@type"] === "Product") ?? j[0];
    } catch { /* skip */ }
  }
  return null;
}
function countMatches(s: string, re: RegExp): number {
  return (s.match(re) || []).length;
}
function extractYearsExperience(desc: string | null): number | null {
  if (!desc) return null;
  const m = desc.match(/(\d{1,2})\+?\s*(?:years?|ans?)\s*(?:of\s*)?(?:experience|d'exp[eé]rience)/i);
  return m ? parseInt(m[1], 10) : null;
}

function computePriorityReason(scoring: any, cls: any, postedAt: string | null, website: string | null): string[] {
  const reasons: string[] = [];
  if (postedAt) {
    const days = (Date.now() - new Date(postedAt).getTime()) / 86400000;
    if (days <= 14) reasons.push("recent_active_advertiser");
  }
  if (scoring.breakdown.contactability >= 18) reasons.push("validated_mobile");
  if (cls.is_strategic_category) reasons.push("high_demand_category");
  if (!website) reasons.push("no_website");
  return reasons;
}

async function checkDuplicate(
  sb: any, e164: string | null, email: string | null, website: string | null,
  rbq: string | null, name: string | null, city: string | null,
): Promise<boolean> {
  if (e164) {
    const { data } = await sb.from("contractor_prospects").select("id").eq("phone", e164).limit(1);
    if (data && data.length) return true;
  }
  if (email) {
    const { data } = await sb.from("contractor_prospects").select("id").eq("email", email).limit(1);
    if (data && data.length) return true;
  }
  if (rbq) {
    const { data } = await sb.from("contractor_prospects").select("id").eq("rbq_number", rbq).limit(1);
    if (data && data.length) return true;
  }
  if (name && city) {
    const norm = normalizeBusinessName(name);
    if (norm.length >= 4) {
      const { data } = await sb.from("contractor_prospects")
        .select("id, business_name, city")
        .eq("city", city)
        .ilike("business_name", `%${norm.split(" ")[0]}%`)
        .limit(3);
      if (data && data.some((r: any) => normalizeBusinessName(r.business_name ?? "").includes(norm.slice(0, 8)))) {
        return true;
      }
    }
  }
  return false;
}

async function upsertProspect(sb: any, p: any): Promise<string | null> {
  // Try match by phone or email first — attach source metadata to existing row
  let existing: any = null;
  if (p.phone) {
    const { data } = await sb.from("contractor_prospects").select("id").eq("phone", p.phone).limit(1);
    existing = data?.[0];
  }
  if (!existing && p.email) {
    const { data } = await sb.from("contractor_prospects").select("id").eq("email", p.email).limit(1);
    existing = data?.[0];
  }
  if (existing) {
    await sb.from("contractor_prospects").update({
      source_key: p.source_key,
      source_priority: p.source_priority,
      acquisition_score: p.acquisition_score,
      classification_confidence: p.classification_confidence,
      listing_intent: p.listing_intent,
      priority_reason: p.priority_reason,
      outreach_eligibility: p.outreach_eligibility,
      rejection_reason: p.rejection_reason,
      last_seen_at: new Date().toISOString(),
    }).eq("id", existing.id);
    return existing.id;
  }

  const { data, error } = await sb.from("contractor_prospects").insert({
    business_name: p.business_name,
    phone: p.phone, email: p.email, website: p.website,
    city: p.city, province: p.province,
    category_slug: p.category_slug,
    source_key: p.source_key,
    source_priority: p.source_priority,
    acquisition_score: p.acquisition_score,
    classification_confidence: p.classification_confidence,
    listing_intent: p.listing_intent,
    priority_reason: p.priority_reason,
    outreach_eligibility: p.outreach_eligibility,
    rejection_reason: p.rejection_reason,
    first_seen_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
  }).select("id").single();
  if (error) { console.error("upsertProspect failed", error); return null; }
  return data.id;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
