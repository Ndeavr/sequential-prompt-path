// solicitation-recovery — nudge clicked-but-not-registered (>2h) or registered-but-not-paid (>1h).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const GATEWAY = "https://connector-gateway.lovable.dev/twilio";
const BASE_URL = "https://unpro.ca/activation";

const RECOVERY_CLICKED = "Bonjour. Votre évaluation est toujours disponible. Activation entrepreneur: 1$ {{link}}";
const RECOVERY_REGISTERED = "Votre profil est prêt. Il reste seulement l'activation à 1$. {{link}}";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    const TWILIO_FROM = Deno.env.get("TWILIO_FROM_NUMBER");
    if (!LOVABLE_API_KEY || !TWILIO_API_KEY || !TWILIO_FROM) return json({ error: "twilio_not_configured" }, 500);

    const now = Date.now();
    const twoHoursAgo = new Date(now - 2 * 3600 * 1000).toISOString();
    const oneHourAgo = new Date(now - 1 * 3600 * 1000).toISOString();

    const [clickedRes, registeredRes] = await Promise.all([
      sb.from("contractor_outreach_queue").select("*").eq("status", "clicked").is("recovery_sent_at", null).lt("clicked_at", twoHoursAgo).limit(25),
      sb.from("contractor_outreach_queue").select("*").eq("status", "registered").is("recovery_sent_at", null).lt("registered_at", oneHourAgo).limit(25),
    ]);

    const send = async (row: any, tpl: string) => {
      const message = tpl.replace("{{link}}", `${BASE_URL}?t=${row.tracking_slug}`);
      const r = await fetch(`${GATEWAY}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": TWILIO_API_KEY,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: row.phone, From: TWILIO_FROM, Body: message }),
      });
      const ok = r.ok;
      await r.text();
      await sb.from("contractor_outreach_queue").update({
        recovery_sent_at: new Date().toISOString(),
        last_error: ok ? null : `recovery_failed_${r.status}`,
      }).eq("id", row.id);
      return ok;
    };

    let sentCount = 0;
    for (const row of clickedRes.data ?? []) if (await send(row, RECOVERY_CLICKED)) sentCount++;
    for (const row of registeredRes.data ?? []) if (await send(row, RECOVERY_REGISTERED)) sentCount++;

    return json({ sent: sentCount, clicked_pending: clickedRes.data?.length ?? 0, registered_pending: registeredRes.data?.length ?? 0 });
  } catch (e: any) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});
