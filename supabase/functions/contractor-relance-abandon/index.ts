/**
 * UNPRO — Relance des entrepreneurs qui n'ont pas complété le paiement.
 *
 * Source de vérité : le devis personnalisé (`contractor_pricing_quotes`).
 * Un devis présenté, non payé et sans activité depuis 30 minutes devient un
 * lead à contacter dans la file existante (`contractor_leads`), avec une seule
 * alerte interne par dossier. Un paiement confirmé ferme le lead
 * (action `close`), et plus aucune alerte n'est envoyée.
 *
 * Aucune nouvelle table : la file de prospection existante est réutilisée.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_ALERT_EMAIL = "yturcotte@gmail.com";
const SITE = "https://unpro.ca";
const ABANDON_AFTER_MINUTES = 30;

type Quote = {
  id: string;
  contractor_id: string | null;
  company_name: string | null;
  city: string | null;
  trade_primary: string | null;
  recommended_plan: string | null;
  recommended_monthly_price: number | null;
  pricing_status: string | null;
  input_payload: Record<string, unknown> | null;
  source: string | null;
  created_at: string;
  updated_at: string;
  abandoned_at: string | null;
};

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* sweep par défaut */ }
  const action = str(body.action) ?? "sweep";
  const dryRun = body.dry_run === true;

  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    /* ---------- Fermeture après paiement confirmé ---------- */
    if (action === "close") {
      const quoteId = str(body.quote_id);
      if (!quoteId) return json({ error: "quote_id requis" }, 400);
      const { data: closed, error } = await supabase
        .from("contractor_leads")
        .update({
          lead_status: "converted",
          contact_status: "converti",
          payment_status: "paid",
          paid_at: new Date().toISOString(),
          next_follow_up_at: null,
        })
        .eq("source_type", "checkout_abandon")
        .filter("metadata_json->>quote_id", "eq", quoteId)
        .select("id");
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, closed: closed?.length ?? 0 });
    }

    /* ---------- Suivi de l'offre de repli 350 $ (aucun doublon) ---------- */
    if (action === "fallback_status") {
      const quoteId = str(body.quote_id);
      const status = str(body.status);
      const ALLOWED = [
        "plan_offered",
        "plan_declined",
        "fallback_350_offered",
        "fallback_350_checkout_started",
        "fallback_350_declined",
        "followup_required",
      ];
      if (!quoteId) return json({ error: "quote_id requis" }, 400);
      if (!status || !ALLOWED.includes(status)) return json({ error: "status invalide" }, 400);

      const { data: lead } = await supabase
        .from("contractor_leads")
        .select("id, metadata_json")
        .eq("source_type", "checkout_abandon")
        .filter("metadata_json->>quote_id", "eq", quoteId)
        .limit(1)
        .maybeSingle();

      const stamp = new Date().toISOString();

      if (lead?.id) {
        const meta = (lead.metadata_json ?? {}) as Record<string, unknown>;
        const { error: upErr } = await supabase
          .from("contractor_leads")
          .update({
            lead_status: status,
            next_follow_up_at: status === "fallback_350_declined" ? stamp : undefined,
            metadata_json: { ...meta, fallback_350_status: status, fallback_350_updated_at: stamp },
          })
          .eq("id", lead.id);
        if (upErr) return json({ error: upErr.message }, 500);
        return json({ ok: true, lead_id: lead.id, created: false });
      }

      // Aucun lead encore créé : on réutilise la détection d'abandon existante
      // pour ce devis précis, puis on applique le statut.
      const { data: quoteRow } = await supabase
        .from("contractor_pricing_quotes")
        .select("id, contractor_id, company_name, city, trade_primary, recommended_plan, recommended_monthly_price, input_payload, source, updated_at")
        .eq("id", quoteId)
        .maybeSingle();
      if (!quoteRow) return json({ error: "devis introuvable" }, 404);

      const qInput = (quoteRow.input_payload ?? {}) as Record<string, unknown>;
      const qAttr = (qInput.attribution ?? {}) as Record<string, unknown>;
      const qRef = str(qInput.ref) ?? str(qAttr.ref) ?? null;
      let qAffiliateId: string | null = null;
      if (qRef) {
        const { data: aff } = await supabase
          .from("affiliates")
          .select("id")
          .eq("referral_code", qRef.toUpperCase())
          .maybeSingle();
        qAffiliateId = (aff as { id?: string } | null)?.id ?? null;
      }

      const { data: inserted, error: insErr } = await supabase
        .from("contractor_leads")
        .insert({
          source_type: "checkout_abandon",
          source_label: "Offre de repli 350 $",
          company_name: quoteRow.company_name,
          business_name: quoteRow.company_name,
          city: quoteRow.city,
          category_primary: quoteRow.trade_primary,
          trade: quoteRow.trade_primary,
          email: str(qInput.email),
          phone: str(qInput.phone),
          contractor_id: quoteRow.contractor_id,
          assigned_affiliate_id: qAffiliateId,
          lead_status: status,
          contact_status: "a_contacter",
          payment_status: "abandoned",
          recommended_plan_slug: quoteRow.recommended_plan,
          payment_started_at: quoteRow.updated_at,
          next_follow_up_at: stamp,
          metadata_json: {
            quote_id: quoteRow.id,
            plan: quoteRow.recommended_plan,
            plan_price_monthly: quoteRow.recommended_monthly_price,
            abandon_step: "offre_repli_350",
            fallback_350_status: status,
            fallback_350_updated_at: stamp,
            resume_url: `${SITE}/entrepreneur/plan-personnalise/${quoteRow.id}`,
            ref: qRef,
            source: quoteRow.source ?? str(qAttr.utm_source),
            utm: qAttr,
          },
        })
        .select("id")
        .maybeSingle();
      if (insErr) return json({ error: insErr.message }, 500);
      return json({ ok: true, lead_id: inserted?.id ?? null, created: true });
    }

    /* ---------- Détection des abandons ---------- */
    const cutoff = new Date(Date.now() - ABANDON_AFTER_MINUTES * 60_000).toISOString();
    const explicitQuoteId = str(body.quote_id);

    let query = supabase
      .from("contractor_pricing_quotes")
      .select(
        "id, contractor_id, company_name, city, trade_primary, recommended_plan, recommended_monthly_price, pricing_status, input_payload, source, created_at, updated_at, abandoned_at",
      )
      .is("abandoned_at", null)
      .not("pricing_status", "in", "(paid,accepted)")
      .limit(50);

    query = explicitQuoteId ? query.eq("id", explicitQuoteId) : query.lt("updated_at", cutoff);

    const { data: quotes, error: qErr } = await query;
    if (qErr) return json({ error: qErr.message }, 500);

    const summary = { candidates: quotes?.length ?? 0, created: 0, skipped: 0, emailed: 0 };

    for (const quote of (quotes ?? []) as Quote[]) {
      // Déduplication : un seul lead de relance actif par devis.
      const { data: existing } = await supabase
        .from("contractor_leads")
        .select("id")
        .eq("source_type", "checkout_abandon")
        .filter("metadata_json->>quote_id", "eq", quote.id)
        .limit(1);
      if (existing && existing.length > 0) { summary.skipped++; continue; }

      const input = (quote.input_payload ?? {}) as Record<string, unknown>;
      const attribution = (input.attribution ?? {}) as Record<string, unknown>;
      const ref = str(input.ref) ?? str(attribution.ref) ?? null;
      const resumeUrl = `${SITE}/entrepreneur/plan-personnalise/${quote.id}${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`;

      // Attribution affiliée existante conservée ; sinon file admin non assignée.
      let affiliateId: string | null = null;
      if (ref) {
        const { data: aff } = await supabase
          .from("affiliates")
          .select("id")
          .eq("referral_code", ref.toUpperCase())
          .maybeSingle();
        affiliateId = (aff as { id?: string } | null)?.id ?? null;
      }

      const metadata = {
        quote_id: quote.id,
        audit_id: str(input.audit_id),
        prospect_id: str(input.prospect_id) ?? str(attribution.prospect_id),
        plan: quote.recommended_plan,
        plan_price_monthly: quote.recommended_monthly_price,
        abandon_step: "plan_personnalise_sans_paiement",
        resume_url: resumeUrl,
        ref,
        source: quote.source ?? str(attribution.utm_source),
        utm: attribution,
        detected_at: new Date().toISOString(),
      };

      if (dryRun) { summary.skipped++; continue; }

      const { error: insertErr } = await supabase.from("contractor_leads").insert({
        source_type: "checkout_abandon",
        source_label: "Abandon avant paiement",
        company_name: quote.company_name,
        business_name: quote.company_name,
        city: quote.city,
        category_primary: quote.trade_primary,
        category_secondary: str(input.trade_secondary),
        trade: quote.trade_primary,
        email: str(input.email),
        phone: str(input.phone),
        website_url: str(input.website_url),
        contractor_id: quote.contractor_id,
        assigned_affiliate_id: affiliateId,
        lead_status: "to_contact",
        contact_status: "a_contacter",
        payment_status: "abandoned",
        recommended_plan_slug: quote.recommended_plan,
        payment_started_at: quote.updated_at,
        next_follow_up_at: new Date().toISOString(),
        metadata_json: metadata,
      });
      if (insertErr) { summary.skipped++; console.error("[relance] insert", insertErr.message); continue; }
      summary.created++;

      await supabase
        .from("contractor_pricing_quotes")
        .update({ abandoned_at: new Date().toISOString() })
        .eq("id", quote.id);

      // Une seule alerte interne par dossier.
      const { error: mailErr } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "contractor-abandon-admin-alert",
          recipientEmail: ADMIN_ALERT_EMAIL,
          idempotencyKey: `abandon-alert-${quote.id}`,
          templateData: {
            businessName: quote.company_name ?? "Entreprise inconnue",
            contactName: str(input.contact_name),
            email: str(input.email),
            phone: str(input.phone),
            city: quote.city,
            tradePrimary: quote.trade_primary,
            tradeSecondary: str(input.trade_secondary),
            planName: quote.recommended_plan,
            planPrice: quote.recommended_monthly_price
              ? `${quote.recommended_monthly_price} $/mois`
              : undefined,
            abandonStep: "Plan présenté, paiement non complété",
            source: quote.source,
            affiliate: ref,
            resumeUrl,
            adminUrl: `${SITE}/admin/leads`,
            quoteId: quote.id,
            auditId: str(input.audit_id),
            occurredAt: new Date().toISOString(),
          },
        },
      });
      if (!mailErr) summary.emailed++;
      else console.error("[relance] email", mailErr.message);
    }

    return json({ ok: true, ...summary });
  } catch (e) {
    console.error("[relance] fatal", e);
    return json({ error: (e as Error).message }, 500);
  }
});
