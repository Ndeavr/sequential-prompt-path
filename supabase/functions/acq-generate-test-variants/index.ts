/**
 * acq-generate-test-variants
 *
 * Génère 5 variantes email + 5 variantes SMS pour un prospect entrepreneur
 * via Lovable AI (Gemini 2.5 Flash), avec angle, ton, CTA et score prédit.
 * Stocke chaque variante dans `contractor_outreach_tests` en statut `draft`
 * (admin doit approuver avant envoi réel).
 *
 * Copy guardrails:
 *   - JAMAIS "leads", "leads partagés", "directory", "annuaire"
 *   - TOUJOURS "rendez-vous exclusifs", "visibilité IA", "territoire", "capacité"
 *
 * Input:  { prospect_id: string, force_regenerate?: boolean }
 * Output: { variants: { email: [...], sms: [...] } }
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FORBIDDEN = ["lead partagé", "leads partagés", "annuaire", "directory", "soumission partagée"];
const ANGLES = [
  { key: "ai_gap",     label: "Faille de visibilité IA"          },
  { key: "competitor", label: "Comparaison concurrence locale"   },
  { key: "territory",  label: "Territoire exclusif disponible"   },
  { key: "reputation", label: "Analyse réputation Google"        },
  { key: "revenue",    label: "Opportunité revenue mensuel"      },
];

function sanitize(text: string): string {
  let out = text;
  for (const f of FORBIDDEN) {
    out = out.replace(new RegExp(f, "gi"), "rendez-vous exclusif");
  }
  return out;
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "Tu es Alex d'UNPRO, expert en acquisition entrepreneur au Québec. " +
            "Tu écris en français québécois, ton calme et précis. " +
            "INTERDIT: 'leads', 'leads partagés', 'annuaire', 'soumission partagée'. " +
            "TOUJOURS: 'rendez-vous exclusifs', 'visibilité IA', 'territoire', 'capacité'. " +
            "Retourne UNIQUEMENT du JSON valide selon le schéma demandé.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Gemini ${res.status}: ${txt}`);
  }
  const j = await res.json();
  return j.choices?.[0]?.message?.content ?? "{}";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return new Response(JSON.stringify({
        ok: false,
        step: "generate_messages",
        error_code: "MISSING_SECRET",
        message: "LOVABLE_API_KEY manquant — génération de messages en pause.",
        missing: ["LOVABLE_API_KEY"],
        next_action: "LOVABLE_API_KEY est auto-provisionné. Contacter le support si absent.",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { prospect_id, force_regenerate = false } = await req.json().catch(() => ({}));
    if (!prospect_id) {
      return new Response(JSON.stringify({
        ok: false,
        step: "generate_messages",
        error_code: "MISSING_INPUT",
        message: "prospect_id requis. Sélectionne un prospect dans la table.",
        next_action: "Cliquer sur une ligne de prospect avant de générer.",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Skip si variants déjà générés
    if (!force_regenerate) {
      const { data: existing } = await supabase
        .from("contractor_outreach_tests")
        .select("id")
        .eq("prospect_id", prospect_id)
        .limit(1);
      if (existing && existing.length > 0) {
        const { data: all } = await supabase
          .from("contractor_outreach_tests")
          .select("*")
          .eq("prospect_id", prospect_id)
          .order("channel", { ascending: true })
          .order("variant_index", { ascending: true });
        return new Response(
          JSON.stringify({ variants: all, reused: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Récupérer le contexte prospect
    const { data: prospect, error: pErr } = await supabase
      .from("contractor_prospects")
      .select(
        "id,business_name,trade,city,region,phone,email,website_url,aipp_score,review_rating,review_count,rbq,recommended_plan,estimated_capacity,estimated_monthly_value",
      )
      .eq("id", prospect_id)
      .maybeSingle();
    if (pErr || !prospect) throw new Error(`Prospect introuvable: ${pErr?.message}`);

    const ctx = `
Entreprise: ${prospect.business_name}
Métier: ${prospect.trade ?? "non spécifié"}
Ville: ${prospect.city ?? "non spécifiée"}
Score AIPP: ${prospect.aipp_score ?? "non calculé"}/100
Avis Google: ${prospect.review_count ?? 0} avis, ${prospect.review_rating ?? "—"}/5
RBQ: ${prospect.rbq ?? "absent"}
Site web: ${prospect.website_url ?? "absent"}
Plan recommandé: ${prospect.recommended_plan ?? "à déterminer"}
Capacité estimée: ${prospect.estimated_capacity ?? "?"} RDV/mois
Valeur mensuelle estimée: ${prospect.estimated_monthly_value ? `${prospect.estimated_monthly_value}$` : "?"}
`.trim();

    // Génération EMAIL (5 variants, 1 par angle)
    const emailPrompt = `${ctx}

Génère 5 variantes d'EMAIL d'acquisition pour cet entrepreneur québécois, une par angle:
${ANGLES.map((a, i) => `${i + 1}. ${a.label}`).join("\n")}

Chaque email doit avoir:
- subject (max 60 caractères, accrocheur, sans clickbait)
- body (max 800 caractères, ton calme/sharp/warm, 1 CTA clair)
- cta (max 35 caractères, action concrète)
- tone ("calme" | "direct" | "warm" | "expert")
- predicted_score (0-100, ton estimation de la probabilité de conversion)

Retourne JSON: { "emails": [{ "angle": "ai_gap", "subject": "...", "body": "...", "cta": "...", "tone": "...", "predicted_score": 0 }, ...] }`;

    const smsPrompt = `${ctx}

Génère 5 variantes de SMS d'acquisition (max 320 caractères chacun), une par angle:
${ANGLES.map((a, i) => `${i + 1}. ${a.label}`).join("\n")}

Chaque SMS doit avoir:
- body (max 320 caractères, sec et concret, 1 lien d'action implicite)
- cta (max 35 caractères)
- tone ("calme" | "direct" | "warm" | "expert")
- predicted_score (0-100)

Retourne JSON: { "sms": [{ "angle": "ai_gap", "body": "...", "cta": "...", "tone": "...", "predicted_score": 0 }, ...] }`;

    const [emailRaw, smsRaw] = await Promise.all([
      callGemini(lovableKey, emailPrompt),
      callGemini(lovableKey, smsPrompt),
    ]);

    const emails = JSON.parse(emailRaw).emails ?? [];
    const sms = JSON.parse(smsRaw).sms ?? [];

    // Wipe existing si force_regenerate
    if (force_regenerate) {
      await supabase
        .from("contractor_outreach_tests")
        .delete()
        .eq("prospect_id", prospect_id);
    }

    const rows: any[] = [];
    emails.slice(0, 5).forEach((e: any, i: number) => {
      rows.push({
        prospect_id,
        channel: "email",
        variant_index: i,
        angle: e.angle ?? ANGLES[i].key,
        tone: e.tone ?? "calme",
        subject: sanitize(e.subject ?? ""),
        body: sanitize(e.body ?? ""),
        cta: sanitize(e.cta ?? "En savoir plus"),
        predicted_score: e.predicted_score ?? 50,
        status: "draft",
        generated_by: "gemini-2.5-flash",
      });
    });
    sms.slice(0, 5).forEach((s: any, i: number) => {
      rows.push({
        prospect_id,
        channel: "sms",
        variant_index: i,
        angle: s.angle ?? ANGLES[i].key,
        tone: s.tone ?? "direct",
        body: sanitize(s.body ?? ""),
        cta: sanitize(s.cta ?? "En savoir plus"),
        predicted_score: s.predicted_score ?? 50,
        status: "draft",
        generated_by: "gemini-2.5-flash",
      });
    });

    if (rows.length === 0) throw new Error("Aucune variante générée");

    const { data: inserted, error: insErr } = await supabase
      .from("contractor_outreach_tests")
      .insert(rows)
      .select();
    if (insErr) throw insErr;

    return new Response(
      JSON.stringify({ ok: true, step: "generate_messages", variants: inserted, count: inserted?.length ?? 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    console.error("[acq-generate-test-variants] ERROR", msg, stack);
    return new Response(JSON.stringify({
      ok: false,
      step: "generate_messages",
      error_code: "UNEXPECTED_ERROR",
      message: msg,
      next_action: "Vérifier le prospect sélectionné et réessayer.",
      details: { stack: stack?.slice(0, 1200) },
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
