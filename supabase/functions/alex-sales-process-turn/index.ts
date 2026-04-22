import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Microcopy (international French + English) ───
const MICROCOPY = {
  fr: {
    greeting: "Bonjour ! Je suis Alex, votre conseiller UNPRO. Comment puis-je vous aider aujourd'hui ?",
    ask_service: "Quel est votre domaine d'activité principal ?",
    ask_city: "Quelle zone géographique couvrez-vous ?",
    ask_revenue: "Quel chiffre d'affaires visez-vous cette année ?",
    ask_job_value: "En moyenne, combien vaut un projet pour vous ?",
    ask_capacity: "Combien de projets supplémentaires pouvez-vous accepter par mois ?",
    projection_intro: "Très bien. Voici ce que je vois pour vous.",
    plan_recommendation: "Pour votre situation, voici le plan le plus adapté.",
    objection_price: "Je comprends. L'objectif est justement d'éviter de payer pour du bruit.",
    objection_think: "Bien sûr. Vous pouvez avancer sans tout finaliser immédiatement.",
    objection_trust: "C'est normal d'avoir des questions. UNPRO mise sur la transparence et les résultats mesurables.",
    objection_compare: "Je vous encourage à comparer. La différence, c'est la qualité des rendez-vous.",
    checkout_ready: "Je peux préparer votre activation dès maintenant.",
    activation_done: "Parfait. Votre compte est activé. Voici les prochaines étapes.",
  },
  en: {
    greeting: "Hello! I'm Alex, your UNPRO advisor. How can I help you today?",
    ask_service: "What's your main line of work?",
    ask_city: "What area do you cover?",
    ask_revenue: "What revenue are you targeting this year?",
    ask_job_value: "On average, what's a project worth for you?",
    ask_capacity: "How many additional projects can you take on per month?",
    projection_intro: "Great. Here's what I see for you.",
    plan_recommendation: "For your situation, here's the best plan.",
    objection_price: "I understand. The goal is to stop paying for noise.",
    objection_think: "Of course. You can move forward without locking everything in right away.",
    objection_trust: "That's a fair concern. UNPRO is built on transparency and measurable results.",
    objection_compare: "I encourage you to compare. The difference is appointment quality.",
    checkout_ready: "I can get your activation ready right now.",
    activation_done: "Perfect. You're activated. Here are the next steps.",
  },
};

const PLANS: Record<string, { price: number; maxRdv: number }> = {
  recrue: { price: 149, maxRdv: 0 },
  pro: { price: 349, maxRdv: 5 },
  premium: { price: 599, maxRdv: 10 },
  elite: { price: 999, maxRdv: 25 },
  signature: { price: 1799, maxRdv: 50 },
};

const OBJECTION_PATTERNS: Record<string, RegExp> = {
  price_too_high: /trop cher|expensive|too much|coûte|costly|budget/i,
  not_ready: /pas prêt|not ready|plus tard|later|pas maintenant|not now/i,
  need_to_think: /réfléchir|think about|penser|consider/i,
  need_to_compare: /comparer|compare|concurren|competitor|autre option|other option/i,
  trust_issue: /confiance|trust|arnaque|scam|sérieux|legit/i,
  already_have_marketing: /déjà|already|marketing|publicité|ads/i,
};

// ─── Step resolution ───
function resolveNextStep(session: any): { step: string; message_key: string; ui_actions: string[] } {
  if (!session.service_type) return { step: "ask_service", message_key: "ask_service", ui_actions: [] };
  if (!session.city) return { step: "ask_city", message_key: "ask_city", ui_actions: [] };
  if (!session.target_revenue) return { step: "ask_revenue", message_key: "ask_revenue", ui_actions: [] };
  if (!session.avg_job_value) return { step: "ask_job_value", message_key: "ask_job_value", ui_actions: [] };
  if (!session.capacity_per_month) return { step: "ask_capacity", message_key: "ask_capacity", ui_actions: [] };
  if (!session.recommended_plan) return { step: "show_projection", message_key: "projection_intro", ui_actions: ["show_projection", "show_plan"] };
  if (!session.checkout_ready) return { step: "recommend_plan", message_key: "plan_recommendation", ui_actions: ["show_plan_selector"] };
  return { step: "checkout_ready", message_key: "checkout_ready", ui_actions: ["open_checkout"] };
}

function detectObjection(message: string): string | null {
  for (const [type, pattern] of Object.entries(OBJECTION_PATTERNS)) {
    if (pattern.test(message)) return type;
  }
  return null;
}

