// Recomputes acquisition intelligence signals for contractor prospects:
// aggregator detection, phone classification, website quality, priority score,
// outreach channel, eligibility. Idempotent, paginated, safe to re-run.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { isAggregatorEmail, extractEmailDomain } from "../_shared/aggregator.ts";
import { classifyPhone, selectOutreachChannel } from "../_shared/phone.ts";
import { classifyWebsite, scoreProspect } from "../_shared/prospectScoring.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Body {
  batch_size?: number;
  cursor?: string | null;
  only_missing?: boolean; // only rows never scored or stale > 7d
  ids?: string[];         // recompute specific rows
  dry_run?: boolean;
}

interface Counters {
  scanned: number;
  updated: number;
  suppressed_aggregator: number;
  suppressed_unreachable: number;
  promoted_a: number;
  errors: number;
}

function isValidEmailShape(email: string | null): boolean {
  return !!email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body: Body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const batch = Math.min(Math.max(body.batch_size ?? 200, 1), 500);
    const supa = createClient(SUPABASE_URL, SERVICE_KEY);

    let query = supa
      .from("contractor_prospects")
      .select("id, email, phone, website_url, review_count, review_rating, service_area_count, do_not_contact, raw_data, priority_recomputed_at")
      .order("id", { ascending: true })
      .limit(batch);

    if (body.ids?.length) {
      query = query.in("id", body.ids);
    } else {
      if (body.cursor) query = query.gt("id", body.cursor);
      if (body.only_missing) {
        const cutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
        query = query.or(`priority_recomputed_at.is.null,priority_recomputed_at.lt.${cutoff}`);
      }
    }

    const { data: rows, error } = await query;
    if (error) throw error;

    const counters: Counters = {
      scanned: rows?.length ?? 0,
      updated: 0,
      suppressed_aggregator: 0,
      suppressed_unreachable: 0,
      promoted_a: 0,
      errors: 0,
    };

    let nextCursor: string | null = null;

    for (const row of rows ?? []) {
      nextCursor = row.id as string;
      try {
        // Aggregator + email quality
        const aggregator = await isAggregatorEmail(row.email);
        const validShape = isValidEmailShape(row.email);
        const emailQuality: string = aggregator
          ? "aggregator"
          : !row.email ? "missing"
          : !validShape ? "invalid"
          : "valid";

        // Phone
        const phone = await classifyPhone(row.phone);

        // Website (short-circuit if scoring said "agency" recently to save fetches — MVP: always classify)
        const web = await classifyWebsite(row.website_url);

        // GBP completeness from raw_data if present
        const gbp = row.raw_data?.gbp_completeness as ("complete" | "partial" | "poor" | undefined) ?? "poor";

        const scored = scoreProspect({
          review_count: row.review_count,
          review_rating: row.review_rating,
          has_website: web.has_website,
          website_quality: web.quality,
          has_mobile: phone.has_mobile,
          aggregator_email: aggregator,
          valid_email: validShape && !aggregator,
          gbp_completeness: gbp,
          service_area_count: row.service_area_count,
        });

        const channel = selectOutreachChannel({
          has_mobile: phone.has_mobile,
          hasValidNonAggregatorEmail: validShape && !aggregator,
        });

        let outreachEligible = !row.do_not_contact && channel !== "none";
        let suppression: string | null = null;
        if (row.do_not_contact) suppression = "do_not_contact";
        else if (aggregator && !phone.has_mobile) { suppression = "aggregator_email"; outreachEligible = false; }
        else if (channel === "none") { suppression = "unreachable"; outreachEligible = false; }

        if (aggregator) counters.suppressed_aggregator++;
        if (channel === "none") counters.suppressed_unreachable++;

        const finalScore = aggregator && !phone.has_mobile ? 0 : scored.score;
        if (outreachEligible && finalScore >= 90) counters.promoted_a++;

        if (!body.dry_run) {
          const { error: upErr } = await supa
            .from("contractor_prospects")
            .update({
              acquisition_priority_score: finalScore,
              phone_type: phone.phone_type,
              has_mobile: phone.has_mobile,
              has_landline: phone.has_landline,
              email_quality: emailQuality,
              aggregator_email: aggregator,
              has_website: web.has_website,
              website_quality_score: scored.website_quality_score,
              outreach_channel: channel,
              outreach_eligible: outreachEligible,
              suppression_reason: suppression,
              priority_recomputed_at: new Date().toISOString(),
              raw_data: { ...(row.raw_data ?? {}), scoring: scored.breakdown, website_quality: web.quality },
            })
            .eq("id", row.id);
          if (upErr) throw upErr;
        }
        counters.updated++;
      } catch (e) {
        counters.errors++;
        console.error("prospect recompute failed", row.id, e);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, counters, next_cursor: (rows?.length ?? 0) === batch ? nextCursor : null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
