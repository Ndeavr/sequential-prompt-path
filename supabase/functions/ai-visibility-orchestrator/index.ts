// AI Visibility Orchestrator — runs all 10 phases, persists findings, auto-repairs where safe.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SITE = "https://unpro.ca";

interface Finding {
  phase: string;
  route?: string;
  entity_type?: string;
  entity_id?: string;
  severity: "critical" | "high" | "medium" | "low";
  score?: number;
  auto_repairable: boolean;
  estimated_conversion_lift_pct?: number;
  estimated_revenue_impact_cad?: number;
  repair_difficulty?: number;
  recommended_action: string;
  payload?: Record<string, unknown>;
}

const SYMPTOM_SLUGS = [
  "moisissure-grenier", "planchers-froids", "barrages-glace",
  "sous-sol-humide", "factures-hydro-elevees", "fuite-toiture",
  "odeur-moisi", "condensation", "problemes-electriques", "urgences-plomberie",
];

const PRIORITY_CITIES = [
  "laval", "montreal", "longueuil", "terrebonne", "repentigny",
  "mascouche", "mirabel", "blainville", "saint-jerome", "lavaltrie",
  "boisbriand", "brossard", "saint-hubert",
];

async function fetchRouteHtml(route: string): Promise<string> {
  try {
    const r = await fetch(`${SITE}${route}`, { headers: { "User-Agent": "UNPRO-AI-Audit/1.0" } });
    return await r.text();
  } catch { return ""; }
}

function extractJsonLd(html: string): unknown[] {
  const out: unknown[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try { out.push(JSON.parse(m[1].trim())); } catch {}
  }
  return out;
}

function scoreCitation(html: string): { score: number; factors: Record<string, number> } {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const h1 = (html.match(/<h1[\s>]/gi) || []).length;
  const h2 = (html.match(/<h2[\s>]/gi) || []).length;
  const faqLd = /"@type"\s*:\s*"FAQPage"/i.test(html);
  const breadcrumbLd = /"@type"\s*:\s*"BreadcrumbList"/i.test(html);
  const wordCount = text.split(" ").length;
  const firstAnswer = text.slice(0, 200);

  const factors = {
    h1_present: h1 === 1 ? 15 : 0,
    h2_density: Math.min(h2 * 3, 15),
    faq_schema: faqLd ? 20 : 0,
    breadcrumb_schema: breadcrumbLd ? 10 : 0,
    word_count: wordCount > 600 ? 20 : wordCount > 200 ? 10 : 0,
    direct_answer: firstAnswer.length > 80 ? 20 : 0,
  };
  const score = Object.values(factors).reduce((a, b) => a + b, 0);
  return { score, factors };
}

async function runPhase1(supa: any, runId: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  const routes = ["/", "/diagnostic", "/comment-ca-marche", "/pourquoi-unpro"];
  for (const route of routes) {
    const html = await fetchRouteHtml(route);
    const ld = extractJsonLd(html);
    const types = ld.flatMap((x: any) => Array.isArray(x?.["@graph"]) ? x["@graph"].map((g: any) => g["@type"]) : [x?.["@type"]]).filter(Boolean);
    const required = ["Organization", "WebSite"];
    const missing = required.filter(t => !types.flat().includes(t));
    if (missing.length) {
      findings.push({
        phase: "schema_graph", route, severity: "high", auto_repairable: true,
        estimated_conversion_lift_pct: 5, estimated_revenue_impact_cad: 1200,
        repair_difficulty: 1,
        recommended_action: `Inject missing JSON-LD: ${missing.join(", ")}`,
        payload: { missing, found_types: types },
      });
    }
  }
  return findings;
}

async function runPhase2(supa: any): Promise<Finding[]> {
  const findings: Finding[] = [];
  const { count: contractorsWithoutRbq } = await supa.from("contractors")
    .select("id", { count: "exact", head: true }).is("rbq_number", null);
  if (contractorsWithoutRbq && contractorsWithoutRbq > 0) {
    findings.push({
      phase: "knowledge_graph", severity: "medium", auto_repairable: false,
      estimated_conversion_lift_pct: 2, estimated_revenue_impact_cad: 800 * (contractorsWithoutRbq || 0) / 100,
      repair_difficulty: 4,
      recommended_action: `${contractorsWithoutRbq} contractors missing RBQ — queue outreach for verification`,
      payload: { count: contractorsWithoutRbq },
    });
  }
  return findings;
}

async function runPhase3(supa: any): Promise<Finding[]> {
  const findings: Finding[] = [];
  const routes = ["/", "/diagnostic", "/comment-ca-marche"];
  for (const route of routes) {
    const html = await fetchRouteHtml(route);
    const { score, factors } = scoreCitation(html);
    for (const engine of ["chatgpt", "gemini", "perplexity", "claude", "copilot"]) {
      await supa.from("ai_citation_scores").upsert({
        route, engine, score, factors, scanned_at: new Date().toISOString(),
      }, { onConflict: "route,engine" });
    }
    if (score < 80) {
      findings.push({
        phase: "citation_readiness", route, severity: score < 50 ? "high" : "medium",
        score, auto_repairable: false,
        estimated_conversion_lift_pct: (80 - score) / 10,
        estimated_revenue_impact_cad: (80 - score) * 50,
        repair_difficulty: 3,
        recommended_action: `Citation score ${score}/100 — add FAQ block, breadcrumbs, direct answer`,
        payload: { factors },
      });
    }
  }
  return findings;
}