function extractSignals(message: string, session: any) {
  const updates: Record<string, any> = {};
  // Simple extraction heuristics
  const moneyMatch = message.match(/(\d[\d\s,.]*)\s*\$|(\$\s*\d[\d\s,.]*)|(\d[\d\s,.]*)\s*(k|K|mille|thousand)/);
  if (moneyMatch) {
    const raw = (moneyMatch[1] || moneyMatch[2] || moneyMatch[3] || "").replace(/[\s,$]/g, "").replace(",", ".");
    let val = parseFloat(raw);
    if (moneyMatch[4] && /k|K|mille|thousand/i.test(moneyMatch[4])) val *= 1000;
    if (val > 0) {
      if (!session.target_revenue) updates.target_revenue = val;
      else if (!session.avg_job_value) updates.avg_job_value = val;
    }
  }
  const capacityMatch = message.match(/(\d+)\s*(projet|project|par mois|per month|de plus|more)/i);
  if (capacityMatch) updates.capacity_per_month = parseInt(capacityMatch[1]);
  return updates;
}

function recommendPlan(rdvMonthly: number): string {
  if (rdvMonthly <= 3) return "recrue";
  if (rdvMonthly <= 8) return "pro";
  if (rdvMonthly <= 15) return "premium";
  if (rdvMonthly <= 25) return "elite";
  return "signature";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { sales_session_id, user_message, language = "fr" } = await req.json();
    const lang = language === "en" ? "en" : "fr";
    const copy = MICROCOPY[lang];

    // Start new session if needed
    if (!sales_session_id) {
      const token = crypto.randomUUID();
      const { data: newSession } = await supabase.from("alex_sales_sessions").insert({
        session_token: token,
        language: lang,
        locale_code: lang === "fr" ? "fr-FR" : "en-CA",
      }).select().single();

      return new Response(JSON.stringify({
        sales_session_id: newSession?.id,
        alex_response: copy.greeting,
        current_step: "greeting",
        next_action: "ask_service",
        ui_actions: [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Load session
    const { data: session } = await supabase.from("alex_sales_sessions")
      .select("*").eq("id", sales_session_id).single();
    if (!session) throw new Error("Session not found");

    // Log user message
    await supabase.from("alex_sales_events").insert({
      sales_session_id,
      event_type: "user_message",
      payload: { message: user_message, language: lang },
    });

    // Detect objection
    const objection = detectObjection(user_message);
    if (objection) {
      const objKey = objection === "price_too_high" ? "objection_price" :
                     objection === "need_to_think" || objection === "not_ready" ? "objection_think" :
                     objection === "trust_issue" ? "objection_trust" :
                     objection === "need_to_compare" ? "objection_compare" :
                     "objection_think";

      await supabase.from("alex_sales_objections").insert({
        sales_session_id,
        objection_type: objection,
        detected_text: user_message,
        response_used: copy[objKey as keyof typeof copy],
      });

      const next = resolveNextStep(session);
      return new Response(JSON.stringify({
        sales_session_id,
        alex_response: copy[objKey as keyof typeof copy],
        current_step: session.current_step,
        next_action: next.step,
        objection_state: { type: objection, resolved: false },
        ui_actions: [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Extract data signals
    const signals = extractSignals(user_message, session);
    
    // Infer field from step
    if (!signals.target_revenue && !signals.avg_job_value && !signals.capacity_per_month) {
      if (session.current_step === "ask_service" && !session.service_type) {
        signals.service_type = user_message.trim();
      } else if (session.current_step === "ask_city" && !session.city) {
        signals.city = user_message.trim();
      }
    }

    // Update session
    if (Object.keys(signals).length > 0) {
      await supabase.from("alex_sales_sessions").update({
        ...signals,
        updated_at: new Date().toISOString(),
      }).eq("id", sales_session_id);
      Object.assign(session, signals);
    }

    // Compute projection if we have enough data
    let projection = null;
    if (session.target_revenue && session.avg_job_value && !session.recommended_plan) {
      const rdvAnnual = Math.ceil(session.target_revenue / session.avg_job_value);
      const rdvMonthly = Math.min(Math.ceil(rdvAnnual / 12), 30);
      const plan = recommendPlan(rdvMonthly);

      projection = { target_revenue: session.target_revenue, avg_job_value: session.avg_job_value, rdv_annual: rdvAnnual, rdv_monthly: rdvMonthly, recommended_plan: plan };

      await supabase.from("entrepreneur_revenue_projections").insert({
        sales_session_id,
        target_revenue: session.target_revenue,
        avg_job_value: session.avg_job_value,
        estimated_close_rate: 0.65,
        estimated_appointments_needed: rdvAnnual,
        estimated_monthly_appointments: rdvMonthly,
        user_id: session.user_id || "00000000-0000-0000-0000-000000000000",
      });

      await supabase.from("alex_sales_sessions").update({ recommended_plan: plan, current_step: "show_projection" }).eq("id", sales_session_id);
      session.recommended_plan = plan;
    }

    const next = resolveNextStep(session);
    await supabase.from("alex_sales_sessions").update({ current_step: next.step }).eq("id", sales_session_id);

    return new Response(JSON.stringify({
      sales_session_id,
      alex_response: copy[next.message_key as keyof typeof copy] || copy.greeting,
      current_step: next.step,
      next_action: next.step,
      projection,
      plan_recommendation: session.recommended_plan ? { plan: session.recommended_plan, price: PLANS[session.recommended_plan]?.price } : null,
      ui_actions: next.ui_actions,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
