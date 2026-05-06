import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { contractor_id, base_url } = await req.json();
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: c } = await sb.from("acq_contractors").select("*").eq("id", contractor_id).single();
    const { data: page } = await sb.from("acq_aipp_pages").select("page_slug, public_token").eq("contractor_id", contractor_id).single();
    const { data: invite } = await sb.from("acq_invites").select("*").eq("contractor_id", contractor_id).maybeSingle();

    if (!c || !page || !invite) throw new Error("missing_data");

    const origin = base_url || "https://unpro.ca";
    const aippUrl = `${origin}/aipp/${page.page_slug}?t=${page.public_token}`;

    const subject = `Votre profil AIPP UNPRO est prêt — ${c.company_name}`;
    const body = `Bonjour,

Nous avons préparé votre profil AIPP UNPRO pour ${c.company_name}.

Votre page analyse :
- votre visibilité
- votre positionnement
- vos forces
- les opportunités de contrats manquées
- les actions recommandées pour obtenir plus de rendez-vous qualifiés

Consulter votre profil :
${aippUrl}

Code d'activation aujourd'hui : freetoday
Ce code est valide pour une seule activation.

UNPRO envoie des rendez-vous qualifiés, pas des leads partagés.

À bientôt,
UNPRO`;

    let sent = false;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      try {
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "UNPRO <notify@unpro.ca>",
            to: [invite.email],
            subject,
            text: body,
          }),
        });
        sent = r.ok;
      } catch (e) { console.error(e); }
    }

    await sb.from("acq_invites").update({
      rendered_subject: subject,
      rendered_body: body,
      sent_at: sent ? new Date().toISOString() : null,
      status: sent ? "sent" : "pending",
    }).eq("id", invite.id);

    return new Response(JSON.stringify({ success: true, sent, subject, body, url: aippUrl }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