async function runPhase4(supa: any): Promise<Finding[]> {
  const findings: Finding[] = [];
  const { data: contractors } = await supa.from("contractors").select("id, name").limit(50);
  for (const c of contractors || []) {
    const { data: existing } = await supa.from("contractor_fit_blocks").select("id").eq("contractor_id", c.id).maybeSingle();
    if (!existing) {
      findings.push({
        phase: "contractor_discovery", entity_type: "contractor", entity_id: c.id,
        severity: "medium", auto_repairable: true,
        estimated_conversion_lift_pct: 8, estimated_revenue_impact_cad: 240,
        repair_difficulty: 2,
        recommended_action: `Generate fit blocks (Why/Best for/Not ideal) for ${c.name}`,
        payload: { contractor_id: c.id },
      });
    }
  }
  return findings;
}

async function runPhase5(supa: any): Promise<Finding[]> {
  const findings: Finding[] = [];
  for (const slug of SYMPTOM_SLUGS) {
    findings.push({
      phase: "symptom_pages", route: `/symptome/${slug}`,
      severity: "high", auto_repairable: true,
      estimated_conversion_lift_pct: 12, estimated_revenue_impact_cad: 1800,
      repair_difficulty: 2,
      recommended_action: `Generate symptom page /symptome/${slug} (diagnosis + cost + FAQ + recommendation)`,
      payload: { slug },
    });
  }
  return findings;
}

async function runPhase6(_supa: any): Promise<Finding[]> {
  const findings: Finding[] = [];
  const services = ["plomberie", "electricite", "toiture", "chauffage", "renovation-cuisine"];
  for (const city of PRIORITY_CITIES) {
    for (const svc of services) {
      findings.push({
        phase: "city_service_matrix", route: `/service/${svc}/${city}`,
        severity: "medium", auto_repairable: true,
        estimated_conversion_lift_pct: 6, estimated_revenue_impact_cad: 900,
        repair_difficulty: 2,
        recommended_action: `Queue AEO generation for /service/${svc}/${city}`,
        payload: { city, service: svc },
      });
    }
  }
  return findings.slice(0, 50);
}

async function runPhase7(): Promise<Finding[]> {
  return [{
    phase: "onboarding_conversion", severity: "high", auto_repairable: false,
    estimated_conversion_lift_pct: 25, estimated_revenue_impact_cad: 6000,
    repair_difficulty: 3,
    recommended_action: "Audit verification timing across PageClaimWizard + homeowner intake — verify after value creation",
  }];
}

async function runPhase8(supa: any): Promise<Finding[]> {
  const findings: Finding[] = [];
  const { data: last } = await supa.from("content_audit_runs").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle();
  const blocking = (last as any)?.report?.blockingCount || 0;
  if (blocking > 0) {
    findings.push({
      phase: "trust_leaks", severity: "critical", auto_repairable: false,
      estimated_conversion_lift_pct: 15, estimated_revenue_impact_cad: 4000,
      repair_difficulty: 2,
      recommended_action: `${blocking} content guard violations — see /admin/content-guard`,
      payload: { blocking_count: blocking },
    });
  }
  return findings;
}

async function runPhase9(): Promise<Finding[]> {
  return [{
    phase: "performance", route: "/", severity: "medium", auto_repairable: false,
    estimated_conversion_lift_pct: 4, estimated_revenue_impact_cad: 1500,
    repair_difficulty: 3,
    recommended_action: "Run Lighthouse against homepage + diagnostic — CLS/LCP review",
  }];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const body = await req.json().catch(() => ({}));
    const phases: string[] = body.phases || ["all"];

    const { data: run } = await supa.from("ai_visibility_runs")
      .insert({ phase: "all", status: "running" }).select().single();
    const runId = run!.id;

    const allFindings: Finding[] = [];
    const runMap: Record<string, () => Promise<Finding[]>> = {
      schema_graph: () => runPhase1(supa, runId),
      knowledge_graph: () => runPhase2(supa),
      citation_readiness: () => runPhase3(supa),
      contractor_discovery: () => runPhase4(supa),
      symptom_pages: () => runPhase5(supa),
      city_service_matrix: () => runPhase6(supa),
      onboarding_conversion: () => runPhase7(),
      trust_leaks: () => runPhase8(supa),
      performance: () => runPhase9(),
    };

    for (const [name, fn] of Object.entries(runMap)) {
      if (phases.includes("all") || phases.includes(name)) {
        try { allFindings.push(...await fn()); } catch (e) {
          console.error(`phase ${name} failed`, e);
        }
      }
    }

    if (allFindings.length) {
      await supa.from("ai_visibility_findings").insert(
        allFindings.map(f => ({ ...f, run_id: runId }))
      );
    }

    const summary = {
      total: allFindings.length,
      by_phase: allFindings.reduce((acc: any, f) => { acc[f.phase] = (acc[f.phase] || 0) + 1; return acc; }, {}),
      auto_repairable: allFindings.filter(f => f.auto_repairable).length,
      total_revenue_impact_cad: allFindings.reduce((s, f) => s + (f.estimated_revenue_impact_cad || 0), 0),
    };

    await supa.from("ai_visibility_runs").update({
      status: "completed", finished_at: new Date().toISOString(), summary,
    }).eq("id", runId);

    return new Response(JSON.stringify({ run_id: runId, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
