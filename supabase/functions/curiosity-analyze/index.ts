// UNPRO — Curiosity analyze.
// Returns a deterministic AI recommendation score + missed-opportunity breakdown
// for the resolved lead. The frontend animates 6 milestones over ~7s while this runs.
//
// Real-data inputs (best-effort): existing ai_visibility_score on the lead,
// website presence, phone presence, city, trade. We never throw — partial
// data degrades gracefully so the reveal is always actionable.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type SignalGap = { key: string; label: string; points: number };

function computeScoreAndGaps(lead: any): { score: number; gaps: SignalGap[]; opportunities: { conversations: number; quotes: number; bookings_min: number; bookings_max: number } } {
  // Base components — each 0–20, total /100
  const hasWebsite = Boolean(lead.website_url);
  const hasPhone = Boolean(lead.phone || lead.mobile_phone);
  const hasCity = Boolean(lead.city);
  const hasTrade = Boolean(lead.trade || lead.category_primary);
  const baseAi = typeof lead.ai_visibility_score === "number" ? Math.max(0, Math.min(100, lead.ai_visibility_score)) : null;

  const web = hasWebsite ? 14 : 0;          // /20
  const reviews = baseAi != null ? Math.round((baseAi / 100) * 14) : 6; // /20
  const trust = (hasPhone ? 6 : 0) + (hasCity ? 5 : 0) + (hasTrade ? 4 : 0); // /20
  const local = hasCity ? 12 : 4;           // /20
  const expertise = hasTrade ? 9 : 3;       // /20

  const score = Math.max(20, Math.min(95, web + reviews + trust + local + expertise));

  const gaps: SignalGap[] = [];
  gaps.push({ key: "reviews", label: "Avis clients structurés", points: Math.max(6, 20 - reviews) });
  gaps.push({ key: "coverage", label: "Couverture de services", points: Math.max(5, 20 - local) });
  gaps.push({ key: "expertise", label: "Signaux d'expertise", points: Math.max(6, 20 - expertise) });
  gaps.push({ key: "documentation", label: "Documentation de projets", points: Math.max(4, 20 - web) });
  gaps.sort((a, b) => b.points - a.points);

  // Monthly missed opportunities — deterministic from score gap
  const gap = 100 - score;
  const conversations = Math.max(3, Math.round(gap * 0.25));
  const quotes = Math.max(2, Math.round(gap * 0.14));
  const bookings_min = Math.max(1, Math.round(gap * 0.05));
  const bookings_max = Math.max(bookings_min + 1, Math.round(gap * 0.09));

  return { score, gaps: gaps.slice(0, 4), opportunities: { conversations, quotes, bookings_min, bookings_max } };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const slug = String(body.slug || "").trim();
    const token = String(body.token || "").trim();
    if (!slug || !token) {
      return new Response(JSON.stringify({ ok: false, error: "missing_slug_or_token" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: leadRow, error: leadErr } = await sb
      .from("contractor_leads")
      .select("id,company_name,first_name,city,trade,category_primary,website_url,phone,mobile_phone,ai_visibility_score")
      .eq("curiosity_slug", slug)
      .eq("curiosity_token", token)
      .maybeSingle();
    if (leadErr) throw leadErr;
    if (!leadRow) {
      return new Response(JSON.stringify({ ok: false, error: "not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await sb.from("curiosity_funnel_events").insert({
      lead_id: leadRow.id, slug, event_type: "analysis_started", metadata: {},
    });

    const { score, gaps, opportunities } = computeScoreAndGaps(leadRow);

    // Persist score on lead (non-destructive — only if absent or lower than computed)
    if (leadRow.ai_visibility_score == null || leadRow.ai_visibility_score < score) {
      await sb.from("contractor_leads").update({ ai_visibility_score: score }).eq("id", leadRow.id);
    }

    await Promise.all([
      sb.from("curiosity_funnel_events").insert({
        lead_id: leadRow.id, slug, event_type: "analysis_completed", metadata: { score },
      }),
      sb.from("curiosity_funnel_events").insert({
        lead_id: leadRow.id, slug, event_type: "score_revealed", metadata: { score, gaps },
      }),
      sb.from("curiosity_sequences")
        .update({ revealed_at: new Date().toISOString() })
        .eq("lead_id", leadRow.id)
        .is("revealed_at", null),
    ]);

    return new Response(JSON.stringify({
      ok: true,
      lead_id: leadRow.id,
      business_name: leadRow.company_name,
      city: leadRow.city,
      service: leadRow.trade || leadRow.category_primary,
      score,
      gaps,
      opportunities,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
