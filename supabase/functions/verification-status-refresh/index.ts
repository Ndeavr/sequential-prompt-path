// UNPRO — verification-status-refresh
// Refreshes real verification status for a contractor across all supported
// dimensions (currently: rbq, neq). Uses public registries via Firecrawl +
// Gemini extraction. NEVER fabricates a positive status: on failure, we
// record status='unknown' with the FailureCode so the UI can display
// "Non disponible" instead of a fake "Vérifié".
//
// POST { contractor_id: string } or { batch: true, limit?: number }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FIRECRAWL = "https://api.firecrawl.dev/v2/scrape";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const RBQ_SEARCH = "https://www.rbq.gouv.qc.ca/recherche-dun-titulaire-dune-licence-rbq/resultats-de-la-recherche.html";

type Dim = "rbq" | "neq";
type Status = "verified" | "partial" | "missing" | "unknown" | "expiring";

interface DimResult {
  dimension: Dim;
  status: Status;
  evidence: Record<string, unknown>;
  source: string;
  failure_code?: string | null;
}

function normalizeName(s: string) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}
function similarity(a: string, b: string) {
  const A = normalizeName(a).split(" ").filter(Boolean);
  const B = new Set(normalizeName(b).split(" ").filter(Boolean));
  if (A.length === 0 || B.size === 0) return 0;
  const inter = A.filter((t) => B.has(t)).length;
  return inter / Math.max(A.length, B.size);
}

async function firecrawl(url: string, apiKey: string): Promise<string> {
  const r = await fetch(FIRECRAWL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true, waitFor: 1500 }),
  });
  if (!r.ok) throw new Error(`firecrawl_${r.status}`);
  const j = await r.json();
  return (j?.data?.markdown ?? j?.markdown ?? "") as string;
}

async function extract(prompt: string, apiKey: string): Promise<any> {
  const r = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Tu extrais uniquement des faits présents textuellement dans le contenu fourni. Aucune invention. Réponds en JSON strict." },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!r.ok) throw new Error(`ai_${r.status}`);
  const j = await r.json();
  const raw = j?.choices?.[0]?.message?.content ?? "{}";
  try { return JSON.parse(raw); } catch { return {}; }
}

async function checkRbq(contractor: any, fcKey: string, aiKey: string): Promise<DimResult> {
  const name = contractor.legal_name || contractor.business_name;
  if (!name) return { dimension: "rbq", status: "missing", evidence: { reason: "no_business_name" }, source: "rbq_registry" };

  const queryParam = contractor.rbq_number
    ? `numeroLicence=${encodeURIComponent(contractor.rbq_number)}`
    : `nomEntreprise=${encodeURIComponent(name)}`;
  const url = `${RBQ_SEARCH}?${queryParam}`;

  try {
    const md = await firecrawl(url, fcKey);
    if (!md || md.length < 50) {
      return { dimension: "rbq", status: "unknown", evidence: { url, reason: "empty_scrape" }, source: "rbq_registry", failure_code: "EXTERNAL_TIMEOUT" };
    }
    const data = await extract(
      `Recherche: "${name}" ${contractor.rbq_number ? `licence ${contractor.rbq_number}` : ""} (ville: ${contractor.city ?? "—"}).\n` +
      `Extrait chaque titulaire trouvé dans ce contenu RBQ:\n${md.slice(0, 12000)}\n\n` +
      `Réponds JSON: { "candidates": [{"business_name": string, "rbq_number": string, "status": string, "city": string|null}] }`,
      aiKey,
    );
    const candidates: any[] = Array.isArray(data?.candidates) ? data.candidates : [];
    if (candidates.length === 0) {
      return { dimension: "rbq", status: "missing", evidence: { url, candidates: [] }, source: "rbq_registry" };
    }
    const scored = candidates
      .map((c) => ({ c, score: similarity(c.business_name ?? "", name) + (contractor.rbq_number && c.rbq_number === contractor.rbq_number ? 1 : 0) }))
      .sort((a, b) => b.score - a.score);
    const best = scored[0];
    const isActive = /actif|valide|en vigueur/i.test(best.c.status ?? "");
    const status: Status = best.score >= 0.9 && isActive ? "verified" : best.score >= 0.5 ? "partial" : "missing";
    return {
      dimension: "rbq",
      status,
      evidence: { matched: best.c, score: best.score, candidates_count: candidates.length, url },
      source: "rbq_registry",
    };
  } catch (e: any) {
    return { dimension: "rbq", status: "unknown", evidence: { url, error: String(e?.message ?? e) }, source: "rbq_registry", failure_code: "EXTERNAL_TIMEOUT" };
  }
}

