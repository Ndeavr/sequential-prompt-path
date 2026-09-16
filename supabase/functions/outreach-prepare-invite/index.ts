/**
 * outreach-prepare-invite — prépare (sans envoyer) une invitation entrepreneur.
 *
 * Réservé aux administrateurs et à l'affilié propriétaire du lead.
 * - Revalide l'offre côté serveur au moment de la préparation (capacité réelle).
 * - Refuse tout lead non contactable (opt-out, désabonnement, suppression, revue conformité).
 * - Réutilise le jeton d'invitation existant et la page /pro/onboarding/:token.
 * - N'envoie AUCUN SMS, courriel, notification ou appel.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const log = async (
    status: string,
    request_payload: unknown,
    response_payload: unknown,
    error_code?: string,
  ) => {
    await sb.from("acquisition_action_logs").insert({
      action: "outreach_prepare_invite",
      status,
      request_payload: request_payload as Record<string, unknown>,
      response_payload: response_payload as Record<string, unknown>,
      error_code: error_code ?? null,
    });
  };

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return json({ error: "unauthenticated" }, 401);

    const { data: userData, error: userError } = await sb.auth.getUser(jwt);
    const user = userData?.user;
    if (userError || !user) return json({ error: "unauthenticated" }, 401);

    const { data: roles } = await sb
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const roleSet = new Set((roles ?? []).map((r) => r.role as string));
    const isAdmin = roleSet.has("admin");
    const isAffiliate = roleSet.has("affiliate");
    if (!isAdmin && !isAffiliate) return json({ error: "not_authorized" }, 403);

    const body = await req.json().catch(() => ({}));
    const leadId = typeof body?.lead_id === "string" ? body.lead_id.trim() : "";
    if (!leadId) return json({ error: "lead_id_required" }, 400);

    const { data: lead, error: leadError } = await sb
      .from("contractor_leads")
      .select(
        "id,company_name,first_name,city,trade,category_primary,phone_e164,email," +
          "do_not_contact,unsubscribed_at,sms_suppressed_at,compliance_review_required," +
          "attributed_user_id,onboarding_token",
      )
      .eq("id", leadId)
      .maybeSingle();

    if (leadError) return json({ error: "lookup_failed", detail: leadError.message }, 500);
    if (!lead) return json({ error: "lead_not_found" }, 404);
    if (!isAdmin && lead.attributed_user_id !== user.id) {
      return json({ error: "not_your_lead" }, 403);
    }

    const blockReason = lead.do_not_contact
      ? "do_not_contact"
      : lead.unsubscribed_at
        ? "unsubscribed"
        : lead.sms_suppressed_at
          ? "sms_suppressed"
          : lead.compliance_review_required
            ? "compliance_review_required"
            : null;

    if (blockReason) {
      await log("blocked", { lead_id: leadId }, { block_reason: blockReason }, blockReason);
      return json({ error: "not_contactable", block_reason: blockReason }, 409);
    }

    const label = (lead.trade ?? "").trim() || (lead.category_primary ?? "").trim() || null;
    const { data: slugData, error: slugError } = await sb.rpc("normalize_offer_category_slug", {
      p_label: label,
    });
    if (slugError) return json({ error: "category_resolution_failed", detail: slugError.message }, 500);
    const categorySlug = (slugData as string | null) ?? null;

    if (!categorySlug) {
      await log("blocked", { lead_id: leadId, label }, { reason: "unknown_category" }, "unknown_category");
      return json({ error: "unknown_category" }, 409);
    }

    const { data: offerData, error: offerError } = await sb.rpc("resolve_contractor_offer", {
      p_city: lead.city,
      p_category_slug: categorySlug,
    });
    if (offerError) return json({ error: "offer_resolution_failed", detail: offerError.message }, 500);

    const offer = (offerData ?? {}) as Record<string, unknown>;
    const offerKind = typeof offer.offer === "string" ? offer.offer : "unknown";

    if (offerKind !== "free_founding" && offerKind !== "express_350") {
      await log("blocked", { lead_id: leadId }, offer, "no_active_offer");
      return json({ error: "no_active_offer", offer }, 409);
    }

    // Jeton existant réutilisé ; généré seulement s'il est absent.
    let token = lead.onboarding_token as string | null;
    if (!token) {
      token = crypto.randomUUID().replace(/-/g, "");
      const { error: tokenError } = await sb
        .from("contractor_leads")
        .update({ onboarding_token: token, updated_at: new Date().toISOString() })
        .eq("id", leadId)
        .is("onboarding_token", null);
      if (tokenError) return json({ error: "token_persist_failed", detail: tokenError.message }, 500);

      const { data: reread } = await sb
        .from("contractor_leads")
        .select("onboarding_token")
        .eq("id", leadId)
        .maybeSingle();
      token = (reread?.onboarding_token as string | null) ?? token;
    }

    const origin = typeof body?.origin === "string" && /^https:\/\//.test(body.origin)
      ? body.origin.replace(/\/+$/, "")
      : "https://unpro.ca";
    const inviteUrl = `${origin}/pro/onboarding/${token}`;

    const payload = {
      ok: true,
      lead_id: lead.id,
      company_name: lead.company_name,
      first_name: lead.first_name,
      city: lead.city,
      category_slug: categorySlug,
      offer: offerKind,
      city_remaining: offer.city_remaining ?? null,
      invite_url: inviteUrl,
      sent: false as const,
    };

    await log("prepared", { lead_id: leadId }, { offer: offerKind, category_slug: categorySlug });

    return json(payload);
  } catch (e) {
    return json({ error: "unexpected", detail: String((e as Error)?.message ?? e) }, 500);
  }
});
