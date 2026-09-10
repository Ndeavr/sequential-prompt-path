/**
 * acq-enrich-free-batch
 *
 * Enrichissement par LOT des prospects du segment « services résidentiels —
 * 12 mois gratuits » : pour chaque fiche admissible qui possède un site
 * officiel mais aucune adresse courriel, on appelle la fonction canonique
 * `enrich-official-website` (provenance exacte, evidence append-only).
 *
 * Cette fonction n'envoie RIEN. Elle ne crée aucun consentement : découverte
 * ≠ permission. Les portes CASL / suppression / doublons restent dans les
 * workers d'envoi.
 *
 * Body : { limit?: number, dry_run?: boolean, city?: string, category_slug?: string }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const FN = "acq-enrich-free-batch";

function jr(body: Record<string, unknown>, status = 200, rid = crypto.randomUUID()) {
  return new Response(JSON.stringify({ function: FN, request_id: rid, ...body }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "x-request-id": rid },
  });
}

Deno.serve(async (req) => {
  const rid = crypto.randomUUID();
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !svc) return jr({ ok: false, code: "missing_backend_credentials" }, 500, rid);
    const supabase = createClient(url, svc);

    const body = await req.json().catch(() => ({}));
    const limit = Math.max(1, Math.min(Number(body.limit ?? 10), 40));
    const dryRun = body.dry_run === true;
    const city = typeof body.city === "string" && body.city.trim() ? body.city.trim() : null;
    const categorySlug = typeof body.category_slug === "string" && body.category_slug.trim()
      ? body.category_slug.trim()
      : null;

    // Catalogue serveur des catégories réellement admissibles — fail-closed.
    const { data: cats, error: catErr } = await supabase
      .from("founder_eligible_categories")
      .select("slug")
      .eq("is_active", true);
    if (catErr || !cats || cats.length === 0) {
      return jr({ ok: false, code: "free_category_catalog_unreadable" }, 200, rid);
    }
    const slugs = cats.map((c: any) => String(c.slug));

    // Fiches déjà réellement explorées récemment (preuve : une exécution de
    // crawl du site officiel), pour ne jamais boucler sur les mêmes sites.
    const since = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
    const { data: recentRuns } = await supabase
      .from("official_site_crawl_runs")
      .select("prospect_id")
      .gte("started_at", since)
      .not("prospect_id", "is", null)
      .limit(2000);
    const alreadyCrawled = new Set((recentRuns ?? []).map((r: any) => String(r.prospect_id)));

    let q = supabase
      .from("verified_contractor_prospects")
      .select("id, business_name, city, service_category_slug, website_url, email")
      .in("service_category_slug", categorySlug ? [categorySlug] : slugs)
      .not("website_url", "is", null)
      .is("email", null)
      .order("created_at", { ascending: false })
      .limit(limit + alreadyCrawled.size);
    if (city) q = q.ilike("city", `${city}%`);

    const { data: pool, error } = await q;
    if (error) return jr({ ok: false, code: "target_query_failed", message: error.message }, 500, rid);
    const targets = (pool ?? []).filter((p: any) => !alreadyCrawled.has(String(p.id))).slice(0, limit);

    const results: Array<Record<string, unknown>> = [];
    let emailsFound = 0;

    for (const p of targets ?? []) {
      if (dryRun) {
        results.push({ id: p.id, business_name: p.business_name, city: p.city, website_url: p.website_url, planned: "crawl" });
        continue;
      }
      try {
        const res = await fetch(`${url}/functions/v1/enrich-official-website`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${svc}` },
          body: JSON.stringify({ prospect_id: p.id, website_url: p.website_url }),
        });
        const json = await res.json().catch(() => ({}));
        const found = Array.isArray(json?.extracted?.emails) ? json.extracted.emails.filter(Boolean) : [];
        if (found.length > 0) emailsFound += 1;
        results.push({
          id: p.id,
          business_name: p.business_name,
          city: p.city,
          status: json?.status ?? `http_${res.status}`,
          emails_found: found.length,
          pages_ok: json?.pages_ok ?? 0,
        });
      } catch (e) {
        results.push({ id: p.id, business_name: p.business_name, status: "crawl_error", error: String((e as Error).message).slice(0, 200) });
      }
    }

    if (!dryRun) {
      await supabase.from("agent_logs").insert({
        agent_name: FN,
        log_type: "info",
        message: `enrichment batch: ${results.length} crawled, ${emailsFound} with email`,
        metadata: { request_id: rid, crawled: results.length, emails_found: emailsFound },
      }).then(() => {}, () => {});
    }

    return jr({
      ok: true,
      dry_run: dryRun,
      crawled: results.length,
      emails_found: emailsFound,
      results,
    }, 200, rid);
  } catch (e) {
    console.error(`[${rid}] ${FN} failed`, e);
    return jr({ ok: false, code: "function_error", message: (e as Error).message }, 500, rid);
  }
});
