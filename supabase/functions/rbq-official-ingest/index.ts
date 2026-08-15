/**
 * rbq-official-ingest — OFFICIAL identity foundation (RBQ, then REQ reconciliation).
 *
 * Source: Données Québec CKAN API (`package_show`). We resolve the CURRENT active
 * resource from dataset metadata — never a hardcoded expiring download URL, never
 * HTML scraping of the portal.
 *
 * Guarantees:
 *  - dry_run is the DEFAULT. Nothing is written unless mode === "ingest".
 *  - Google Places is never called. No outreach, no send queue, no cron.
 *  - Contact data is only what the registry publishes. Nothing is inferred.
 *  - Records WITHOUT contact are RETAINED as contact_status='needs_enrichment'.
 *  - Hard per-run cap + resumable cursor stored on official_source_registry.
 *  - REQ only reconciles identity for selected RBQ NEQs (never the full universe).
 *
 * Body: {
 *   mode?: "dry_run" | "ingest",
 *   dataset?: "rbq" | "req",
 *   limit?: number,            // max records processed this run (hard cap 2000)
 *   cursor?: number,           // resume offset; defaults to stored cursor
 *   regions?: string[], trades?: string[],
 *   neqs?: string[]            // REQ reconcile mode only
 * }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  ckanPackageShow,
  pickResource,
  parseDelimited,
  mapColumns,
  pick,
  regionKeyFor,
  tradeKeysFor,
} from "../_shared/ckanSource.ts";
import {
  normalizeOfficialRecord,
  rankCandidates,
  dedupeKeys,
  PILOT_REGIONS,
  PILOT_TRADES,
  type OfficialRecord,
  type NormalizedOfficialRecord,
} from "../_shared/officialSources.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DATASETS = {
  rbq: {
    slug: "licencesactives",
    source_key: "rbq_licences_actives",
    source_kind: "rbq" as const,
    source_name: "Régie du bâtiment du Québec — Licences actives",
    publisher: "Gouvernement du Québec — Données Québec",
  },
  req: {
    slug: "registre-des-entreprises",
    source_key: "req_registre_entreprises",
    source_kind: "req" as const,
    source_name: "Registre des entreprises du Québec (REQ)",
    publisher: "Gouvernement du Québec — Données Québec",
  },
};

const HARD_RUN_CAP = 2000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startedAt = new Date().toISOString();
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const mode: "dry_run" | "ingest" = body.mode === "ingest" ? "ingest" : "dry_run";
    const datasetKey: "rbq" | "req" = body.dataset === "req" ? "req" : "rbq";
    const ds = DATASETS[datasetKey];
    const limit = Math.min(Number(body.limit) > 0 ? Number(body.limit) : 500, HARD_RUN_CAP);
    const regions: string[] = Array.isArray(body.regions) && body.regions.length
      ? body.regions.map((r: string) => r.toLowerCase())
      : PILOT_REGIONS;
    const trades: string[] = Array.isArray(body.trades) && body.trades.length
      ? body.trades.map((t: string) => t.toLowerCase())
      : PILOT_TRADES;
    const neqFilter: Set<string> | null = datasetKey === "req" && Array.isArray(body.neqs) && body.neqs.length
      ? new Set(body.neqs.map((n: string) => String(n).replace(/\D/g, "")))
      : null;

    if (datasetKey === "req" && !neqFilter) {
      return json({
        ok: false,
        error: "req_requires_neqs",
        message: "REQ ne sert qu'à réconcilier l'identité de NEQ déjà sélectionnés. Fournir `neqs`.",
      }, 400);
    }

    const funnel: Record<string, number> = {
      discovered: 0,
      parsed: 0,
      out_of_scope_region: 0,
      out_of_scope_trade: 0,
      no_contact_retained: 0,
      duplicate_in_batch: 0,
      already_known: 0,
      needs_dataforseo: 0,
      recruitment_ready: 0,
      source_error: 0,
      persisted: 0,
    };

    // ---------- 1. Resolve current resource through the CKAN API ----------
    let pkg;
    try {
      pkg = await ckanPackageShow(ds.slug);
    } catch (e) {
      funnel.source_error++;
      return json({
        ok: false,
        mode,
        dataset: ds.slug,
        funnel,
        error: "ckan_unreachable",
        message: e instanceof Error ? e.message : String(e),
      }, 502);
    }
    const resource = pickResource(pkg.resources ?? []);
    if (!resource?.url) {
      funnel.source_error++;
      return json({ ok: false, mode, dataset: ds.slug, funnel, error: "no_active_resource" }, 502);
    }

    // ---------- 2. Download + parse (defensive column aliasing) ----------
    const fmt = (resource.format ?? "").toLowerCase();
    if (fmt !== "csv") {
      return json({
        ok: false,
        mode,
        dataset: ds.slug,
        resource: { id: resource.id, format: resource.format, url: resource.url },
        funnel,
        error: "unsupported_resource_format",
        message: "Seules les ressources CSV sont traitées automatiquement (aucun scraping).",
      }, 422);
    }

    const cursor = Number.isFinite(body.cursor)
      ? Math.max(0, Number(body.cursor))
      : (await supabase.from("official_source_registry").select("ingest_cursor").eq("source_key", ds.source_key).maybeSingle())
          .data?.ingest_cursor ?? 0;

    let rows: Record<string, string>[] = [];
    try {
      const r = await fetch(resource.url, { headers: { "User-Agent": "UNPRO-OfficialSources/1.0 (+https://unpro.ca)" } });
      if (!r.ok) throw new Error(`resource_http_${r.status}`);
      rows = parseDelimited(await r.text());
    } catch (e) {
      funnel.source_error++;
      return json({
        ok: false, mode, dataset: ds.slug, funnel,
        error: "resource_download_failed",
        message: e instanceof Error ? e.message : String(e),
      }, 502);
    }

    const headers = Object.keys(rows[0] ?? {});
    const map = mapColumns(headers);
    if (!map.business_name) {
      funnel.source_error++;
      return json({ ok: false, mode, dataset: ds.slug, funnel, error: "business_name_column_not_found", headers }, 422);
    }

    // ---------- 3. Normalize within scope ----------
    const slice = rows.slice(cursor, cursor + limit);
    funnel.discovered = slice.length;
    const nextCursor = cursor + slice.length >= rows.length ? 0 : cursor + slice.length;

    const doc = {
      source_key: ds.source_key,
      source_kind: ds.source_kind,
      source_name: ds.source_name,
      source_url: `https://www.donneesquebec.ca/recherche/dataset/${ds.slug}`,
      publisher: ds.publisher,
      source_updated_at: resource.last_modified ?? pkg.metadata_modified ?? null,
      records: [] as OfficialRecord[],
    };

    const normalized: NormalizedOfficialRecord[] = [];
    for (const row of slice) {
      const municipality = pick(row, map, "municipality");
      const region = pick(row, map, "region");
      const categories = pick(row, map, "categories");
      const neq = pick(row, map, "neq");

      if (neqFilter && !neqFilter.has((neq ?? "").replace(/\D/g, ""))) continue;

      if (!neqFilter) {
        const regionKey = regionKeyFor(municipality, region);
        if (!regionKey || !regions.includes(regionKey)) { funnel.out_of_scope_region++; continue; }
        const tradeKeys = tradeKeysFor(`${categories ?? ""} ${pick(row, map, "business_name") ?? ""}`);
        if (!tradeKeys.some((t) => trades.includes(t))) { funnel.out_of_scope_trade++; continue; }
      }

      const rec: OfficialRecord = {
        business_name: pick(row, map, "business_name") ?? "",
        neq,
        rbq_license: pick(row, map, "rbq_license"),
        phone: pick(row, map, "phone"),
        email: pick(row, map, "email"),
        website: pick(row, map, "website"),
        address: pick(row, map, "address"),
        postal_code: pick(row, map, "postal_code"),
        municipality,
        region: region ?? municipality,
        categories: categories ? categories.split(/[;,|]/).map((c) => c.trim()).filter(Boolean) : null,
        raw: row,
      };
      const n = normalizeOfficialRecord(doc, rec, startedAt);
      if (n.parse_error) continue;
      funnel.parsed++;
      if (n.contact_status === "needs_enrichment") funnel.no_contact_retained++;
      normalized.push(n);
    }

    // ---------- 4. Dedupe (NEQ > RBQ > phone/domain > name+postal) ----------
    const seen = new Map<string, NormalizedOfficialRecord>();
    const kept: NormalizedOfficialRecord[] = [];
    for (const n of normalized) {
      const keys = dedupeKeys(n);
      if (keys.some((k) => seen.has(k))) { funnel.duplicate_in_batch++; continue; }
      for (const k of keys) seen.set(k, n);
      kept.push(n);
    }

    // Cross-system dedupe BEFORE any paid enrichment.
    const phones = kept.map((n) => n.phone_e164).filter(Boolean) as string[];
    const names = kept.map((n) => n.business_name);
    const knownPhones = new Set<string>();
    const knownNames = new Set<string>();
    const CHUNK = 40;
    const chunk = <T,>(a: T[]) => Array.from({ length: Math.ceil(a.length / CHUNK) }, (_, i) => a.slice(i * CHUNK, i * CHUNK + CHUNK));

    async function scan(table: string, phoneCols: string[], nameCols: string[]) {
      const jobs: Promise<void>[] = [];
      for (const col of phoneCols) {
        for (const part of chunk(phones)) {
          jobs.push((async () => {
            const { data } = await supabase.from(table).select(col).in(col, part).limit(1000);
            for (const r of (data ?? []) as Record<string, string>[]) if (r[col]) knownPhones.add(r[col]);
          })());
        }
      }
      for (const col of nameCols) {
        for (const part of chunk(names)) {
          jobs.push((async () => {
            const { data } = await supabase.from(table).select(col).in(col, part).limit(1000);
            for (const r of (data ?? []) as Record<string, string>[]) if (r[col]) knownNames.add(r[col]);
          })());
        }
      }
      await Promise.all(jobs);
    }

    if (kept.length > 0) {
      await Promise.all([
        scan("contractor_prospects", ["phone_e164"], ["business_name"]),
        scan("contractor_leads", ["phone_e164"], ["company_name"]),
        scan("contractors", ["phone"], ["business_name"]),
      ]);
    }

    const decided = rankCandidates(kept).map((n) => {
      const already = (n.phone_e164 && knownPhones.has(n.phone_e164)) || knownNames.has(n.business_name);
      if (already) funnel.already_known++;
      else if (n.contact_status === "needs_enrichment") funnel.needs_dataforseo++;
      else funnel.recruitment_ready++;
      return { ...n, already_known: Boolean(already) };
    });

    // ---------- 5. Persist (ingest only, audit trail only — no send queue) ----------
    if (mode === "ingest") {
      await supabase.from("official_source_registry").upsert({
        source_key: ds.source_key,
        source_kind: ds.source_kind,
        source_name: ds.source_name,
        publisher: ds.publisher,
        source_url: doc.source_url,
        dataset_slug: ds.slug,
        resource_id: resource.id,
        resource_url: resource.url,
        resource_format: resource.format ?? null,
        resource_last_modified: resource.last_modified ?? null,
        resource_checksum: resource.hash ?? null,
        document_type: "csv",
        access_policy: "API CKAN officielle Données Québec — aucune extraction HTML",
        robots_allowed: true,
        last_fetched_at: startedAt,
        last_record_count: rows.length,
        ingest_cursor: nextCursor,
        last_run_summary: funnel,
        active: true,
        updated_at: startedAt,
      }, { onConflict: "source_key" });

      const payload = decided.map((d) => ({
        source_key: d.source_key,
        source_kind: d.source_kind,
        source_record_key: d.source_record_key,
        source_name: d.source_name,
        source_url: d.source_url,
        certification: d.certification,
        certificate_no: d.certificate_no,
        neq: d.neq,
        rbq_license: d.rbq_license,
        business_name: d.business_name,
        business_name_norm: d.business_name_norm,
        phone_raw: d.phone_raw,
        phone_e164: d.phone_e164,
        email: d.email,
        website_url: d.website_url,
        official_domain: d.official_domain,
        address: d.address,
        postal_code: d.postal_code,
        municipality: d.municipality,
        city: d.city,
        region: d.region,
        priority_rank: d.priority_rank,
        specialty_bonus: d.specialty_bonus,
        trust_bonus: d.trust_bonus,
        trust_score: d.trust_score,
        contact_status: d.contact_status,
        enrichment_status: d.contact_status === "needs_enrichment" ? "needs_enrichment" : "none",
        raw_record: d.raw_record,
        provenance: d.provenance,
        source_updated_at: d.source_updated_at,
        fetched_at: startedAt,
        dedupe_status: d.already_known ? "known" : "new",
        dedupe_signals: { keys: dedupeKeys(d) },
        eligibility_status: d.already_known ? "blocked" : (d.contact_status === "needs_enrichment" ? "blocked" : "eligible"),
        blocked_reason: d.already_known ? "already_known_in_unpro" : (d.contact_status === "needs_enrichment" ? "needs_enrichment" : null),
        updated_at: startedAt,
      }));
      for (let i = 0; i < payload.length; i += 100) {
        const { error } = await supabase
          .from("official_source_records")
          .upsert(payload.slice(i, i + 100), { onConflict: "source_key,source_record_key" });
        if (error) console.error("official_source_records upsert:", error.message);
        else funnel.persisted += payload.slice(i, i + 100).length;
      }
    }

    return json({
      ok: true,
      mode,
      dataset: ds.slug,
      source_kind: ds.source_kind,
      resource: {
        id: resource.id,
        format: resource.format,
        last_modified: resource.last_modified ?? null,
        checksum: resource.hash ?? null,
        url: resource.url,
      },
      rows_in_resource: rows.length,
      cursor,
      next_cursor: nextCursor,
      column_map: map,
      funnel,
      top_candidates: decided.slice(0, 15).map((d) => ({
        business_name: d.business_name,
        neq: d.neq,
        rbq_license: d.rbq_license,
        city: d.city,
        region: d.region,
        priority_rank: d.priority_rank,
        trust_score: d.trust_score,
        contact_status: d.contact_status,
        already_known: d.already_known,
      })),
      notes: [
        "Aucun appel Google Places. Aucun envoi. Aucune file d'envoi alimentée.",
        "Les fiches sans contact publié sont conservées en 'needs_enrichment' (jamais rejetées, jamais promues).",
        "La découverte n'est pas un consentement : CASL, opt-out et suppression restent souverains.",
      ],
    });
  } catch (e) {
    console.error("rbq-official-ingest failed:", e);
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
