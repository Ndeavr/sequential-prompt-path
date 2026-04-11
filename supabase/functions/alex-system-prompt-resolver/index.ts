/**
 * alex-system-prompt-resolver — Resolves the full Alex system prompt
 * by combining base prompt + active rules from alex_prompt_rules table.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    const { data: rules } = await sb
      .from("alex_prompt_rules")
      .select("rule_key, rule_type, rule_text, priority_order")
      .eq("is_active", true)
      .order("priority_order", { ascending: true });

    // Import base prompt
    const { ALEX_VOICE_SYSTEM_PROMPT } = await import("../_shared/alex-french-voice.ts");

    // Append dynamic rules
    const ruleBlocks = (rules || []).map(
      (r: any) => `\n[${r.rule_type.toUpperCase()}:${r.rule_key}]\n${r.rule_text}`
    );

    const fullPrompt = ALEX_VOICE_SYSTEM_PROMPT + "\n\n═══ RÈGLES DYNAMIQUES ═══" + ruleBlocks.join("\n");

    return new Response(
      JSON.stringify({ prompt: fullPrompt, rulesCount: rules?.length || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("alex-system-prompt-resolver error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to resolve prompt" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
