/**
 * alex-pronunciation-rules — CRUD + apply pronunciation rules.
 * 
 * GET  → fetch active rules by locale
 * POST { action: "apply", text, locale } → apply rules to text, return transformed
 * POST { action: "log", ... } → log a transformation
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

interface PronunciationRule {
  id: string;
  rule_name: string | null;
  source_text: string;
  replacement_text: string;
  phonetic_override: string | null;
  locale: string;
  rule_type: string;
  priority: number;
  is_active: boolean;
}

function applyRulesToText(text: string, rules: PronunciationRule[]): { transformed: string; applied: string[] } {
  let result = text;
  const applied: string[] = [];

  // Rules are already sorted by priority DESC from DB
  for (const rule of rules) {
    // Use word boundary safe replacement (case-insensitive)
    const escaped = rule.source_text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "gi");

    if (regex.test(result)) {
      // Use phonetic_override if available, otherwise replacement_text
      const replacement = rule.phonetic_override || rule.replacement_text;
      result = result.replace(regex, replacement);
      applied.push(rule.id);
    }
  }

  return { transformed: result, applied };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getSupabase();

    // GET — fetch rules by locale
    if (req.method === "GET") {
      const url = new URL(req.url);
      const locale = url.searchParams.get("locale") || "fr-CA";

      const { data: rules, error } = await supabase
        .from("alex_voice_pronunciation_rules")
        .select("*")
        .eq("is_active", true)
        .or(`locale.eq.${locale},locale.eq.global`)
        .order("priority", { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify({ rules }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST — apply or log
    const body = await req.json();
    const { action } = body;

    if (action === "apply") {
      const { text, locale = "fr-CA" } = body;
      if (!text) {
        return new Response(JSON.stringify({ error: "text required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: rules } = await supabase
        .from("alex_voice_pronunciation_rules")
        .select("*")
        .eq("is_active", true)
        .or(`locale.eq.${locale},locale.eq.global`)
        .order("priority", { ascending: false });

      const { transformed, applied } = applyRulesToText(text, rules || []);

      return new Response(
        JSON.stringify({ original: text, transformed, applied_rule_ids: applied }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "log") {
      const { voice_session_id, original_text, transformed_text, locale = "fr-CA", applied_rules_json = [] } = body;

      await supabase.from("alex_voice_pronunciation_logs").insert({
        voice_session_id,
        original_text,
        transformed_text,
        locale,
        applied_rules_json,
      });

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("pronunciation-rules error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
