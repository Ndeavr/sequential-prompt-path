// Verifies a Stripe checkout session for an outbound landing and triggers
// contractor publication when paid. Called from the /merci success page.
// POST { session_id, slug, token }
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function slugify(s: string): string {
  return (s || "pro").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { session_id, slug, token } = await req.json();
    if (!session_id || !slug || !token) {
      return new Response(JSON.stringify({ error: "session_id, slug, token requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: landing } = await supabase
      .from("outbound_landing_pages")
      .select("*")
      .eq("page_slug", slug)
      .maybeSingle();
    if (!landing || landing.landing_token !== token) {
      return new Response(JSON.stringify({ error: "Lien invalide" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ status: session.payment_status, paid: false }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotent: if already published, just return current contractor
    if (landing.publish_status === "published" && landing.published_contractor_id) {
      const { data: existing } = await supabase
        .from("contractors").select("id, slug, business_name").eq("id", landing.published_contractor_id).maybeSingle();
      return new Response(JSON.stringify({ paid: true, published: true, contractor: existing }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const planCode = (session.metadata?.plan_code as string) ?? landing.checkout_plan_code ?? "pro";

    // Fetch company + lead + latest score
    const { data: company } = await supabase
      .from("outbound_companies").select("*").eq("id", landing.company_id).maybeSingle();
    const { data: scoreRow } = await supabase
      .from("outbound_ai_scores").select("*").eq("lead_id", landing.lead_id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    if (!company) throw new Error("Compagnie introuvable");

    // Build a deterministic contractor slug
    const baseSlug = company.company_slug || slugify(company.company_name);
    const contractorSlug = `${baseSlug}-${(company.city || "qc").toLowerCase().replace(/[^a-z0-9]/g, "")}`.slice(0, 80);

    // Upsert contractor — match on phone+business_name or NEQ
    let contractorId: string | null = null;

    const { data: matchByNeq } = company.neq_number
      ? await supabase.from("contractors").select("id").eq("neq", company.neq_number).maybeSingle()
      : { data: null };
    if (matchByNeq) contractorId = matchByNeq.id;

    if (!contractorId) {
      const { data: matchByName } = await supabase.from("contractors")
        .select("id").eq("business_name", company.company_name).maybeSingle();
      if (matchByName) contractorId = matchByName.id;
    }

    const aippTotal = (scoreRow?.score_json as any)?.total ?? 0;

    if (contractorId) {
      // Update existing
      await supabase.from("contractors").update({
        phone: company.phone || undefined,
        website: company.website_url || undefined,
        city: company.city || undefined,
        address: company.address || undefined,
        rbq_number: company.rbq_number || undefined,
        neq: company.neq_number || undefined,
        aipp_score: aippTotal,
        review_count: company.review_count || 0,
        rating: company.google_rating || 0,
        specialty: company.specialty || company.trade || undefined,
        verification_status: "verified",
        admin_verified: true,
        verified_at: new Date().toISOString(),
        booking_enabled: true,
        booking_page_published: true,
      }).eq("id", contractorId);
    } else {
      // Create with a placeholder user_id (orphan profile, magic-link claims it later)
      const placeholderUserId = crypto.randomUUID();
      const { data: created, error: createErr } = await supabase.from("contractors").insert({
        user_id: placeholderUserId,
        business_name: company.company_name,
        legal_name: company.company_name,
        phone: company.phone,
        website: company.website_url,
        city: company.city,
        province: "QC",
        address: company.address,
        rbq_number: company.rbq_number,
        neq: company.neq_number,
        aipp_score: aippTotal,
        review_count: company.review_count || 0,
        rating: company.google_rating || 0,
        specialty: company.specialty || company.trade,
        slug: contractorSlug,
        verification_status: "verified",
        admin_verified: true,
        verified_at: new Date().toISOString(),
        booking_enabled: true,
        booking_page_published: true,
        email: company.email,
      }).select("id").single();
      if (createErr) throw createErr;
      contractorId = created.id;
    }

    // Update landing
    await supabase.from("outbound_landing_pages").update({
      paid_at: new Date().toISOString(),
      publish_status: "published",
      published_contractor_id: contractorId,
      aipp_score_snapshot: scoreRow?.score_json ?? null,
    }).eq("id", landing.id);

    // Update lead
    if (landing.lead_id) {
      await supabase.from("outbound_leads").update({
        paid_at: new Date().toISOString(),
        checkout_session_id: session_id,
        checkout_plan_code: planCode,
        published_contractor_id: contractorId,
        publish_status: "published",
        converted_at: new Date().toISOString(),
        crm_status: "converted",
        pipeline_stage: "won",
      }).eq("id", landing.lead_id);

      await supabase.from("outbound_events").insert([
        { lead_id: landing.lead_id, event_type: "paid", event_value: planCode, event_payload: { session_id, contractor_id: contractorId } },
        { lead_id: landing.lead_id, event_type: "published", event_value: contractorSlug, event_payload: { contractor_id: contractorId } },
      ]);
    }

    // Try to send welcome email via existing transactional pipeline (non-blocking)
    if (company.email) {
      try {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            to: company.email,
            template: "contractor_welcome",
            subject: "Bienvenue chez UNPRO — votre profil est en ligne",
            data: {
              business_name: company.company_name,
              plan_code: planCode,
              aipp_score: aippTotal,
              profile_url: `https://unpro.ca/entrepreneur/${contractorSlug}`,
              onboarding_url: `https://app.unpro.ca/entrepreneur/onboarding?source=outbound&lead=${landing.lead_id}`,
            },
          },
        });
      } catch (e) {
        console.warn("[welcome email] non-blocking failure", e);
      }
    }

    const { data: contractor } = await supabase
      .from("contractors").select("id, slug, business_name").eq("id", contractorId).maybeSingle();

    return new Response(JSON.stringify({ paid: true, published: true, contractor }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[outbound-checkout-verify]", e);
    return new Response(JSON.stringify({ error: e.message ?? "Erreur" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
