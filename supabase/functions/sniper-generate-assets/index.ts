import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

function slugify(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const EMAIL_TEMPLATES = {
  curiosity: {
    subject: (name: string) => `${name} : aperçu de votre visibilité IA`,
    body: (name: string, ctaUrl: string) =>
      `Bonjour,\n\nNous avons commencé à analyser une partie de la présence numérique de ${name}.\n\nNous avons déjà détecté certains signaux publics liés à votre entreprise, et il semble qu'il y ait un vrai potentiel à débloquer.\n\nUNPRO vous montre :\n• ce qui aide déjà votre visibilité\n• ce qui peut la freiner\n• ce qu'il faudrait corriger en priorité\n\nVoir votre aperçu : ${ctaUrl}`,
  },
  weak_signals: {
    subject: () => `Votre entreprise mérite mieux que des signaux faibles`,
    body: (name: string, ctaUrl: string) =>
      `Bonjour,\n\nMême une bonne entreprise peut envoyer des signaux faibles à Google, aux IA et aux futurs clients.\n\nNous avons préparé un aperçu pour ${name} afin de montrer :\n• ce qui semble clair\n• ce qui semble bloquer votre visibilité\n• ce qu'il serait rentable de corriger maintenant\n\nVoir l'analyse : ${ctaUrl}`,
  },
  founder_scarcity: {
    subject: (name: string, city?: string) => `Accès prioritaire possible pour ${city || name}`,
    body: (name: string, ctaUrl: string) =>
      `Bonjour,\n\nCertaines catégories et certains territoires vont être activés plus tôt que d'autres.\n\nNous avons préparé un aperçu pour ${name} afin de vérifier si votre présence actuelle vous rend admissible à une activation prioritaire.\n\nVoir votre aperçu : ${ctaUrl}`,
  },
};

const SMS_TEMPLATES = {
  curiosity: (name: string, link: string) => `UNPRO a préparé un aperçu de la présence numérique de ${name}. Voir l'analyse : ${link}`,
  weak_signals: (name: string, link: string) => `Des signaux faibles peuvent freiner la visibilité de ${name}. Voici l'aperçu préparé par UNPRO : ${link}`,
  founder_scarcity: (name: string, link: string, city?: string) => `${city || "Votre zone"} peut se verrouiller vite. Vérifiez l'aperçu préparé pour ${name} : ${link}`,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { targetId } = await req.json();
    if (!targetId) return new Response(JSON.stringify({ error: "targetId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: target, error: loadErr } = await supabase.from("sniper_targets").select("*").eq("id", targetId).single();
    if (loadErr || !target) return new Response(JSON.stringify({ error: "target not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if ((target.sniper_priority_score || 0) < 60) {
      return new Response(JSON.stringify({ skipped: true, reason: "below_threshold", score: target.sniper_priority_score }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate outreach target
    const slug = slugify(`${target.business_name} ${target.city || ""}`);
    const secureToken = crypto.randomUUID();
    const baseUrl = Deno.env.get("SITE_URL") || "https://www.unpro.ca";
    const ctaUrl = `${baseUrl}/analyse/${slug}?t=${secureToken}`;

    const payload = {
      businessName: target.business_name,
      city: target.city,
      websiteUrl: target.website_url,
      phone: target.phone,
      rbqNumber: target.rbq_number,
      neqNumber: target.neq_number,
      category: target.category,
      sourceCampaign: target.source_origin,
      founderMode: target.founder_eligible,
      detectedSignals: (target.notes as any) || {},
      preAuditStatus: "prepared",
    };

    const { data: outreachTarget, error: otErr } = await supabase.from("outreach_targets").insert({
      campaign_id: target.source_campaign_id,
      contractor_id: target.contractor_id,
      business_name: target.business_name,
      website_url: target.website_url,
      phone: target.phone,
      city: target.city,
      rbq_number: target.rbq_number,
      neq_number: target.neq_number,
      category: target.category,
      slug,
      secure_token: secureToken,
      landing_status: "prepared",
      payload,
    }).select("id").single();

    if (otErr) throw otErr;

    // Link outreach target
    await supabase.from("sniper_targets").update({
      latest_outreach_target_id: outreachTarget.id,
      updated_at: new Date().toISOString(),
    }).eq("id", targetId);

    // Generate message variants
    const channel = target.recommended_channel || "email";
    const variants: string[] = ["curiosity", "weak_signals", "founder_scarcity"];
    let firstInserted = false;

    for (const variant of variants) {
      if (channel === "email" || channel === "dual") {
        const tpl = EMAIL_TEMPLATES[variant as keyof typeof EMAIL_TEMPLATES];
        await supabase.from("sniper_message_variants").insert({
          sniper_target_id: targetId,
          channel: "email",
          variant_type: variant,
          subject_line: tpl.subject(target.business_name, target.city),
          message_body: tpl.body(target.business_name, ctaUrl),
          personalization_payload: { businessName: target.business_name, city: target.city, ctaUrl },
          cta_url: ctaUrl,
          is_selected: !firstInserted,
        });
        firstInserted = true;
      }
      if (channel === "sms" || channel === "dual") {
        const smsFn = SMS_TEMPLATES[variant as keyof typeof SMS_TEMPLATES];
        await supabase.from("sniper_message_variants").insert({
          sniper_target_id: targetId,
          channel: "sms",
          variant_type: variant,
          message_body: smsFn(target.business_name, ctaUrl, target.city),
          personalization_payload: { businessName: target.business_name, city: target.city, ctaUrl },
          cta_url: ctaUrl,
          is_selected: !firstInserted,
        });
        firstInserted = true;
      }
    }

    await supabase.from("sniper_targets").update({
      outreach_status: "message_ready",
      updated_at: new Date().toISOString(),
    }).eq("id", targetId);

    return new Response(JSON.stringify({ success: true, targetId, outreachTargetId: outreachTarget.id, slug, ctaUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
