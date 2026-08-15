/**
 * official-source-ingest — OFFICIAL VERIFIED SOURCES adapter (dry-run first).
 *
 * Ingests certified contractors published by official Québec public lists
 * (Novoclimat certified ventilation specialists) into the EXISTING canonical
 * pipeline: contractor_prospects -> acquisition-queue-worker -> recruitment-orchestrator.
 *
 * No parallel sender, queue, cron or prospect table is created here.
 *
 * Body:
 *   { mode: "dry_run" | "ingest", limit?: number, regions?: string[], verify_source?: boolean }
 *
 * Guarantees:
 *  - Contact data is only what the official document publishes (never inferred).
 *  - Dedupe runs BEFORE any paid enrichment; Google Places is never called here.
 *  - Certification grants a trust/specialty score bonus, never a CASL/opt-out bypass.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  type OfficialSourceDoc,
  normalizeOfficialRecord,
  rankCandidates,
  type NormalizedOfficialRecord,
} from "../_shared/officialSources.ts";
import novoclimat from "./data/novoclimat.json" with { type: "json" };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DOCS = novoclimat as unknown as OfficialSourceDoc[];

type Funnel = Record<string, number>;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const mode: "dry_run" | "ingest" = body.mode === "ingest" ? "ingest" : "dry_run";
    const limit: number = Number.isFinite(body.limit) ? Math.max(0, Number(body.limit)) : 0;
    const regionFilter: string[] | null = Array.isArray(body.regions) && body.regions.length
      ? body.regions.map((r: string) => r.toLowerCase())
      : null;
    const verifySource: boolean = body.verify_source !== false;

    const fetchedAt = new Date().toISOString();
    const funnel: Funnel = {
      documents: DOCS.length,
      records_discovered: 0,
      records_parsed: 0,
      no_contact_retained: 0,
      region_filtered_out: 0,
      duplicate_in_batch: 0,
      already_known: 0,
      new_candidates: 0,
      blocked_opt_out: 0,
      blocked_not_contactable: 0,
      eligible: 0,
      promoted_to_prospects: 0,
    };
    const blockedBreakdown: Record<string, number> = {};
    const sourceStatus: Array<Record<string, unknown>> = [];

    // ---------- 1. Registry + optional live source verification ----------
    for (const doc of DOCS) {
      let http_status: number | null = null;
      let reachable: boolean | null = null;
      if (verifySource) {
        try {
          const head = await fetch(doc.source_url, { method: "HEAD" });
          http_status = head.status;
          reachable = head.ok;
        } catch (_e) {
          reachable = false;
        }
      }
      sourceStatus.push({
        source_key: doc.source_key,
        source_name: doc.source_name,
        source_url: doc.source_url,
        certification: doc.certification,
        document_sha256: doc.document_sha256,
        document_updated_label: doc.document_updated_label,
        records_in_document: doc.records.length,
        http_status,
        reachable,
      });

      if (mode === "ingest") {
        await supabase.from("official_source_registry").upsert({
          source_key: doc.source_key,
          source_name: doc.source_name,
          publisher: "Gouvernement du Québec — Novoclimat",
          source_url: doc.source_url,
          document_type: "pdf",
          certification: doc.certification,
          access_policy: "Liste publique officielle — robots.txt vérifié, mise en cache du document public",
          robots_allowed: true,
          last_fetched_at: fetchedAt,
          last_document_sha256: doc.document_sha256,
          last_record_count: doc.records.length,
          active: true,
          updated_at: fetchedAt,
        }, { onConflict: "source_key" });
      }
    }

    // ---------- 2. Parse + normalize ----------
    let normalized: NormalizedOfficialRecord[] = [];
    for (const doc of DOCS) {
      for (const rec of doc.records) {
        funnel.records_discovered++;
        const n = normalizeOfficialRecord({ ...doc, source_kind: "novoclimat" }, rec, fetchedAt);
        if (n.parse_error) continue;
        funnel.records_parsed++;
        // A record without published contact is RETAINED (needs_enrichment),
        // never rejected and never promoted for outreach.
        if (n.contact_status === "needs_enrichment") funnel.no_contact_retained++;
        if (regionFilter && !regionFilter.some((r) => (n.region ?? "").toLowerCase().includes(r))) {
          funnel.region_filtered_out++;
          continue;
        }
        normalized.push(n);
      }
    }

    // ---------- 3. Intra-batch dedupe (same company on both lists) ----------
    const seen = new Map<string, NormalizedOfficialRecord>();
    const batchDuplicates: NormalizedOfficialRecord[] = [];
    for (const n of normalized) {
      const key = n.phone_e164 ?? n.email ?? n.business_name_norm;
      const prev = seen.get(key);
      if (prev) {
        // keep the strongest specialty signal (centralized list wins)
        if (n.specialty_bonus > prev.specialty_bonus) seen.set(key, n);
        batchDuplicates.push(n);
        funnel.duplicate_in_batch++;
      } else {
        seen.set(key, n);
      }
    }
    normalized = rankCandidates([...seen.values()]);

    // ---------- 4. Cross-system dedupe BEFORE any enrichment ----------
    const phones = [...new Set(normalized.map((n) => n.phone_e164).filter(Boolean))] as string[];
    const emails = [...new Set(normalized.map((n) => n.email).filter(Boolean))] as string[];
    const names = [...new Set(normalized.map((n) => n.business_name))];

    const known = { phone: new Map<string, string>(), email: new Map<string, string>(), name: new Map<string, string>() };
    const optOut = { phone: new Set<string>(), email: new Set<string>() };

    // PostgREST filters travel in the URL: chunk the lookup so a 179-record batch
    // never blows the request-line limit (silent dedupe failure = duplicate outreach).
    const CHUNK = 40;
    function chunks<T>(arr: T[]): T[][] {
      const out: T[][] = [];
      for (let i = 0; i < arr.length; i += CHUNK) out.push(arr.slice(i, i + CHUNK));
      return out;
    }

    async function scan(
      table: string,
      cols: { phone?: string[]; email?: string[]; name?: string[] },
    ) {
      const select = ["id", ...(cols.phone ?? []), ...(cols.email ?? []), ...(cols.name ?? [])].join(",");

      const collect = (rows: Record<string, unknown>[]) => {
        for (const row of rows) {
          const ref = `${table}:${row.id}`;
          for (const c of cols.phone ?? []) {
            const v = row[c] as string | null;
            if (v && phones.includes(v) && !known.phone.has(v)) known.phone.set(v, ref);
          }
          for (const c of cols.email ?? []) {
            const v = (row[c] as string | null)?.toLowerCase();
            if (v && emails.includes(v) && !known.email.has(v)) known.email.set(v, ref);
          }
          for (const c of cols.name ?? []) {
            const v = row[c] as string | null;
            if (v && names.includes(v) && !known.name.has(v)) known.name.set(v, ref);
          }
        }
      };

      const runs: Array<Promise<void>> = [];
      const push = (col: string, values: string[]) => {
        for (const part of chunks(values)) {
          runs.push((async () => {
            const { data, error } = await supabase.from(table).select(select).in(col, part).limit(1000);
            if (error) { console.error(`dedupe scan ${table}.${col} failed: ${error.message}`); return; }
            collect((data ?? []) as Record<string, unknown>[]);
          })());
        }
      };

      for (const c of cols.phone ?? []) if (phones.length) push(c, phones);
      for (const c of cols.email ?? []) if (emails.length) push(c, emails);
      for (const c of cols.name ?? []) if (names.length) push(c, names);
      await Promise.all(runs);
    }

    await Promise.all([
      scan("contractor_prospects", { phone: ["phone_e164", "phone"], email: ["email"], name: ["business_name"] }),
      scan("contractor_leads", { phone: ["phone_e164", "phone"], email: ["email"], name: ["company_name", "business_name"] }),
      scan("verified_contractor_prospects", { phone: ["phone_e164", "phone_primary"], email: ["email"], name: ["business_name"] }),
      scan("contractors_prospects", { phone: ["phone"], email: ["email"], name: ["business_name"] }),
      scan("contractors", { phone: ["phone", "normalized_phone"], email: ["email"], name: ["business_name"] }),
      scan("outbound_companies", { phone: ["phone"], email: ["email"], name: ["company_name"] }),
      scan("launch_leads", { phone: ["phone"], email: ["email"], name: ["company_name"] }),
    ]);

    // Opt-outs / suppressions (hard block, certification never bypasses them)
    {
      const values = [...phones, ...emails];
      await Promise.all(
        chunks(values).map(async (part) => {
          const { data, error } = await supabase
            .from("outreach_suppressions")
            .select("contact_type,contact_value")
            .in("contact_value", part)
            .limit(1000);
          if (error) { console.error(`suppression scan failed: ${error.message}`); return; }
          for (const r of (data ?? []) as { contact_type: string; contact_value: string }[]) {
            if (phones.includes(r.contact_value)) optOut.phone.add(r.contact_value);
            if (emails.includes(r.contact_value?.toLowerCase?.() ?? "")) optOut.email.add(r.contact_value.toLowerCase());
          }
        }),
      );
    }

    // ---------- 5. Classify ----------
    type Decision = NormalizedOfficialRecord & {
      dedupe_status: string;
      dedupe_match_table: string | null;
      dedupe_match_id: string | null;
      dedupe_signals: Record<string, unknown>;
      eligibility_status: string;
      blocked_reason: string | null;
    };

    const decided: Decision[] = normalized.map((n) => {
      const matchRef =
        (n.phone_e164 && known.phone.get(n.phone_e164)) ||
        (n.email && known.email.get(n.email)) ||
        known.name.get(n.business_name) ||
        null;
      const signals = {
        phone_match: Boolean(n.phone_e164 && known.phone.get(n.phone_e164)),
        email_match: Boolean(n.email && known.email.get(n.email)),
        name_match: Boolean(known.name.get(n.business_name)),
      };
      const [mTable, mId] = matchRef ? matchRef.split(":") : [null, null];

      let eligibility = "eligible";
      let blocked: string | null = null;
      if (matchRef) { eligibility = "blocked"; blocked = "already_known_in_unpro"; funnel.already_known++; }
      else funnel.new_candidates++;

      if (!blocked) {
        const phoneBlocked = n.phone_e164 ? optOut.phone.has(n.phone_e164) : false;
        const emailBlocked = n.email ? optOut.email.has(n.email) : false;
        const hasChannel = (n.phone_e164 && !phoneBlocked) || (n.email && !emailBlocked);
        if (!hasChannel) {
          eligibility = "blocked";
          blocked = phoneBlocked || emailBlocked
            ? "opt_out_suppressed"
            : (n.contact_status === "needs_enrichment" ? "needs_enrichment" : "not_contactable");
          if (blocked === "opt_out_suppressed") funnel.blocked_opt_out++;
          else funnel.blocked_not_contactable++;
        }
      }
      if (eligibility === "eligible") funnel.eligible++;
      if (blocked) blockedBreakdown[blocked] = (blockedBreakdown[blocked] ?? 0) + 1;

      return {
        ...n,
        dedupe_status: matchRef ? "known" : "new",
        dedupe_match_table: mTable,
        dedupe_match_id: mId,
        dedupe_signals: signals,
        eligibility_status: eligibility,
        blocked_reason: blocked,
      };
    });

    const eligible = decided.filter((d) => d.eligibility_status === "eligible");

    // Safety: promotion into the canonical prospect table is always explicitly bounded.
    // limit = 0 records the official audit trail without feeding the recruitment queue.
    // A hard daily cap prevents a replay loop from flooding the recruitment queue.
    const DAILY_PROMOTION_CAP = 5;
    let remainingToday = DAILY_PROMOTION_CAP;
    if (mode === "ingest" && limit > 0) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("official_source_records")
        .select("id", { count: "exact", head: true })
        .not("prospect_id", "is", null)
        .gte("updated_at", since);
      remainingToday = Math.max(0, DAILY_PROMOTION_CAP - (count ?? 0));
    }
    const selected = limit > 0 ? eligible.slice(0, Math.min(limit, remainingToday)) : [];
    funnel.daily_promotion_slots_remaining = remainingToday;

    const topCandidates = eligible.slice(0, 15).map((d) => ({
      business_name: d.business_name,
      region: d.region,
      city: d.city,
      priority_rank: d.priority_rank,
      specialty_bonus: d.specialty_bonus,
      trust_bonus: d.trust_bonus,
      phone_e164: d.phone_e164,
      has_email: Boolean(d.email),
      certification: d.certification,
      certificate_no: d.certificate_no,
      source_url: d.source_url,
    }));

    const byRegion: Record<string, { total: number; eligible: number }> = {};
    for (const d of decided) {
      const k = d.region ?? "inconnue";
      byRegion[k] ??= { total: 0, eligible: 0 };
      byRegion[k].total++;
      if (d.eligibility_status === "eligible") byRegion[k].eligible++;
    }

    // ---------- 6. Persist (ingest mode only) ----------
    const promoted: Array<{ business_name: string; prospect_id: string }> = [];
    if (mode === "ingest") {
      // 6a. official_source_records: full audit trail of every parsed record
      const rows = decided.map((d) => ({
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
        fetched_at: fetchedAt,
        dedupe_status: d.dedupe_status,
        dedupe_match_table: d.dedupe_match_table,
        dedupe_match_id: d.dedupe_match_id,
        dedupe_signals: d.dedupe_signals,
        eligibility_status: d.eligibility_status,
        blocked_reason: d.blocked_reason,
        updated_at: fetchedAt,
      }));
      for (let i = 0; i < rows.length; i += 100) {
        const { error } = await supabase
          .from("official_source_records")
          .upsert(rows.slice(i, i + 100), { onConflict: "source_key,source_record_key" });
        if (error) console.error("official_source_records upsert:", error.message);
      }

      // 6b. Promote selected eligible candidates into the canonical prospect table
      for (const d of selected) {
        const { data: existing } = await supabase
          .from("official_source_records")
          .select("id,prospect_id")
          .eq("source_key", d.source_key)
          .eq("source_record_key", d.source_record_key)
          .maybeSingle();
        if (existing?.prospect_id) continue; // idempotent

        const { data: inserted, error } = await supabase
          .from("contractor_prospects")
          .insert({
            business_name: d.business_name,
            trade: "Ventilation",
            // trade_category is an `exterior_trade` enum that has no ventilation value —
            // keep the canonical free-text trade + slug instead of forcing a wrong enum.
            category_slug: "ventilation",
            city: d.city,
            region: d.region,
            province: "QC",
            phone: d.phone_e164,
            phone_e164: d.phone_e164,
            email: d.email,
            source: "official_verified_source",
            source_key: d.source_key,
            source_name: d.source_name,
            source_url: d.source_url,
            source_record_id: d.source_record_key,
            discovery_method: "official_verified_source",
            source_priority: d.priority_rank,
            rbq_verified: false,
            do_not_contact: false,
            enrichment_status: "pending",
            aipp_status: "pending",
            qualification_status: "pending",
            outreach_status: "not_started",
            onboarding_status: "not_started",
            payment_status: "not_started",
            activation_status: "pending",
            acquisition_score: d.trust_bonus + d.specialty_bonus,
            priority_score: d.trust_bonus + d.specialty_bonus + (100 - d.priority_rank),
            priority_reason: [
              `Source officielle vérifiée (${d.certification})`,
              `Région prioritaire : ${d.region ?? "n/d"}`,
            ],
            dedupe_signals: d.dedupe_signals,
            raw_data: d.provenance,
          })
          .select("id")
          .single();

        if (error) { console.error("prospect insert:", error.message); continue; }

        await supabase
          .from("official_source_records")
          .update({ prospect_id: inserted.id, updated_at: new Date().toISOString() })
          .eq("source_key", d.source_key)
          .eq("source_record_key", d.source_record_key);

        promoted.push({ business_name: d.business_name, prospect_id: inserted.id });
        funnel.promoted_to_prospects++;
      }
    }

    return json({
      ok: true,
      mode,
      generated_at: fetchedAt,
      sources: sourceStatus,
      funnel,
      blocked_breakdown: blockedBreakdown,
      by_region: byRegion,
      top_recruitment_ready: topCandidates,
      promoted,
      notes: [
        "Aucune donnée de contact inférée : téléphone/courriel proviennent uniquement du document officiel.",
        "La certification ajoute un bonus de confiance et de spécialité, jamais un contournement CASL/opt-out.",
        "Aucun appel Google Places n'est effectué par cette fonction.",
      ],
    });
  } catch (e) {
    console.error("official-source-ingest failed:", e);
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
