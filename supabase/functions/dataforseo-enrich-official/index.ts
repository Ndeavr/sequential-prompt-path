/**
 * dataforseo-enrich-official — TARGETED enrichment of ALREADY-KNOWN official records.
 *
 * Never discovery. Never Google Places. Never outreach.
 *
 * Safety chain, in order, before any network call:
 *   1. admin auth
 *   2. credentials present (server secrets only)
 *   3. circuit kill_switch === false
 *   4. cache / terminal state check (30d matched, 90d no_match|ambiguous)
 *   5. ATOMIC budget reservation (max $5/day, 100 calls/day, 500 items/day)
 * Actual cost is reconciled after the response. Concurrency-safe via RPC.
 *
 * Body: { mode?: "dry_run" | "live", limit?: number, record_ids?: string[] }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  DATAFORSEO_ENDPOINT,
  buildAuthHeader,
  buildRequestBody,
  parseResponse,
  selectMatch,
  nextEligibleAt,
  redactError,
  MAX_TRANSIENT_RETRIES,
  type MatchTarget,
} from "../_shared/dataForSeo.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROVIDER = "dataforseo";
const EST_COST_PER_CALL = 0.02;
const EST_ITEMS_PER_CALL = 10;
const MAX_BATCH = 25;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // ---------- admin auth ----------
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await admin.auth.getUser(token);
    const userId = userData?.user?.id;
    if (!userId) return json({ ok: false, error: "unauthorized" }, 401);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return json({ ok: false, error: "forbidden" }, 403);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const mode: "dry_run" | "live" = body.mode === "live" ? "live" : "dry_run";
    const limit = Math.min(Number(body.limit) > 0 ? Number(body.limit) : 5, MAX_BATCH);

    // ---------- credentials (server-only, never echoed) ----------
    const authValue = buildAuthHeader(
      Deno.env.get("DATAFORSEO_LOGIN"),
      Deno.env.get("DATAFORSEO_PASSWORD"),
    );
    const credentialsConfigured = authValue !== null;

    // ---------- circuit ----------
    const { data: circuit } = await admin
      .from("external_enrichment_circuit")
      .select("kill_switch, notes")
      .eq("provider", PROVIDER)
      .maybeSingle();
    const killSwitch = circuit?.kill_switch !== false;

    // ---------- candidates ----------
    const nowIso = new Date().toISOString();
    let q = admin
      .from("official_source_records")
      .select("id, business_name, business_name_norm, neq, rbq_license, city, municipality, region, postal_code, official_domain, contact_status, enrichment_status")
      .eq("contact_status", "needs_enrichment")
      .order("priority_rank", { ascending: true })
      .order("trust_score", { ascending: false })
      .limit(limit);
    if (Array.isArray(body.record_ids) && body.record_ids.length) {
      q = admin
        .from("official_source_records")
        .select("id, business_name, business_name_norm, neq, rbq_license, city, municipality, region, postal_code, official_domain, contact_status, enrichment_status")
        .in("id", body.record_ids.slice(0, MAX_BATCH));
    }
    const { data: records, error: recErr } = await q;
    if (recErr) return json({ ok: false, error: "candidates_query_failed", message: recErr.message }, 500);

    const candidates = records ?? [];

    // ---------- cache / terminal filter ----------
    const ids = candidates.map((c) => c.id);
    const { data: attempts } = ids.length
      ? await admin
          .from("dataforseo_enrichment_attempts")
          .select("official_source_record_id, status, next_eligible_at, attempt_count")
          .eq("provider", PROVIDER)
          .in("official_source_record_id", ids)
      : { data: [] as Array<Record<string, unknown>> };

    const attemptBy = new Map<string, { status: string; next_eligible_at: string | null; attempt_count: number }>();
    for (const a of (attempts ?? []) as Array<{ official_source_record_id: string; status: string; next_eligible_at: string | null; attempt_count: number }>) {
      attemptBy.set(a.official_source_record_id, a);
    }

    const eligible = candidates.filter((c) => {
      const a = attemptBy.get(c.id);
      if (!a) return true;
      if (a.status === "failed_terminal") return false;
      if (a.next_eligible_at && a.next_eligible_at > nowIso) return false;
      return true;
    });

    const plan = eligible.map((c) => ({
      id: c.id,
      title: c.business_name,
      locality: c.municipality ?? c.city,
      region: c.region,
    }));

    const summary = {
      provider: PROVIDER,
      mode,
      credentials_configured: credentialsConfigured,
      kill_switch: killSwitch,
      candidates_found: candidates.length,
      cache_or_terminal_skipped: candidates.length - eligible.length,
      planned_calls: plan.length,
      caps: { max_usd_per_day: 5, max_calls_per_day: 100, max_items_per_day: 500 },
    };

    if (mode !== "live") {
      return json({ ok: true, ...summary, executed: 0, plan, note: "Dry-run : aucun appel payant effectué." });
    }
    if (!credentialsConfigured) {
      return json({ ok: false, ...summary, error: "credentials_missing", message: "DATAFORSEO_LOGIN et DATAFORSEO_PASSWORD requis." }, 412);
    }
    if (killSwitch) {
      return json({ ok: false, ...summary, error: "kill_switch_active", message: "DataForSEO est désactivé. Activation admin explicite requise." }, 423);
    }

    // ---------- live execution ----------
    const results: Array<Record<string, unknown>> = [];
    let executed = 0;
    let spend = 0;

    for (const c of eligible) {
      // 5. ATOMIC reservation BEFORE the network call.
      const { data: reservation, error: resErr } = await admin.rpc("reserve_external_enrichment_call", {
        p_provider: PROVIDER,
        p_items: EST_ITEMS_PER_CALL,
        p_est_cost_usd: EST_COST_PER_CALL,
      });
      const reserved = (reservation as { allowed?: boolean } | null)?.allowed === true;
      if (resErr || !reserved) {
        results.push({ id: c.id, status: "skipped", reason: (reservation as { reason?: string } | null)?.reason ?? "budget_exhausted" });
        break;
      }

      const target: MatchTarget = {
        business_name_norm: c.business_name_norm ?? "",
        city: c.municipality ?? c.city,
        postal_code: c.postal_code,
        official_domain: c.official_domain,
      };

      let parsed = null as ReturnType<typeof parseResponse> | null;
      let attemptNo = 0;
      let lastError = "unknown";
      while (attemptNo <= MAX_TRANSIENT_RETRIES) {
        attemptNo++;
        try {
          const r = await fetch(DATAFORSEO_ENDPOINT, {
            method: "POST",
            headers: { "Authorization": authValue, "Content-Type": "application/json" },
            body: JSON.stringify(buildRequestBody({ title: c.business_name, locality: target.city, region: c.region, limit: 10 })),
          });
          if (r.status === 401 || r.status === 402 || r.status === 400) {
            lastError = `http_${r.status}`;
            break; // never retry auth / balance / validation
          }
          if (r.status >= 500) { lastError = `http_${r.status}`; continue; }
          parsed = parseResponse(await r.json().catch(() => null));
          if (parsed.ok || !parsed.retryable) break;
          lastError = parsed.error_code;
        } catch (e) {
          lastError = redactError(e instanceof Error ? e.message : String(e));
        }
      }

      executed++;

      if (!parsed || !parsed.ok) {
        const terminal = !parsed || !parsed.retryable;
        const cost = parsed?.cost ?? 0;
        spend += cost;
        await admin.rpc("reconcile_external_enrichment_cost", {
          p_provider: PROVIDER, p_actual_cost_usd: cost, p_est_cost_usd: EST_COST_PER_CALL,
          p_actual_items: 0, p_est_items: EST_ITEMS_PER_CALL,
        });
        await admin.from("dataforseo_enrichment_attempts").upsert({
          official_source_record_id: c.id,
          provider: PROVIDER,
          status: terminal ? "failed_terminal" : "failed_retryable",
          attempt_count: (attemptBy.get(c.id)?.attempt_count ?? 0) + 1,
          query_title: c.business_name,
          query_locality: target.city,
          error_code: redactError(parsed?.error_code ?? lastError),
          cost_usd: cost,
          items_returned: 0,
          next_eligible_at: terminal ? null : nextEligibleAt("no_match"),
          updated_at: new Date().toISOString(),
        }, { onConflict: "official_source_record_id,provider" });
        results.push({ id: c.id, status: terminal ? "failed_terminal" : "failed_retryable" });
        continue;
      }

      spend += parsed.cost;
      await admin.rpc("reconcile_external_enrichment_cost", {
        p_provider: PROVIDER, p_actual_cost_usd: parsed.cost, p_est_cost_usd: EST_COST_PER_CALL,
        p_actual_items: parsed.items_count, p_est_items: EST_ITEMS_PER_CALL,
      });

      const outcome = selectMatch(target, parsed.items);
      const item = outcome.item;

      await admin.from("dataforseo_enrichment_attempts").upsert({
        official_source_record_id: c.id,
        provider: PROVIDER,
        status: outcome.status,
        attempt_count: (attemptBy.get(c.id)?.attempt_count ?? 0) + 1,
        query_title: c.business_name,
        query_locality: target.city,
        match_score: outcome.score,
        matched_title: item?.title ?? null,
        matched_phone: item?.phone ?? null,
        matched_website: item?.url ?? null,
        matched_address: item?.address ?? null,
        conflict_reason: outcome.conflict_reason,
        items_returned: parsed.items_count,
        cost_usd: parsed.cost,
        response_summary: { items_count: parsed.items_count, top_score: outcome.score },
        next_eligible_at: nextEligibleAt(outcome.status),
        updated_at: new Date().toISOString(),
      }, { onConflict: "official_source_record_id,provider" });

      if (outcome.status === "matched" && item) {
        // Aggregator-sourced contact: NOT source_confirmed. Website confirmation pending.
        await admin.from("official_source_records").update({
          enrichment_status: item.url ? "pending_website_confirmation" : "aggregator_only",
          website_url: item.url ?? undefined,
          provenance: {
            dataforseo: {
              matched_at: new Date().toISOString(),
              match_score: outcome.score,
              phone: item.phone,
              website: item.url,
              trust: "aggregator_sourced",
              confirmed_by_official_site: false,
            },
          },
          updated_at: new Date().toISOString(),
        }).eq("id", c.id);
      } else {
        await admin.from("official_source_records")
          .update({ enrichment_status: outcome.status, updated_at: new Date().toISOString() })
          .eq("id", c.id);
      }

      results.push({ id: c.id, status: outcome.status, score: outcome.score });
    }

    return json({
      ok: true,
      ...summary,
      executed,
      cost_usd_this_run: Number(spend.toFixed(4)),
      results,
      notes: [
        "Aucune donnée d'avis/photo DataForSEO n'alimente de génération IA.",
        "Le contact agrégateur reste non confirmé tant que le site officiel ne le valide pas.",
        "La découverte n'est pas un consentement : CASL/opt-out/suppression restent souverains.",
      ],
    });
  } catch (e) {
    console.error("dataforseo-enrich-official failed");
    return json({ ok: false, error: redactError(e instanceof Error ? e.message : String(e)) }, 500);
  }
});
