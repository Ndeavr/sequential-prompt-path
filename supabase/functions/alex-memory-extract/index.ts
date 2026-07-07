// Alex Memory Extract — turns a Q/A turn into structured long-term or temporary memory.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LONG_TERM_HINTS = [
  "chat","chien","fume","fumeur","parfum","allergie","condo","maison","duplex","multiplex",
  "français","anglais","texto","courriel","appel","budget","qualité","prix","rapide","écolo","local",
  "soir","matin","après-midi","locataire","accessibilité","garantie"
];

function heuristicExtract(question: string, answer: string): { scope: "long_term"|"temporary"; extracted: Record<string, unknown>; confidence: number } {
  const q = (question || "").toLowerCase();
  const a = (answer || "").toLowerCase();
  const yes = /\b(oui|yes|yep|ouais|effectivement|exactement)\b/.test(a);
  const no = /\b(non|no|nope|jamais|pas du tout)\b/.test(a);
  const extracted: Record<string, unknown> = {};
  let scope: "long_term"|"temporary" = "temporary";

  if (/chat/.test(q)) { extracted["environment.cats"] = yes && !no; scope = "long_term"; }
  if (/chien/.test(q)) { extracted["environment.dogs"] = yes && !no; scope = "long_term"; }
  if (/fum/.test(q)) { extracted["environment.smoking"] = yes && !no; scope = "long_term"; }
  if (/parfum|odeur|fragrance/.test(q)) { extracted["environment.fragrance_sensitive"] = yes && !no; scope = "long_term"; }
  if (/français|anglais|language|langue/.test(q)) {
    if (/anglais|english/.test(a)) extracted["communication.language"] = "en";
    else if (/français|french/.test(a)) extracted["communication.language"] = "fr";
    else if (/deux|both|les deux/.test(a)) extracted["communication.language"] = "both";
    scope = "long_term";
  }
  if (/texto|sms|courriel|email|appel|téléphone/.test(q)) {
    if (/texto|sms/.test(a)) extracted["communication.preferred_channel"] = "sms";
    else if (/courriel|email/.test(a)) extracted["communication.preferred_channel"] = "email";
    else if (/appel|téléphone|phone/.test(a)) extracted["communication.preferred_channel"] = "phone";
    scope = "long_term";
  }
  if (/maison|condo|duplex|multiplex|chalet/.test(q)) {
    for (const t of ["maison","condo","duplex","multiplex","chalet"]) {
      if (a.includes(t)) { extracted["property.type"] = t === "chalet" ? "cottage" : t === "maison" ? "house" : t; break; }
    }
    if (extracted["property.type"]) scope = "long_term";
  }
  if (/prix|qualité|rapide|écolo|budget/.test(q)) {
    if (/qualité|quality/.test(a)) extracted["preferences.priority"] = "quality";
    else if (/prix|cost|moins cher/.test(a)) extracted["preferences.priority"] = "cost";
    else if (/rapide|speed|vite/.test(a)) extracted["preferences.priority"] = "speed";
    else if (/écolo|eco|vert/.test(a)) extracted["preferences.priority"] = "eco";
    else if (/valeur|value/.test(a)) extracted["preferences.priority"] = "value";
    if (extracted["preferences.priority"]) scope = "long_term";
  }
  if (/soir|matin|après-midi/.test(q)) {
    if (/soir|evening/.test(a)) extracted["behavior.preferred_slot"] = "evening";
    else if (/matin|morning/.test(a)) extracted["behavior.preferred_slot"] = "morning";
    else if (/après-midi|afternoon/.test(a)) extracted["behavior.preferred_slot"] = "afternoon";
    if (extracted["behavior.preferred_slot"]) scope = "long_term";
  }

  const hasLongTermSignal = LONG_TERM_HINTS.some((h) => q.includes(h));
  if (hasLongTermSignal && Object.keys(extracted).length > 0) scope = "long_term";

  return { scope, extracted, confidence: Object.keys(extracted).length ? 0.85 : 0.3 };
}

function setDeep(obj: Record<string, any>, path: string, value: unknown) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    cur[parts[i]] = cur[parts[i]] ?? {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { user_id, session_id, question, answer, source = "alex" } = await req.json();
    if (!user_id || !answer) {
      return new Response(JSON.stringify({ error: "user_id and answer required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { scope, extracted, confidence } = heuristicExtract(question ?? "", answer ?? "");

    await supabase.from("homeowner_memory_events").insert({
      user_id, session_id: session_id ?? null, source, question, answer_raw: answer, extracted, scope, confidence,
    });

    if (scope === "long_term" && Object.keys(extracted).length > 0) {
      // Merge into DNA profile
      const { data: existing } = await supabase.from("homeowner_dna_profiles").select("*").eq("user_id", user_id).maybeSingle();
      const base = existing ?? { communication: {}, property: {}, preferences: {}, environment: {}, behavior: {}, confidence: {} };
      const merged: Record<string, any> = {
        communication: { ...(base.communication ?? {}) },
        property: { ...(base.property ?? {}) },
        preferences: { ...(base.preferences ?? {}) },
        environment: { ...(base.environment ?? {}) },
        behavior: { ...(base.behavior ?? {}) },
        confidence: { ...(base.confidence ?? {}) },
      };
      for (const [path, value] of Object.entries(extracted)) {
        const prevConf = merged.confidence[path] ?? 0;
        if (confidence >= prevConf) {
          setDeep(merged, path, value);
          merged.confidence[path] = confidence;
        }
      }
      await supabase.from("homeowner_dna_profiles").upsert({ user_id, ...merged, updated_at: new Date().toISOString() });
    }

    return new Response(JSON.stringify({ ok: true, scope, extracted, confidence }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[alex-memory-extract]", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
