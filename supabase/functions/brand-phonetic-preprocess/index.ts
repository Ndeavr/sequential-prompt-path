import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FALLBACK: Record<string, string> = { fr: "un pro", en: "eun pro" };

const BRAND_PATTERNS = [
  /\bUNPRO\b/gi, /\bUnpro\b/g, /\bUn\s+Pro\b/gi, /\bUN\s+PRO\b/gi, /\bun-pro\b/gi,
];
const ANTI_SPELL = [
  /\bU[\.\s]?N[\.\s]?P[\.\s]?R[\.\s]?O\b/gi,
  /\byou[-\s]?en[-\s]?pro\b/gi,
  /\byou[-\s]?en\b/gi,
  /\bU\.N\.\b/gi,
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { text, language = "fr", engine = "default" } = await req.json();
    if (!text) return new Response(JSON.stringify({ error: "text required" }), { status: 400, headers: corsHeaders });

    const langKey = language.startsWith("en") ? "en" : "fr";

    // Fetch rules from DB
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: rules } = await supabase
      .from("alex_brand_phonetic_lock")
      .select("id, speech_text, context_type, priority")
      .eq("brand_key", "unpro")
      .eq("language_code", langKey)
      .eq("is_active", true)
      .eq("is_forced", true)
      .order("priority", { ascending: false })
      .limit(5);

    const globalRule = rules?.find((r: any) => r.context_type === "global");
    const spokenForm = globalRule?.speech_text || FALLBACK[langKey];

    let speechText = text;
    let brandDetected = false;

    for (const p of BRAND_PATTERNS) {
      p.lastIndex = 0;
      if (p.test(speechText)) brandDetected = true;
      p.lastIndex = 0;
      speechText = speechText.replace(p, spokenForm);
    }
    for (const p of ANTI_SPELL) {
      p.lastIndex = 0;
      if (p.test(speechText)) brandDetected = true;
      p.lastIndex = 0;
      speechText = speechText.replace(p, spokenForm);
    }

    // Log event
    if (brandDetected) {
      await supabase.from("alex_phonetic_events").insert({
        brand_key: "unpro",
        language_code: langKey,
        original_text: text.slice(0, 500),
        processed_text: speechText.slice(0, 500),
        engine,
        rule_id: globalRule?.id || null,
        success: true,
      });
    }

    return new Response(JSON.stringify({
      displayText: text,
      speechText,
      brandDetected,
      ruleApplied: globalRule?.id || (brandDetected ? "fallback" : null),
      languageCode: langKey,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
