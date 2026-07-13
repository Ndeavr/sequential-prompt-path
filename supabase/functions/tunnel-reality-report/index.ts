// UNPRO — Tunnel Reality Report
// STRICT attribution: only counts SMS-attributed events across the funnel.
// Returns the 12 funnel stages with real counts (24h/7d/30d), the top blocker,
// AND a separate breakdown of unattributed checkouts (out-of-funnel).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Win = "24h" | "7d" | "30d";
const WINDOW_HOURS: Record<Win, number> = { "24h": 24, "7d": 168, "30d": 720 };

// Which plan codes are considered part of the SMS 1$ activation tunnel.
const SMS_PLAN_CODES = ["activation_1", "sms_outreach", "sms_1", "activation"];

interface StageResult {
  key: string;
  label: string;
  order: number;
  totals: Record<Win, number>;
  last_event_at: string | null;
  top_error: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Support optional { dry_run } context so the caller (page) can label the banner.
    let dryRunHint = true;
    try {
      if (req.method === "POST") {
        const body = await req.json().catch(() => ({}));
        if (typeof body?.dry_run === "boolean") dryRunHint = body.dry_run;
      }
    } catch { /* ignore */ }

    const now = new Date();
    const cutoff = (w: Win) =>
      new Date(now.getTime() - WINDOW_HOURS[w] * 3600_000).toISOString();

    async function countAcross(
      buildQuery: (from: string) => Promise<{ count: number | null }>,
    ): Promise<Record<Win, number>> {
      const [a, b, c] = await Promise.all([
        buildQuery(cutoff("24h")),
        buildQuery(cutoff("7d")),
        buildQuery(cutoff("30d")),
      ]);
      return { "24h": a.count ?? 0, "7d": b.count ?? 0, "30d": c.count ?? 0 };
    }

    async function lastTs(
      table: string,
      col: string,
      filter?: (q: any) => any,
    ): Promise<string | null> {
      let q: any = supabase.from(table).select(col).order(col, { ascending: false }).limit(1);
      if (filter) q = filter(q);
      const { data } = await q;
      return data?.[0]?.[col] ?? null;
    }

    // ------------------------------------------------------------------
    // 1) SMS (REAL only — is_simulation = false)
    // ------------------------------------------------------------------
    const smsSent = await countAcross((from) =>
      (supabase.from("acq_sms_logs").select("id", { count: "exact", head: true }) as any)
        .gte("created_at", from)
        .eq("is_simulation", false)
        .in("status", ["sent", "delivered", "failed", "queued"])
    );
    const smsDelivered = await countAcross((from) =>
      (supabase.from("acq_sms_logs").select("id", { count: "exact", head: true }) as any)
        .gte("created_at", from)
        .eq("is_simulation", false)
        .eq("status", "delivered")
    );
    const smsFailed = await countAcross((from) =>
      (supabase.from("acq_sms_logs").select("id", { count: "exact", head: true }) as any)
        .gte("created_at", from)
        .eq("is_simulation", false)
        .eq("status", "failed")
    );
    const smsSimulated = await countAcross((from) =>
      (supabase.from("acq_sms_logs").select("id", { count: "exact", head: true }) as any)
        .gte("created_at", from)
        .eq("is_simulation", true)
    );

