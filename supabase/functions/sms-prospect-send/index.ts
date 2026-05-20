// Send a prospect SMS (variant A/B/C) via Twilio connector.
// Admin only. Builds copy from the exact templates in the brief.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Variant = "A" | "B" | "C" | "auto";

function buildSms(variant: "A" | "B" | "C", p: { company: string; service: string; city: string; link: string }) {
  const linkLine = p.link;
  if (variant === "A") {
    return `${p.company} —

Les propriétaires utilisent maintenant ChatGPT et les moteurs IA pour trouver des entrepreneurs locaux.

Curieux de voir comment votre entreprise ressort pour :
« ${p.service} ${p.city} » ?

UNPRO a préparé votre aperçu local.

${linkLine}

Activation IA locale : 1$ / 7 jours

STOP = arrêter`;
  }
  if (variant === "B") {
    return `${p.company} —

Voyez comment votre entreprise apparaît dans ChatGPT pour :
« ${p.service} ${p.city} »

Votre aperçu local est prêt :
${linkLine}

Activation : 1$ / 7 jours

STOP = arrêter`;
  }
  return `${p.company} —

UNPRO a détecté des opportunités de visibilité locale pour votre entreprise dans :
- Google
- ChatGPT
- recherches locales IA

Voir votre aperçu :
${linkLine}

Activation : 1$ pendant 7 jours

STOP = arrêter`;
}

function pickAutoVariant(): "A" | "B" | "C" {
  const r = Math.random();
  if (r < 0.34) return "A";
  if (r < 0.67) return "B";
  return "C";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: claims } = await supabaseAuth.auth.getClaims(auth.replace("Bearer ", ""));
    if (!claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Admin check
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: claims.claims.sub, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    const body = await req.json();
    const prospectId: string | undefined = body.prospect_page_id;
    const phoneIn: string | undefined = body.phone;
    const variantIn: Variant = body.variant ?? "auto";
    const dryRun: boolean = !!body.dry_run;

    let prospect: any = null;
    if (prospectId) {
      const { data } = await supabase.from("prospect_pages").select("*").eq("id", prospectId).maybeSingle();
      prospect = data;
    }
    if (!prospect && body.slug) {
      const { data } = await supabase.from("prospect_pages").select("*").eq("slug", body.slug).maybeSingle();
      prospect = data;
    }
    if (!prospect) {
      return new Response(JSON.stringify({ error: "prospect_not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const phone = (phoneIn ?? prospect.phone ?? "").trim();
    if (!phone) {
      return new Response(JSON.stringify({ error: "missing_phone" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const variant = variantIn === "auto" ? pickAutoVariant() : variantIn;
    const linkSlug = prospect.slug;
    const shortLink = `go.unpro.ca/${linkSlug}`;
    const smsBody = buildSms(variant, {
      company: prospect.company_name,
      service: prospect.service ?? "vos services",
      city: prospect.city ?? "votre région",
      link: `https://${shortLink}`,
    });

    // Ensure short_link row exists
    await supabase.from("short_links").upsert({
      slug: linkSlug,
      target_path: `/pro/${linkSlug}`,
      prospect_page_id: prospect.id,
    }, { onConflict: "slug" });

    if (dryRun) {
      return new Response(JSON.stringify({ ok: true, dry_run: true, variant, sms_body: smsBody, short_link: shortLink }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send via Twilio REST API
    const sid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const token = Deno.env.get("TWILIO_AUTH_TOKEN")!;
    const msgSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");

    const params = new URLSearchParams({
      To: phone,
      Body: smsBody,
    });
    if (msgSid) params.set("MessagingServiceSid", msgSid);

    const auth64 = btoa(`${sid}:${token}`);
    const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth64}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const twData = await resp.json();
    const ok = resp.ok && twData.sid;

    await supabase.from("sms_campaigns").insert({
      prospect_page_id: prospect.id,
      company_name: prospect.company_name,
      phone,
      sms_variant: variant,
      sms_body: smsBody,
      short_link: linkSlug,
      twilio_sid: twData.sid ?? null,
      conversion_status: ok ? "sent" : "failed",
      error: ok ? null : JSON.stringify(twData),
    });

    return new Response(JSON.stringify({ ok, variant, twilio: twData }), {
      status: ok ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
