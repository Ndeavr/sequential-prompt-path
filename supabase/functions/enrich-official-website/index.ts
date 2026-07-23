/**
 * enrich-official-website
 *
 * Structured crawl of a contractor's OFFICIAL website (never a directory
 * or social profile), with field-level provenance. Writes append-only
 * evidence to `official_site_enrichment_evidence` and a single row to
 * `official_site_crawl_runs`.
 *
 * Contractor identity data (phone/email) on the parent row is updated
 * ONLY when the incoming trust state is >= the current trust state
 * (see `shouldOverride`). Missing_contact_after_crawl becomes true only
 * after a COMPLETE crawl found nothing.
 *
 * Discovery ≠ consent. This function does not, and must never, mark a
 * lead as commercially reachable. The commercial-send-gate still runs.
 *
 * Input (POST JSON):
 *   { lead_id?, prospect_id?, website_url?, dry_run?, max_pages? }
 * At least one of lead_id, prospect_id or website_url is required.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  crawlOfficialSite,
  resolveOfficialDomain,
  shouldOverride,
  type TrustState,
} from "../_shared/officialSiteCrawler.ts";

const FN = "enrich-official-website";

function jr(body: Record<string, unknown>, status = 200, rid = crypto.randomUUID()) {
  return new Response(JSON.stringify({ function: FN, request_id: rid, ...body }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "x-request-id": rid },
  });
}

async function sha256(s: string): Promise<string> {
  const b = new TextEncoder().encode(s);
  const h = await crypto.subtle.digest("SHA-256", b);
  return Array.from(new Uint8Array(h)).map(x => x.toString(16).padStart(2, "0")).join("");
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
    const { lead_id, prospect_id, website_url, dry_run = false, max_pages } = body ?? {};
    if (!lead_id && !prospect_id && !website_url) {
      return jr({ ok: false, code: "missing_target", message: "lead_id, prospect_id or website_url required" }, 400, rid);
    }

    // 1. Load target + candidate domain
    let candidateDomain: string | null = website_url ?? null;
    let lead: any = null;
    let prospect: any = null;

    if (lead_id) {
      const { data, error } = await supabase.from("contractor_leads").select("*").eq("id", lead_id).maybeSingle();
      if (error) throw new Error(`lead_lookup_failed: ${error.message}`);
      if (!data) return jr({ ok: false, code: "lead_not_found" }, 404, rid);
      lead = data;
      candidateDomain ??= data.official_domain ?? data.website_url ?? null;
    }
    if (prospect_id) {
      const { data, error } = await supabase.from("verified_contractor_prospects").select("*").eq("id", prospect_id).maybeSingle();
      if (error) throw new Error(`prospect_lookup_failed: ${error.message}`);
      if (!data) return jr({ ok: false, code: "prospect_not_found" }, 404, rid);
      prospect = data;
      candidateDomain ??= data.website_url ?? null;
    }

    if (!candidateDomain) {
      let runId: string | null = null;
      if (!dry_run) {
        const { data: run } = await supabase.from("official_site_crawl_runs").insert({
          contractor_lead_id: lead_id ?? null,
          prospect_id: prospect_id ?? null,
          canonical_domain: "",
          status: "no_official_domain",
          reason: "no_website_on_record",
          finished_at: new Date().toISOString(),
        }).select("id").maybeSingle();
        runId = run?.id ?? null;
        if (lead_id) {
          await supabase.from("contractor_leads").update({
            official_site_status: "no_official_domain",
            official_site_checked_at: new Date().toISOString(),
          }).eq("id", lead_id);
        }
      }
      return jr({ ok: true, run_id: runId, status: "no_official_domain", dry_run: !!dry_run }, 200, rid);
    }

    const resolved = resolveOfficialDomain(candidateDomain);
    if (!resolved.canonical) {
      const status = resolved.is_blocked ? "blocked" : "no_official_domain";
      let runId: string | null = null;
      if (!dry_run) {
        const { data: run } = await supabase.from("official_site_crawl_runs").insert({
          contractor_lead_id: lead_id ?? null,
          prospect_id: prospect_id ?? null,
          canonical_domain: resolved.host ?? candidateDomain,
          status,
          reason: resolved.reason ?? "unresolvable",
          finished_at: new Date().toISOString(),
        }).select("id").maybeSingle();
        runId = run?.id ?? null;
        if (lead_id) {
          await supabase.from("contractor_leads").update({
            official_site_status: status,
            official_site_checked_at: new Date().toISOString(),
          }).eq("id", lead_id);
        }
      }
      return jr({ ok: true, run_id: runId, status, canonical_domain: resolved.host, dry_run: !!dry_run }, 200, rid);
    }

    // 2. Crawl
    const runStart = new Date().toISOString();
    if (!dry_run && lead_id) {
      await supabase.from("contractor_leads").update({
        official_site_status: "crawling",
        official_domain: resolved.canonical,
      }).eq("id", lead_id);
    }

    const summary = await crawlOfficialSite(resolved.canonical, { maxPages: max_pages });
    const finishedAt = new Date().toISOString();

    // 3. Classify status
    const hasContact = summary.fields.some(f => f.kind === "phone" || f.kind === "email");
    let status: string;
    if (summary.ok_pages.length === 0 && summary.had_transient_failure) status = "retryable";
    else if (summary.ok_pages.length === 0) status = "failed";
    else if (!summary.complete && summary.had_transient_failure) status = "retryable";
    else if (hasContact) status = "complete_with_contact";
    else status = "complete_no_contact";

    // 4. Insert crawl run
    const pageFailures = summary.pages_attempted
      .filter(p => !p.ok)
      .map(p => ({ url: p.url, status: p.status, reason: p.reason }));

    let run: { id: string } | null = null;
    if (!dry_run) {
      const { data: runData, error: runErr } = await supabase.from("official_site_crawl_runs").insert({
        contractor_lead_id: lead_id ?? null,
        prospect_id: prospect_id ?? null,
        canonical_domain: resolved.canonical,
        status,
        pages_attempted: summary.pages_attempted.length,
        pages_ok: summary.ok_pages.length,
        had_transient_failure: summary.had_transient_failure,
        page_failures: pageFailures,
        summary: { field_count: summary.fields.length, methods: [...new Set(summary.fields.map(f => f.method))] },
        started_at: runStart,
        finished_at: finishedAt,
      }).select("id").maybeSingle();
      if (runErr) throw new Error(`run_insert_failed: ${runErr.message}`);
      run = runData ?? null;
    }

    // 5. Insert evidence rows (dedup by (kind, normalized_value, method))
    const evidenceRows: any[] = [];
    const seen = new Set<string>();
    for (const f of summary.fields) {
      const key = `${f.kind}|${f.normalized ?? f.raw}|${f.method}|${f.source_url}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const snippet = f.snippet ?? f.raw.slice(0, 200);
      evidenceRows.push({
        contractor_lead_id: lead_id ?? null,
        prospect_id: prospect_id ?? null,
        canonical_domain: resolved.canonical,
        source_url: f.source_url,
        field_kind: f.kind,
        raw_value: f.raw.slice(0, 500),
        normalized_value: f.normalized,
        extraction_method: f.method,
        trust_state: f.kind === "rbq" ? "pending_verification" : "source_confirmed",
        snippet,
        content_hash: await sha256(`${f.kind}|${f.normalized ?? f.raw}|${f.source_url}`),
      });
    }
    if (!dry_run && evidenceRows.length > 0) {
      const { error: evErr } = await supabase.from("official_site_enrichment_evidence").insert(evidenceRows);
      if (evErr) console.error(`[${rid}] evidence insert failed`, evErr);
    }

    // 6. Update lead — trust-precedence guarded
    if (!dry_run && lead_id && lead) {
      const upd: Record<string, unknown> = {
        official_site_status: status,
        official_site_checked_at: finishedAt,
        official_domain: resolved.canonical,
      };
      const phones = summary.fields.filter(f => f.kind === "phone" && f.normalized);
      const emails = summary.fields.filter(f => f.kind === "email" && f.normalized);
      const incomingTrust: TrustState = "source_confirmed";

      if (phones.length > 0 && shouldOverride(lead.phone_trust_state as TrustState | null, incomingTrust)) {
        upd.phone = phones[0].normalized;
        upd.phone_e164 = phones[0].normalized;
        upd.phone_source_url = phones[0].source_url;
        upd.phone_trust_state = "source_confirmed";
      }
      if (emails.length > 0 && shouldOverride(lead.email_trust_state as TrustState | null, incomingTrust)) {
        upd.email = emails[0].normalized;
        upd.email_source_url = emails[0].source_url;
        upd.email_trust_state = "source_confirmed";
      }
      // Only mark missing_contact_after_crawl once we've COMPLETED a crawl and truly found nothing.
      if (status === "complete_no_contact") {
        upd.missing_contact_after_crawl = true;
      } else if (status === "complete_with_contact") {
        upd.missing_contact_after_crawl = false;
      }

      const { error: updErr } = await supabase.from("contractor_leads").update(upd).eq("id", lead_id);
      if (updErr) console.error(`[${rid}] lead update failed`, updErr);
    }

    return jr({
      ok: true,
      run_id: run?.id,
      status,
      canonical_domain: resolved.canonical,
      pages_attempted: summary.pages_attempted.length,
      pages_ok: summary.ok_pages.length,
      field_count: summary.fields.length,
      extracted: {
        phones: [...new Set(summary.fields.filter(f => f.kind === "phone").map(f => f.normalized))],
        emails: [...new Set(summary.fields.filter(f => f.kind === "email").map(f => f.normalized))],
        rbq: [...new Set(summary.fields.filter(f => f.kind === "rbq").map(f => f.normalized))],
        postal: [...new Set(summary.fields.filter(f => f.kind === "postal_code").map(f => f.normalized))],
        org_name: [...new Set(summary.fields.filter(f => f.kind === "org_name").map(f => f.normalized))],
        addresses: [...new Set(summary.fields.filter(f => f.kind === "address").map(f => f.normalized))],
      },
      dry_run: !!dry_run,
    }, 200, rid);
  } catch (e) {
    console.error(`[${rid}] ${FN} failed`, e);
    return jr({ ok: false, code: "function_error", message: (e as Error).message }, 500, rid);
  }
});
