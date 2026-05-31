// UNPRO — verify-extrapolate
// One-shot extrapolation: Google business → RBQ registry → NEQ registry → Reviews analysis.
// Input: { business_name, city?, phone?, website?, place_id?, rating?, review_count? }
// Output: { rbq: {...}, neq: {...}, reviews: {...} } — every sub-result independently OK/empty/error.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FIRECRAWL = "https://api.firecrawl.dev/v2/scrape";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const RBQ_SEARCH = "https://www.rbq.gouv.qc.ca/recherche-dun-titulaire-dune-licence-rbq/resultats-de-la-recherche.html";

type Status = "ok" | "empty" | "error";

interface ExtrapolateInput {
  business_name: string;
  city?: string;
  phone?: string;
  website?: string;
  place_id?: string;
  rating?: number;
  review_count?: number;
}

async function scrapeMarkdown(url: string, key: string): Promise<string> {
  try {
    const res = await fetch(FIRECRAWL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true, waitFor: 1500 }),
    });
    if (!res.ok) return "";
    const j = await res.json();
    return j?.data?.markdown ?? j?.markdown ?? "";
  } catch { return ""; }
}

async function aiExtract(md: string, prompt: string, key: string): Promise<any> {
  try {
    const res = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You extract structured JSON. Return only valid JSON, no prose." },
          { role: "user", content: `${prompt}\n\nSource:\n${md.slice(0, 8000)}` },
        ],
      }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const txt = j?.choices?.[0]?.message?.content ?? "";
    const m = txt.match(/\{[\s\S]*\}/);
    if (!m) return null;
    return JSON.parse(m[0]);
  } catch { return null; }
}

async function lookupRbq(input: ExtrapolateInput, firecrawl: string, ai: string) {
  try {
    const url = `${RBQ_SEARCH}?nomEntreprise=${encodeURIComponent(input.business_name)}`;
    const md = await scrapeMarkdown(url, firecrawl);
    if (!md || md.length < 100) return { status: "empty" as Status, candidates: [] };
    const parsed = await aiExtract(
      md,
      `Extract up to 5 RBQ license holders matching "${input.business_name}"${input.city ? ` near ${input.city}` : ""}. Return JSON: {"candidates":[{"legal_name":"","rbq_number":"","city":"","status":"valid|expired|suspended|unknown","subcategories":[]}]}`,
      ai,
    );
    const candidates = parsed?.candidates ?? [];
    if (!candidates.length) return { status: "empty" as Status, candidates: [] };
    // Best match: name+city similarity (very simple).
    const best = candidates[0];
    return {
      status: "ok" as Status,
      candidates,
      best,
      rbq_number: best?.rbq_number ?? null,
      registered_name: best?.legal_name ?? null,
      rbq_status: best?.status ?? "unknown",
      subcategories: best?.subcategories ?? [],
    };
  } catch (e) {
    return { status: "error" as Status, error: String(e instanceof Error ? e.message : e) };
  }
}

async function lookupNeq(input: ExtrapolateInput, firecrawl: string, ai: string) {
  try {
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(
      `"${input.business_name}" site:registreentreprises.gouv.qc.ca`,
    )}`;
    const md = await scrapeMarkdown(googleUrl, firecrawl);
    if (!md || md.length < 100) return { status: "empty" as Status };
    const parsed = await aiExtract(
      md,
      `Extract the most likely NEQ company file from these Google results for "${input.business_name}". Return JSON: {"neq":"","legal_name":"","status":"active|inactive|struck_off|unknown","registration_date":"","registered_address":""} — empty strings if unknown.`,
      ai,
    );
    if (!parsed || !parsed.neq) return { status: "empty" as Status };
    return {
      status: "ok" as Status,
      neq: parsed.neq,
      legal_name: parsed.legal_name ?? null,
      neq_status: parsed.status ?? "unknown",
      registration_date: parsed.registration_date ?? null,
      registered_address: parsed.registered_address ?? null,
    };
  } catch (e) {
    return { status: "error" as Status, error: String(e instanceof Error ? e.message : e) };
  }
}

function analyzeReviews(input: ExtrapolateInput) {
  const rating = Number(input.rating ?? 0);
  const count = Number(input.review_count ?? 0);
  if (!rating && !count) return { status: "empty" as Status };
  const volume_tier = count >= 200 ? "high" : count >= 50 ? "medium" : count >= 10 ? "low" : "very_low";
  const sentiment = rating >= 4.5 ? "excellent" : rating >= 4.0 ? "positive" : rating >= 3.0 ? "mixed" : "negative";
  const red_flags: string[] = [];
  if (count > 0 && count < 5) red_flags.push("Très peu d'avis publics — difficile d'évaluer la fiabilité.");
  if (rating > 0 && rating < 3.5) red_flags.push("Note moyenne sous 3.5/5 — examiner les avis négatifs.");
  if (rating >= 4.8 && count < 10) red_flags.push("Note parfaite avec peu d'avis — vérifier l'authenticité.");
  return {
    status: "ok" as Status,
    rating,
    review_count: count,
    sentiment,
    volume_tier,
    red_flags,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY") ?? "";
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";

    const input: ExtrapolateInput = await req.json();
    if (!input?.business_name?.trim()) {
      return new Response(JSON.stringify({ error: "business_name required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const hasFirecrawl = !!FIRECRAWL_API_KEY && !!LOVABLE_API_KEY;
    const [rbq, neq, reviews] = await Promise.all([
      hasFirecrawl ? lookupRbq(input, FIRECRAWL_API_KEY, LOVABLE_API_KEY) : Promise.resolve({ status: "error" as Status, error: "Registry lookup unavailable" }),
      hasFirecrawl ? lookupNeq(input, FIRECRAWL_API_KEY, LOVABLE_API_KEY) : Promise.resolve({ status: "error" as Status, error: "Registry lookup unavailable" }),
      Promise.resolve(analyzeReviews(input)),
    ]);

    // Fire-and-forget event log
    supabase.from("system_events").insert({
      event_type: "verification.extrapolation_done",
      payload: { input, rbq_status: (rbq as any).status, neq_status: (neq as any).status, reviews_status: (reviews as any).status },
    }).then(() => {}, () => {});

    return new Response(JSON.stringify({ ok: true, rbq, neq, reviews }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e instanceof Error ? e.message : e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