    // Top real failure reason (7d)
    const { data: failRows } = await supabase
      .from("acq_sms_logs")
      .select("error")
      .eq("is_simulation", false)
      .eq("status", "failed")
      .gte("created_at", cutoff("7d"))
      .limit(500);
    const errBucket = new Map<string, number>();
    (failRows ?? []).forEach((r: any) => {
      const k = (r.error ?? "unknown").slice(0, 80);
      errBucket.set(k, (errBucket.get(k) ?? 0) + 1);
    });
    const topSmsError =
      [...errBucket.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    // ------------------------------------------------------------------
    // 2) Clicks — only SMS-attributed
    // ------------------------------------------------------------------
    const clicks = await countAcross((from) =>
      (supabase.from("click_events").select("id", { count: "exact", head: true }) as any)
        .gte("occurred_at", from)
        .in("source_table", ["acq_sms_logs", "outreach_messages"])
    );

    // ------------------------------------------------------------------
    // 3) Landing views — only SMS prospects
    // ------------------------------------------------------------------
    const landings = await countAcross((from) =>
      (supabase.from("contractor_funnel_events").select("id", { count: "exact", head: true }) as any)
        .gte("created_at", from)
        .eq("event_type", "landing_view")
    );

    // ------------------------------------------------------------------
    // 4) Account created — prospects with campaign attribution
    // ------------------------------------------------------------------
    const accounts = await countAcross((from) =>
      (supabase.from("prospects").select("id", { count: "exact", head: true }) as any)
        .gte("funnel_status_updated_at", from)
        .not("campaign_id", "is", null)
        .in("funnel_status", [
          "registered",
          "profile_completed",
          "checkout_started",
          "paid_1_dollar",
          "activated",
          "recommendable",
        ])
    );

    // ------------------------------------------------------------------
    // 5) Checkout Stripe SMS opened — STRICT: prospect+stripe_session_id+campaign
    // ------------------------------------------------------------------
    const checkoutOpened = await countAcross((from) =>
      (supabase.from("prospects").select("id", { count: "exact", head: true }) as any)
        .gte("funnel_status_updated_at", from)
        .not("stripe_session_id", "is", null)
        .not("campaign_id", "is", null)
        .in("funnel_status", [
          "checkout_started",
          "paid_1_dollar",
          "activated",
          "recommendable",
        ])
    );

    // ------------------------------------------------------------------
    // 6) Paid 1$ — only attributed prospects
    // ------------------------------------------------------------------
    const paidSuccess = await countAcross((from) =>
      (supabase.from("prospects").select("id", { count: "exact", head: true }) as any)
        .gte("activation_paid_at", from)
        .not("activation_paid_at", "is", null)
        .not("campaign_id", "is", null)
        .not("stripe_session_id", "is", null)
    );

    // 7) Paid failed — attributed sessions that failed/expired
    const paidFailed = await countAcross(async (from) => {
      // Collect prospect stripe_session_ids in window
      const { data: sids } = await supabase
        .from("prospects")
        .select("stripe_session_id")
        .not("stripe_session_id", "is", null)
        .not("campaign_id", "is", null)
        .gte("funnel_status_updated_at", from)
        .limit(500);
      const ids = (sids ?? []).map((r: any) => r.stripe_session_id).filter(Boolean);
      if (ids.length === 0) return { count: 0 };
      const { count } = await (supabase
        .from("checkout_sessions")
        .select("id", { count: "exact", head: true }) as any)
        .in("external_checkout_id", ids)
        .in("checkout_status", ["failed", "canceled", "expired"]);
      return { count: count ?? 0 };
    });

    const completed = await countAcross((from) =>
      (supabase.from("prospects").select("id", { count: "exact", head: true }) as any)
        .gte("funnel_status_updated_at", from)
        .not("campaign_id", "is", null)
        .in("funnel_status", ["profile_completed", "activated", "recommendable"])
    );
    const activated = await countAcross((from) =>
      (supabase.from("prospects").select("id", { count: "exact", head: true }) as any)
        .gte("funnel_status_updated_at", from)
        .not("campaign_id", "is", null)
        .in("funnel_status", ["activated", "recommendable"])
    );
    const recommendable = await countAcross((from) =>
      (supabase.from("prospects").select("id", { count: "exact", head: true }) as any)
        .gte("funnel_status_updated_at", from)
        .not("campaign_id", "is", null)
        .eq("recommendable", true)
    );

    // Last events
    const lastSms = await lastTs("acq_sms_logs", "created_at", (q) => q.eq("is_simulation", false));
    const lastClick = await lastTs("click_events", "occurred_at");
    const lastPaid = await lastTs("prospects", "activation_paid_at", (q) =>
      q.not("activation_paid_at", "is", null).not("campaign_id", "is", null),
    );

    const stages: StageResult[] = [
      { key: "sms_sent", label: "SMS envoyés (réels)", order: 1, totals: smsSent, last_event_at: lastSms, top_error: null },
      { key: "sms_delivered", label: "SMS livrés", order: 2, totals: smsDelivered, last_event_at: lastSms, top_error: null },
      { key: "sms_failed", label: "SMS échoués", order: 3, totals: smsFailed, last_event_at: lastSms, top_error: topSmsError },
      { key: "clicks", label: "Clics short link", order: 4, totals: clicks, last_event_at: lastClick, top_error: null },
      { key: "landing_view", label: "Landing ouverte", order: 5, totals: landings, last_event_at: null, top_error: null },
      { key: "account_created", label: "Compte créé", order: 6, totals: accounts, last_event_at: null, top_error: null },
      { key: "checkout_opened", label: "Checkout Stripe SMS (attribué)", order: 7, totals: checkoutOpened, last_event_at: null, top_error: null },
      { key: "paid_success", label: "Paiement 1 $ réussi", order: 8, totals: paidSuccess, last_event_at: lastPaid, top_error: null },
      { key: "paid_failed", label: "Paiement échoué", order: 9, totals: paidFailed, last_event_at: null, top_error: null },
      { key: "profile_completed", label: "Profil complété", order: 10, totals: completed, last_event_at: null, top_error: null },
      { key: "activated", label: "Entrepreneur activé", order: 11, totals: activated, last_event_at: null, top_error: null },
      { key: "recommendable", label: "Recommandable par Alex", order: 12, totals: recommendable, last_event_at: null, top_error: null },
    ];

    // ------------------------------------------------------------------
    // Unattributed Stripe checkouts — full breakdown per window
    // ------------------------------------------------------------------
    async function unattributedFor(w: Win) {
      const from = cutoff(w);
      // All checkout_sessions in window
      const { data: sessions } = await supabase
        .from("checkout_sessions")
        .select("id, selected_plan_code, checkout_status, external_checkout_id, created_at")
        .gte("created_at", from)
        .order("created_at", { ascending: false })
        .limit(500);

      const rows = sessions ?? [];
      const total = rows.length;
      if (total === 0) {
        return { total: 0, attributed: 0, unattributed: 0, by_plan: {}, samples: [] };
      }

      // Attribution: match to any prospect stripe_session_id with campaign_id
      const externalIds = rows
        .map((r: any) => r.external_checkout_id)
        .filter(Boolean);
      let attributedIds = new Set<string>();
      if (externalIds.length > 0) {
        const { data: matched } = await supabase
          .from("prospects")
          .select("stripe_session_id")
          .in("stripe_session_id", externalIds)
          .not("campaign_id", "is", null);
        attributedIds = new Set((matched ?? []).map((m: any) => m.stripe_session_id));
      }

      const byPlan: Record<string, number> = {};
      const samples: any[] = [];
      let attributed = 0;
      for (const r of rows) {
        const isSmsPlan = SMS_PLAN_CODES.includes(r.selected_plan_code ?? "");
        const isAttributed =
          r.external_checkout_id != null && attributedIds.has(r.external_checkout_id) && isSmsPlan;
        if (isAttributed) {
          attributed += 1;
        } else {
          byPlan[r.selected_plan_code ?? "unknown"] = (byPlan[r.selected_plan_code ?? "unknown"] ?? 0) + 1;
          if (samples.length < 20) {
            samples.push({
              id: (r.id as string).slice(0, 8) + "…",
              plan: r.selected_plan_code,
              status: r.checkout_status,
              external_id_masked: r.external_checkout_id
                ? r.external_checkout_id.slice(0, 12) + "…" + r.external_checkout_id.slice(-4)
                : null,
              created_at: r.created_at,
              reason: !isSmsPlan
                ? `plan hors tunnel SMS (${r.selected_plan_code ?? "n/a"})`
                : "aucun prospect SMS associé",
            });
          }
        }
      }
      return {
        total,
        attributed,
        unattributed: total - attributed,
        by_plan: byPlan,
        samples,
      };
    }

    const unattributed = {
      "24h": await unattributedFor("24h"),
      "7d": await unattributedFor("7d"),
      "30d": await unattributedFor("30d"),
    };

    // ------------------------------------------------------------------
    // Traffic-light + conv (7d)
    // ------------------------------------------------------------------
    const t = (k: string) => stages.find((s) => s.key === k)?.totals["7d"] ?? 0;
    function color(key: string): "red" | "amber" | "green" {
      const v = t(key);
      const sent = t("sms_sent");
      const delivered = t("sms_delivered");
      const clicks = t("clicks");
      const paid = t("paid_success");

      // In simulation mode with no real SMS, everything downstream is neutral (amber), not red.
      if (dryRunHint && sent === 0) return "amber";

      switch (key) {
        case "sms_sent":
          return v === 0 ? "red" : v < 25 ? "amber" : "green";
        case "sms_delivered": {
          if (sent === 0) return "red";
          const rate = v / sent;
          return rate < 0.7 ? "red" : rate < 0.9 ? "amber" : "green";
        }
        case "clicks": {
          if (delivered === 0) return "red";
          const rate = v / delivered;
          return rate < 0.05 ? "red" : rate < 0.10 ? "amber" : "green";
        }
        case "landing_view":
        case "account_created":
        case "checkout_opened":
          return v === 0 && clicks > 0 ? "red" : v > 0 ? "green" : "amber";
        case "paid_success": {
          if (delivered === 0) return "red";
          const rate = v / delivered;
          return rate < 0.005 ? "red" : rate < 0.01 ? "amber" : "green";
        }
        case "activated":
        case "recommendable":
          return paid > 0 && v === 0 ? "red" : v > 0 ? "green" : paid === 0 ? "amber" : "red";
        case "sms_failed":
          return sent > 0 && v / sent > 0.3 ? "red" : v / Math.max(sent, 1) > 0.1 ? "amber" : "green";
        case "profile_completed":
          return paid > 0 && v === 0 ? "red" : v > 0 ? "green" : "amber";
        case "paid_failed":
          return v > paid && paid === 0 ? "red" : "green";
      }
      return "amber";
    }

    const enriched = stages.map((s) => {
      const c = color(s.key);
      const prevMap: Record<string, string | null> = {
        sms_sent: null,
        sms_delivered: "sms_sent",
        sms_failed: "sms_sent",
        clicks: "sms_delivered",
        landing_view: "clicks",
        account_created: "landing_view",
        checkout_opened: "account_created",
        paid_success: "checkout_opened",
        paid_failed: "checkout_opened",
        profile_completed: "paid_success",
        activated: "profile_completed",
        recommendable: "activated",
      };
      const prev = prevMap[s.key];
      const conv =
        prev && t(prev) > 0
          ? Math.round((s.totals["7d"] / t(prev)) * 1000) / 10
          : null;
      return { ...s, color: c, conv_7d_pct: conv };
    });

    const blocker = enriched.find((s) => s.color === "red") ?? null;

    return new Response(
      JSON.stringify({
        generated_at: now.toISOString(),
        stages: enriched,
        blocker: blocker
          ? {
              stage_key: blocker.key,
              stage_label: blocker.label,
              top_error: blocker.top_error,
              conv_pct: blocker.conv_7d_pct,
            }
          : null,
        last_paid_at: lastPaid,
        simulation: {
          hint_dry_run: dryRunHint,
          sms_simulated: smsSimulated,
        },
        unattributed_checkouts: unattributed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[tunnel-reality-report]", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
