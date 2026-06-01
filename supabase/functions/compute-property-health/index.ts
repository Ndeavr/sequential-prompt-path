// compute-property-health
// Aggregates visual_analyses + property_memory_events + quote_analyses into a
// single property_health_scores row. Deterministic, no external AI calls.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Severity = "low" | "medium" | "high" | "critical";

interface ReqBody {
  property_id?: string;
}

const SEVERITY_WEIGHT: Record<Severity, number> = {
  low: 4,
  medium: 12,
  high: 24,
  critical: 40,
};

const TOPIC_RULES: Array<{
  key: "moisture_score" | "ventilation_score" | "insulation_score" | "structural_score" | "electrical_score";
  matchers: RegExp;
}> = [
  { key: "moisture_score", matchers: /humid|moisi|infiltration|fuite|d[ée]g[âa]t d['']eau|condensation|eau/i },
  { key: "ventilation_score", matchers: /ventilation|a[ée]ration|moisissure|qualit[ée] de l['']air|hotte/i },
  { key: "insulation_score", matchers: /isolation|isolant|d[ée]perdition|froid|chaud|thermique|grenier/i },
  { key: "structural_score", matchers: /structure|fissure|fondation|toit|charpente|affaissement/i },
  { key: "electrical_score", matchers: /[ée]lectrique|panneau|c[âa]blage|disjoncteur|surchauffe/i },
];

function classifyText(text: string): typeof TOPIC_RULES[number]["key"] | null {
  for (const r of TOPIC_RULES) {
    if (r.matchers.test(text)) return r.key;
  }
  return null;
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json().catch(() => ({}))) as ReqBody;
    const propertyId = body.property_id;
    if (!propertyId) {
      return new Response(JSON.stringify({ error: "property_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: u } = await supa.auth.getUser(authHeader.slice(7));
    const userId = u?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [va, pme] = await Promise.all([
      supa
        .from("visual_analyses")
        .select("ai_findings, urgency_level, created_at")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false })
        .limit(50),
      supa
        .from("property_memory_events")
        .select("event_type, ai_summary, risk_level, created_at")
        .eq("property_id", propertyId)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    const subs = {
      moisture_score: 100,
      ventilation_score: 100,
      insulation_score: 100,
      structural_score: 100,
      electrical_score: 100,
    };

    let signalCount = 0;

    // Visual findings -> sub-scores
    for (const row of va.data ?? []) {
      const findings = Array.isArray(row.ai_findings) ? row.ai_findings : [];
      for (const f of findings) {
        const label = String(f?.label ?? "");
        const sev = (f?.severity as Severity) ?? (row.urgency_level as Severity) ?? "medium";
        const w = SEVERITY_WEIGHT[sev] ?? SEVERITY_WEIGHT.medium;
        const topic = classifyText(label);
        if (topic) {
          subs[topic] -= w;
          signalCount++;
        } else {
          // Spread small penalty across all
          for (const k of Object.keys(subs) as Array<keyof typeof subs>) subs[k] -= w / 8;
          signalCount++;
        }
      }
    }

    // Memory events
    for (const ev of pme.data ?? []) {
      const txt = `${ev.ai_summary ?? ""} ${ev.event_type ?? ""}`;
      const sev = (ev.risk_level as Severity) ?? "low";
      const w = SEVERITY_WEIGHT[sev] ?? SEVERITY_WEIGHT.low;
      const topic = classifyText(txt);
      if (topic) {
        subs[topic] -= w / 2;
        signalCount++;
      }
    }

    for (const k of Object.keys(subs) as Array<keyof typeof subs>) subs[k] = Math.round(clamp(subs[k]));

    const overall = Math.round(
      (subs.moisture_score +
        subs.ventilation_score +
        subs.insulation_score +
        subs.structural_score +
        subs.electrical_score) /
        5,
    );

    const insertRow = {
      property_id: propertyId,
      user_id: userId,
      overall_score: overall,
      ...subs,
      signals: {
        visual_analyses: va.data?.length ?? 0,
        memory_events: pme.data?.length ?? 0,
        signal_count: signalCount,
      },
      generated_at: new Date().toISOString(),
    };

    const { data, error } = await supa
      .from("property_health_scores")
      .insert(insertRow)
      .select("id, overall_score, generated_at")
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, ...data, scores: insertRow }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("compute-property-health fatal", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
