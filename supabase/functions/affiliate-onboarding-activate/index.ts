// UNPRO — affiliate-onboarding-activate
// Activation idempotente d'une affiliée depuis l'onboarding /affilies/onboarding.
// Complète le profil, ajoute le rôle affilié (jamais admin), crée/complète la
// ligne affiliates, garantit referral_code + slug, enregistre préférences,
// acceptation des conditions (auditable) et source d'acquisition.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TERMS_VERSION = "2026.05.v1";

const WORK_PREFS = new Set(["unpro_leads", "own_leads", "known_owners", "mixed"]);
const CHANNELS = new Set(["phone", "sms", "email", "in_person"]);

function toSlug(input: string): string {
  return (
    input
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "unpro"
  );
}
function randCode(prefix: string): string {
  return `${prefix}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const sb = createClient(SUPABASE_URL, SRK, { auth: { persistSession: false } });
    const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
    if (!jwt) return json({ error: "unauthenticated" }, 401);
    const { data: userRes } = await sb.auth.getUser(jwt);
    const user = userRes?.user;
    if (!user) return json({ error: "unauthenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const firstName = String(body.first_name ?? "").trim().slice(0, 80);
    const lastName = String(body.last_name ?? "").trim().slice(0, 80);
    const phone = String(body.phone ?? "").trim().slice(0, 32);
    const email = String(body.email ?? user.email ?? "").trim().toLowerCase().slice(0, 254);
    const city = String(body.city ?? "").trim().slice(0, 120);
    const workPrefs = Array.isArray(body.work_preferences)
      ? body.work_preferences.filter((w: unknown) => WORK_PREFS.has(String(w)))
      : [];
    const channels = Array.isArray(body.preferred_channels)
      ? body.preferred_channels.filter((c: unknown) => CHANNELS.has(String(c)))
      : [];
    const termsAccepted = body.terms_accepted === true;
    const acquisition = body.acquisition && typeof body.acquisition === "object" ? body.acquisition : {};

    if (!firstName || !lastName) return json({ error: "name_required", message: "Prénom et nom requis." }, 400);
    if (!phone) return json({ error: "phone_required", message: "Numéro de téléphone requis." }, 400);
    if (!email) return json({ error: "email_required", message: "Courriel requis." }, 400);
    if (!termsAccepted) return json({ error: "terms_required", message: "Vous devez accepter les conditions du programme." }, 400);

    // Rôle affilié — jamais admin.
    await sb.from("user_roles").upsert({ user_id: user.id, role: "affiliate" }, { onConflict: "user_id,role" });

    // Profil public
    await sb
      .from("profiles")
      .upsert(
        {
          id: user.id,
          full_name: `${firstName} ${lastName}`.trim(),
          first_name: firstName,
          last_name: lastName,
          phone,
          email,
          city: city || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    // Ligne affiliée existante ? (par compte, puis par fiche pré-créée)
    let { data: existing } = await sb
      .from("affiliates")
      .select("id, slug, referral_code, status")
      .eq("user_id", user.id)
      .maybeSingle();

    // Fiche pré-créée par l'admin (slug/code déjà partagés, aucun compte lié) :
    // on la RÉCLAME au lieu d'en créer une deuxième, sinon le lien personnalisé
    // et l'attribution existante seraient orphelins.
    let claimedId: string | null = null;
    if (!existing) {
      const orFilters = [`email.eq.${email}`];
      if (phone) orFilters.push(`phone.eq.${phone}`);
      const { data: preCreated } = await sb
        .from("affiliates")
        .select("id, slug, referral_code, status, user_id")
        .is("user_id", null)
        .or(orFilters.join(","))
        .limit(1)
        .maybeSingle();
      if (preCreated) {
        claimedId = preCreated.id as string;
        existing = {
          id: preCreated.id,
          slug: preCreated.slug,
          referral_code: preCreated.referral_code,
          status: preCreated.status,
        } as typeof existing;
      }
    }

    let slug = existing?.slug as string | null;
    if (!slug) {
      const base = toSlug(`${firstName}-${lastName}`);
      slug = base;
      for (let i = 0; i < 6; i++) {
        const { data: clash } = await sb.from("affiliates").select("id").eq("slug", slug).maybeSingle();
        if (!clash) break;
        slug = `${base}-${Math.random().toString(36).slice(2, 5)}`;
      }
    }
    const referralCode = (existing?.referral_code as string | null) ?? randCode("UNPRO");

    const nowIso = new Date().toISOString();
    const payload: Record<string, unknown> = {
      user_id: user.id,
      name: `${firstName} ${lastName}`.trim(),
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      primary_city: city || null,
      preferred_language: "fr",
      display_preference: "first_name",
      affiliate_type: "partner",
      slug,
      referral_code: referralCode,
      work_preferences: workPrefs,
      preferred_channels: channels,
      acquisition_source: acquisition,
      activated_at: existing ? undefined : nowIso,
      updated_at: nowIso,
    };
    if (!existing) payload.status = "active";

    const { data: row, error: upErr } = claimedId
      ? await sb
          .from("affiliates")
          .update(payload)
          .eq("id", claimedId)
          .select("id, slug, referral_code, status")
          .single()
      : await sb
          .from("affiliates")
          .upsert(payload, { onConflict: "user_id" })
          .select("id, slug, referral_code, status")
          .single();
    if (upErr) return json({ error: `affiliate_upsert_failed: ${upErr.message}` }, 500);

    // Acceptation des conditions — auditable.
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const ua = req.headers.get("user-agent") ?? null;
    await sb.from("partner_terms_acceptance").upsert(
      {
        partner_id: row.id,
        user_id: user.id,
        role: "affiliate",
        terms_version: TERMS_VERSION,
        accepted: true,
        accepted_at: nowIso,
        ip_address: ip,
        user_agent: ua,
      },
      { onConflict: "partner_id,role,terms_version" }
    );

    // Rattachement sous-affilié si un parrain est en mémoire (logique existante).
    const refCode = typeof acquisition.ref === "string" ? acquisition.ref : null;
    if (refCode && !existing) {
      try {
        await sb.rpc("assign_affiliate_parent", { p_affiliate_id: row.id, p_ref_code: refCode });
      } catch {
        /* non bloquant */
      }
    }

    await sb.from("affiliate_funnel_events").insert({
      affiliate_id: row.id,
      session_id: String(body.session_id ?? "unknown"),
      event_type: "affiliate_activated",
      ref_code: refCode,
      utm_source: typeof acquisition.utm_source === "string" ? acquisition.utm_source : null,
      utm_medium: typeof acquisition.utm_medium === "string" ? acquisition.utm_medium : null,
      utm_campaign: typeof acquisition.utm_campaign === "string" ? acquisition.utm_campaign : null,
      metadata: { work_preferences: workPrefs, preferred_channels: channels, returning: !!existing },
    });

    return json({ ok: true, affiliate: { id: row.id, slug: row.slug, referral_code: row.referral_code, status: row.status } });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
