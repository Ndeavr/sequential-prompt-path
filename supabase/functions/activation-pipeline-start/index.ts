// Live activation pipeline orchestrator.
// Normalizes the input, runs Firecrawl-based extraction (via aipp-real-scan),
// computes a deterministic AIPP score, recommends a plan, and writes everything
// back to activation_pipeline_runs in real time. Failsafe: any single module
// failure flips partial_confidence=true but never stops the pipeline.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { recommendPlan as canonicalRecommendPlan, planRank } from "../_shared/planRecommendation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type SupabaseClient = ReturnType<typeof createClient>;

function normalizeDomain(input: string): { domain: string; url: string } {
  const v = input
    .trim()
    .replace(/\s+/g, "")
    .replace(/^(https?)?:?\/?\/*/i, "")
    .replace(/\/+$/, "")
    .toLowerCase();
  const domain = v.replace(/^www\./, "").split("/")[0];
  return { domain, url: `https://${domain}` };
}

async function patch(
  supabase: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
) {
  await supabase.from("activation_pipeline_runs").update(patch).eq("id", id);
}

async function appendError(
  supabase: SupabaseClient,
  id: string,
  step: string,
  err: unknown,
) {
  const message = err instanceof Error ? err.message : String(err);
  const { data } = await supabase
    .from("activation_pipeline_runs")
    .select("error_log")
    .eq("id", id)
    .maybeSingle();
  const log = Array.isArray(data?.error_log) ? data!.error_log : [];
  log.push({ step, message, at: new Date().toISOString() });
  await patch(supabase, id, { error_log: log, partial_confidence: true });
}

function score5(signals: Record<string, unknown>): {
  total: number;
  buckets: Record<string, number>;
} {
  // Deterministic 5-bucket scoring mapped to the real keys produced by aipp-real-scan.
  const s = signals ?? {};
  const len = (k: string) => Array.isArray(s[k]) ? (s[k] as unknown[]).length : 0;
  const str = (k: string) => typeof s[k] === "string" ? (s[k] as string).trim() : "";
  const num = (k: string) => Number(s[k] ?? 0);
  const has = (k: string) => Boolean(s[k]);

  // WEB (20) — site fundamentals
  const web = Math.min(
    20,
    (has("has_ssl") ? 4 : 0) +
      (str("title").length > 0 ? 4 : 0) +
      (str("description").length > 30 ? 4 : 0) +
      (has("has_logo") ? 4 : 0) +
      (num("links_count") > 5 ? 4 : 0),
  );

  // GOOGLE (20) — local presence / NAP
  const google = Math.min(
    20,
    (len("phones_found") > 0 ? 6 : 0) +
      (len("emails_found") > 0 ? 4 : 0) +
      (has("address") || str("address").length > 0 ? 5 : 0) +
      (has("city") || has("hours") || has("google_place_id") ? 5 : 0),
  );

  // TRUST (20) — RBQ / NEQ / reviews / years
  const trust = Math.min(
    20,
    (has("rbq_number") || has("rbq") ? 6 : 0) +
      (has("neq") ? 4 : 0) +
      (has("has_reviews") || num("review_count") > 0 ? 6 : 0) +
      (has("years_in_business") || has("year_founded") ? 4 : 0),
  );

  // AI visibility (25) — structured data / depth
  const social = s["social_links"];
  const socialCount = social && typeof social === "object"
    ? Object.values(social as Record<string, unknown>).filter(Boolean).length
    : 0;
  const ai = Math.min(
    25,
    (has("has_jsonld") ? 8 : 0) +
      (has("has_faq") ? 5 : 0) +
      (len("services") >= 3 || num("services_count") >= 3 ? 6 : 0) +
      (has("has_about") ? 3 : 0) +
      (socialCount >= 2 ? 3 : 0),
  );

  // CONVERSION (15) — CTA / phone CTA / mobile
  const conv = Math.min(
    15,
    (has("has_cta") || has("has_contact_form") ? 5 : 0) +
      (has("has_phone_cta") || len("phones_found") > 0 ? 5 : 0) +
      (has("mobile_friendly") || has("is_responsive") ? 5 : 0),
  );

  return {
    total: web + google + trust + ai + conv,
    buckets: { web, google, trust, ai_visibility: ai, conversion: conv },
  };
}

function recommendPlan(score: number, signals: Record<string, unknown>): {
  plan: string;
  reason: string;
} {
  const rec = canonicalRecommendPlan({
    visibilityScore: score,
    reviewCount: Number(signals?.review_count ?? 0),
    googleRating: Number(signals?.rating ?? 0),
    city: (signals?.city as string) ?? null,
    category: (signals?.category as string) ?? null,
  });
  return { plan: rec.plan, reason: rec.rationale };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  let runId: string | null = null;

  try {
    const body = await req.json().catch(() => ({}));
    const inputValue: string = String(body.input_value ?? body.domain ?? "")
      .trim();
    if (!inputValue) {
      return new Response(
        JSON.stringify({ error: "input_value required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const isDomainLike = /\.[a-z]{2,}/i.test(inputValue);
    const inputKind: string = body.input_kind ??
      (isDomainLike ? "website" : "business_name");

    let domain: string | null = null;
    let url: string | null = null;
    if (inputKind === "website" || isDomainLike) {
      const norm = normalizeDomain(inputValue);
      domain = norm.domain;
      url = norm.url;
    }

    // Create or reuse run
    if (body.run_id) {
      runId = body.run_id;
      await patch(supabase, runId!, {
        pipeline_status: "running",
        current_step: "extraction",
      });
    } else {
      const { data, error } = await supabase
        .from("activation_pipeline_runs")
        .insert({
          domain,
          input_value: inputValue,
          input_kind: inputKind,
          pipeline_status: "running",
          current_step: "extraction",
        })
        .select("id")
        .single();
      if (error) throw error;
      runId = data.id;
    }

    // Kick off async pipeline; return run id immediately so client can subscribe.
    const runPipeline = async () => {
      // Phase 2: Extraction
      let signals: Record<string, unknown> = {};
      let screenshot: string | null = null;
      let extraction: Record<string, unknown> = {};

      if (url) {
        try {
          const { data: scan, error: scanErr } = await supabase.functions
            .invoke("aipp-real-scan", { body: { website_url: url } });
          if (scanErr) throw scanErr;
          if (scan?.success) {
            signals = scan.signals ?? {};
            screenshot = scan.screenshot ?? null;
            extraction = {
              metadata: scan.metadata ?? {},
              normalized_url: scan.normalized_url,
              links_count: scan.links_count ?? 0,
              branding: scan.branding ?? null,
            };
            await patch(supabase, runId!, {
              extraction,
              signals,
              screenshot_url: screenshot,
              current_step: "scoring",
            });
          } else {
            await appendError(
              supabase,
              runId!,
              "extraction",
              scan?.error ?? "scan failed",
            );
          }
        } catch (err) {
          await appendError(supabase, runId!, "extraction", err);
        }
      }

      // Phase 3: AIPP scoring (deterministic, runs even on partial signals)
      try {
        const { total, buckets } = score5(signals);
        await patch(supabase, runId!, {
          aipp_score: total,
          aipp_breakdown: buckets,
          current_step: "recommendation",
        });

        // Phase 4: Plan recommendation
        const { plan, reason } = recommendPlan(total, signals);
        const projectedAppointments = planRank(plan as any) >= 6
          ? 50
          : planRank(plan as any) >= 5
          ? 25
          : planRank(plan as any) >= 4
          ? 15
          : 10;
        await patch(supabase, runId!, {
          recommended_plan: plan,
          recommendation: {
            plan,
            reason,
            projected_appointments: projectedAppointments,
            estimated_close_rate: 0.4,
          },
          current_step: "ready",
          pipeline_status: "ready",
        });
      } catch (err) {
        await appendError(supabase, runId!, "scoring", err);
        await patch(supabase, runId!, {
          pipeline_status: "ready",
          current_step: "ready",
        });
      }
    };

    // Fire and forget; edge runtime keeps it alive.
    EdgeRuntime.waitUntil
      ? EdgeRuntime.waitUntil(runPipeline())
      : runPipeline();

    return new Response(
      JSON.stringify({ run_id: runId, domain, url }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (runId) {
      await appendError(supabase, runId, "bootstrap", err);
      await patch(supabase, runId, {
        pipeline_status: "failed",
      });
    }
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

// EdgeRuntime is provided by Supabase Deno runtime
declare const EdgeRuntime: { waitUntil?: (p: Promise<unknown>) => void };