async function checkNeq(contractor: any, fcKey: string, aiKey: string): Promise<DimResult> {
  const name = contractor.legal_name || contractor.business_name;
  if (!name && !contractor.neq) return { dimension: "neq", status: "missing", evidence: { reason: "no_input" }, source: "req_registry" };

  const query = contractor.neq ? `"${contractor.neq}"` : `"${name}"`;
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(`${query} site:registreentreprises.gouv.qc.ca`)}`;

  try {
    const md = await firecrawl(googleUrl, fcKey);
    if (!md || md.length < 50) {
      return { dimension: "neq", status: "unknown", evidence: { url: googleUrl, reason: "empty_scrape" }, source: "req_registry", failure_code: "EXTERNAL_TIMEOUT" };
    }
    const data = await extract(
      `Recherche NEQ pour: ${query} (ville: ${contractor.city ?? "—"}).\n${md.slice(0, 12000)}\n\n` +
      `Réponds JSON: { "candidates": [{"business_name": string, "neq": string, "status": string|null}] }`,
      aiKey,
    );
    const candidates: any[] = Array.isArray(data?.candidates) ? data.candidates : [];
    if (candidates.length === 0) {
      return { dimension: "neq", status: "missing", evidence: { url: googleUrl, candidates: [] }, source: "req_registry" };
    }
    const scored = candidates
      .map((c) => ({ c, score: (contractor.neq && c.neq === contractor.neq ? 1 : 0) + similarity(c.business_name ?? "", name ?? "") }))
      .sort((a, b) => b.score - a.score);
    const best = scored[0];
    const isActive = !best.c.status || /immatricul|actif|en vigueur/i.test(best.c.status);
    const status: Status = best.score >= 0.9 && isActive ? "verified" : best.score >= 0.5 ? "partial" : "missing";
    return { dimension: "neq", status, evidence: { matched: best.c, score: best.score, url: googleUrl }, source: "req_registry" };
  } catch (e: any) {
    return { dimension: "neq", status: "unknown", evidence: { error: String(e?.message ?? e) }, source: "req_registry", failure_code: "EXTERNAL_TIMEOUT" };
  }
}

async function refreshContractor(supabase: any, contractorId: string, fcKey: string, aiKey: string) {
  const { data: contractor, error } = await supabase
    .from("contractors")
    .select("id, business_name, legal_name, city, rbq_number, neq, rbq_expiry_date")
    .eq("id", contractorId)
    .single();
  if (error || !contractor) throw new Error("contractor_not_found");

  const results: DimResult[] = [];
  results.push(await checkRbq(contractor, fcKey, aiKey));
  results.push(await checkNeq(contractor, fcKey, aiKey));

  const now = new Date().toISOString();
  for (const r of results) {
    const row: any = {
      contractor_id: contractorId,
      dimension: r.dimension,
      status: r.status,
      evidence: r.evidence,
      source: r.source,
      last_checked_at: now,
      failure_code: r.failure_code ?? null,
      updated_at: now,
    };
    if (r.status === "verified" || r.status === "partial") row.last_success_at = now;
    await supabase.from("contractor_verification_status").upsert(row, { onConflict: "contractor_id,dimension" });
  }

  // Mirror the RBQ dimension onto contractors so the recommendation engine keeps working.
  const rbq = results.find((r) => r.dimension === "rbq");
  if (rbq) {
    let compliance: string = "not_provided";
    if (rbq.status === "verified") compliance = "verified";
    else if (rbq.status === "partial") compliance = "in_progress";
    else if (rbq.status === "missing") compliance = "not_provided";
    // "unknown" → leave existing value alone
    const update: any = { rbq_last_check: now };
    if (rbq.status !== "unknown") {
      update.rbq_compliance_status = compliance;
      if (rbq.status === "verified") update.rbq_verified_at = now;
    }
    await supabase.from("contractors").update(update).eq("id", contractorId);
  }

  // Report business outcome for reliability tracking (best-effort).
  await supabase.from("platform_operation_outcomes").insert({
    operation: "verification-status-refresh",
    outcome: results.every((r) => r.status !== "unknown") ? "achieved" : "partial",
    affected_record: contractorId,
    service: "verification",
    payload: { results },
  }).then(() => null).catch(() => null);

  return { contractor_id: contractorId, results };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const fcKey = Deno.env.get("FIRECRAWL_API_KEY");
    const aiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!fcKey || !aiKey) {
      return new Response(JSON.stringify({ error: "MISSING_SECRET", missing: [!fcKey && "FIRECRAWL_API_KEY", !aiKey && "LOVABLE_API_KEY"].filter(Boolean) }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));

    if (body?.batch) {
      const limit = Math.min(Math.max(Number(body.limit ?? 10), 1), 50);
      // Refresh oldest first: contractors with no row or oldest last_checked_at.
      const { data: candidates } = await supabase.rpc("verification_refresh_candidates", { p_limit: limit }).then((r: any) => r).catch(() => ({ data: null }));
      let list: { id: string }[] = candidates ?? [];
      if (!candidates) {
        const { data } = await supabase.from("contractors").select("id").order("updated_at", { ascending: true }).limit(limit);
        list = data ?? [];
      }
      const out: any[] = [];
      for (const c of list) {
        try { out.push(await refreshContractor(supabase, c.id, fcKey, aiKey)); }
        catch (e: any) { out.push({ contractor_id: c.id, error: String(e?.message ?? e) }); }
      }
      return new Response(JSON.stringify({ processed: out.length, results: out }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const contractorId: string | undefined = body?.contractor_id;
    if (!contractorId) {
      return new Response(JSON.stringify({ error: "contractor_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const result = await refreshContractor(supabase, contractorId, fcKey, aiKey);
    return new Response(JSON.stringify({ success: true, ...result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
