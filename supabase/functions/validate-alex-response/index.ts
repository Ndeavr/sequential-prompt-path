import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ValidationRequest {
  response_text: string;
  user_message: string;
  session_id?: string;
  user_id?: string;
}

interface ValidationResult {
  validated: boolean;
  hallucination_detected: boolean;
  detected_terms: string[];
  severity: "none" | "low" | "medium" | "high" | "critical";
  corrected_response: string | null;
  plan_data: any[] | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const body: ValidationRequest = await req.json();
    const { response_text, user_message, session_id, user_id } = body;

    if (!response_text) {
      return new Response(JSON.stringify({ error: "response_text required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Fetch knowledge base
    const { data: knowledge } = await supabase
      .from("alex_knowledge_plans")
      .select("*")
      .eq("is_active", true)
      .eq("language", "fr")
      .limit(1)
      .single();

    // 2. Fetch plan definitions
    const { data: plans } = await supabase
      .from("contractor_plan_definitions")
      .select("*")
      .eq("is_active", true)
      .order("position_rank");

    const forbidden = knowledge?.forbidden_topics ?? [];
    const lower = response_text.toLowerCase();

    // 3. Scan for forbidden topics
    const detectedTerms: string[] = [];
    for (const topic of forbidden) {
      if (lower.includes(topic.toLowerCase())) {
        detectedTerms.push(topic);
      }
    }

    const hallucinationDetected = detectedTerms.length > 0;
    const severity = detectedTerms.length === 0
      ? "none"
      : detectedTerms.length <= 1
        ? "low"
        : detectedTerms.length <= 3
          ? "medium"
          : "high";

    // 4. Build corrected response if needed
    let correctedResponse: string | null = null;
    if (hallucinationDetected && plans && plans.length > 0) {
      const planLines = plans.map(
        (p: any) =>
          `**${p.name}** — ${(p.price_monthly / 100).toFixed(0)} $/mois · ${p.appointments_included} rendez-vous exclusifs · ${p.differentiator}`
      );
      correctedResponse = `Voici les plans UNPRO disponibles :\n\n${planLines.join("\n\n")}\n\n${knowledge?.core_positioning ?? "UNPRO génère des rendez-vous qualifiés et exclusifs par IA."}\n\nQuel plan correspond le mieux à votre capacité ?`;
    }

    // 5. Log response
    const { data: logEntry } = await supabase
      .from("alex_response_logs")
      .insert({
        user_id: user_id || null,
        session_id: session_id || null,
        raw_response: response_text,
        final_status: hallucinationDetected ? "corrected" : "approved",
        rewrite_applied: hallucinationDetected,
        rewritten_response: correctedResponse,
        blocked_patterns_detected: detectedTerms.length > 0 ? detectedTerms : null,
        hallucination_detected: hallucinationDetected,
        hallucination_terms: detectedTerms.length > 0 ? detectedTerms : null,
        original_message: user_message || null,
      })
      .select("id")
      .single();

    // 6. Log hallucination flag if detected
    if (hallucinationDetected && logEntry) {
      await supabase.from("alex_hallucination_flags").insert({
        response_log_id: logEntry.id,
        detected_terms: detectedTerms,
        severity,
        auto_corrected: !!correctedResponse,
        corrected_response: correctedResponse,
        context_json: { user_message, session_id },
      });
    }

    const result: ValidationResult = {
      validated: !hallucinationDetected,
      hallucination_detected: hallucinationDetected,
      detected_terms: detectedTerms,
      severity,
      corrected_response: correctedResponse,
      plan_data: plans,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
