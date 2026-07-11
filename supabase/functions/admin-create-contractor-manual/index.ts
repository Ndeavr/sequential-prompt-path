// Admin-only: create a manual contractor profile, activate plan for 1 year, publish public page.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

interface Body {
  business_name: string;
  legal_name?: string | null;
  phone: string;
  email?: string | null;
  website?: string | null;
  city: string;
  service_areas?: string[];
  languages?: string[];
  years_experience?: number | null;
  tps_number?: string | null;
  tvq_number?: string | null;
  rbq_number?: string | null;
  neq?: string | null;
  categories?: string[];
  logo_url?: string | null;
  portfolio_urls?: string[];
  cover_url?: string | null;
  short_bio?: string | null;
  premium_bio?: string | null;
  why_choose_us?: string | null;
  warranty?: string | null;
  avg_lead_time?: string | null;
  free_quote?: boolean;
  aipp_score?: number;
  aipp_badge?: string | null;
  plan_code: string;
  plan_amount_cents: number;
  amount_paid_cents?: number;
  duration_months?: number; // 1, 3, 6, 12
  activation_note?: string | null;
  // toggles
  visible_public?: boolean;
  receives_leads?: boolean;
  priority_match?: boolean;
  priority_matching?: "normal" | "elevated" | "exclusive";
  can_be_matched?: boolean;
  unpro_verified?: boolean;
  badge_premium?: boolean;
  admin_confirmed?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Body;
    if (!body?.business_name || !body?.phone || !body?.city || !body?.plan_code) {
      return new Response(
        JSON.stringify({ error: "business_name, phone, city, plan_code are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!body.admin_confirmed) {
      return new Response(
        JSON.stringify({ error: "Admin confirmation required (paiement vérifié)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Resolve plan from plan_catalog
    const { data: plan, error: planErr } = await admin
      .from("plan_catalog")
      .select("id, code, name, monthly_price")
      .eq("code", body.plan_code)
      .maybeSingle();
    if (planErr) throw planErr;
    if (!plan) {
      return new Response(JSON.stringify({ error: `Unknown plan_code: ${body.plan_code}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build a unique slug
    const baseSlug = slugify(body.business_name);
    let slug = baseSlug || `pro-${Date.now()}`;
    for (let i = 0; i < 25; i++) {
      const { data: existing } = await admin
        .from("contractors")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!existing) break;
      slug = `${baseSlug}-${i + 2}`;
    }

    // Manual contractors have no auth user yet — synthesize a stable UUID
    const placeholderUserId = crypto.randomUUID();

    const aipp = typeof body.aipp_score === "number" ? Math.round(body.aipp_score) : 0;

    // Insert contractor
    const { data: contractor, error: insertErr } = await admin
      .from("contractors")
      .insert({
        user_id: placeholderUserId,
        business_name: body.business_name,
        legal_name: body.legal_name ?? null,
        phone: body.phone,
        email: body.email ?? null,
        website: body.website ?? null,
        city: body.city,
        province: "QC",
        years_experience: body.years_experience ?? null,
        rbq_number: body.rbq_number ?? null,
        neq: body.neq ?? null,
        specialty: (body.categories ?? []).join(", ") || null,
        description: body.premium_bio || body.short_bio || null,
        logo_url: body.logo_url ?? null,
        portfolio_urls: body.portfolio_urls ?? [],
        slug,
        verification_status: body.unpro_verified ? "verified" : "pending",
        admin_verified: !!body.unpro_verified,
        verified_at: body.unpro_verified ? new Date().toISOString() : null,
        verification_notes: "Activation manuelle UNPRO",
        aipp_score: aipp,
        is_published: !!body.visible_public,
        is_discoverable: !!body.visible_public,
        is_accepting_appointments: body.receives_leads ?? true,
        published_at: body.visible_public ? new Date().toISOString() : null,
        account_status: "active",
        onboarding_status: "completed",
        activation_status: "active",
        recommended_plan_id: plan.code,
        admin_note: "Créé manuellement via PageAdminCreateContractorManual",
      })
      .select()
      .single();
    if (insertErr) throw insertErr;

    // Compute duration and expiry
    const now = new Date();
    const durationMonths = body.duration_months ?? 12;
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + durationMonths);

    const amountPaidCents = body.amount_paid_cents ?? body.plan_amount_cents ?? plan.monthly_price ?? 0;
    const priorityMatching = body.priority_matching
      ?? (body.priority_match ? "elevated" : "normal");
    const canBeMatched = body.can_be_matched ?? body.receives_leads ?? true;

    // Rollback wrapper: if any post-contractor step fails, delete the contractor to avoid orphans.
    try {
      // Atomic finalize: subscription + entitlements + matching_status + audit log in one plpgsql transaction.
      const { data: finalizeResult, error: finalizeErr } = await admin.rpc(
        "admin_activate_contractor_finalize",
        {
          p_contractor_id: contractor.id,
          p_admin_user_id: user.id,
          p_plan_code: plan.code,
          p_amount_paid_cents: amountPaidCents,
          p_currency: "CAD",
          p_starts_at: now.toISOString(),
          p_expires_at: expiresAt.toISOString(),
          p_payment_method: "manual",
          p_activation_note: body.activation_note ?? `Payé ${durationMonths} mois — activation manuelle`,
          p_visible_public: !!body.visible_public,
          p_receives_appointments: body.receives_leads ?? true,
          p_can_be_matched: canBeMatched,
          p_priority_matching: priorityMatching,
          p_unpro_verified: !!body.unpro_verified,
          p_premium_badge: !!body.badge_premium,
        },
      );
      if (finalizeErr) throw finalizeErr;

      // Best-effort override (legacy compat)
      await admin.from("admin_activation_overrides").insert({
        contractor_id: contractor.id,
        subscription_id: finalizeResult?.subscription_id ?? null,
        override_type: "full_discount",
        override_value: 100,
        reason: "Paiement manuel reçu — activation manuelle",
        starts_at: now.toISOString(),
        ends_at: expiresAt.toISOString(),
        created_by_admin_id: user.id,
        is_active: true,
      });

      // Manual payment audit row
      await admin.from("manual_contractor_activations").insert({
        contractor_id: contractor.id,
        admin_user_id: user.id,
        plan_code: plan.code,
        plan_amount_cents: amountPaidCents,
        paid_date: now.toISOString(),
        expiry_date: expiresAt.toISOString(),
        payment_method: "manuel",
        note: body.activation_note ?? `Payé ${durationMonths} mois`,
        payload_json: {
          duration_months: durationMonths,
          toggles: {
            visible_public: !!body.visible_public,
            receives_leads: !!body.receives_leads,
            can_be_matched: canBeMatched,
            priority_matching: priorityMatching,
            unpro_verified: !!body.unpro_verified,
            badge_premium: !!body.badge_premium,
          },
          aipp_score: aipp,
          aipp_badge: body.aipp_badge ?? null,
        },
      });

      // Bind sub for legacy code paths below
      var sub = { id: finalizeResult?.subscription_id };
      var oneYearFromNow = expiresAt;
    } catch (activationErr) {
      // Rollback: remove partially-activated contractor
      await admin.from("contractors").delete().eq("id", contractor.id);
      await admin.from("admin_activation_logs").insert({
        contractor_id: contractor.id,
        admin_user_id: user.id,
        action: "admin_activate_contractor",
        status: "rollback",
        error_message: activationErr instanceof Error ? activationErr.message : String(activationErr),
      });
      throw activationErr;
    }

    // Public page record
    await admin.from("contractor_public_pages").insert({
      contractor_id: contractor.id,
      slug,
      is_published: !!body.visible_public,
      published_at: body.visible_public ? now.toISOString() : null,
      seo_title: `${body.business_name} — UNPRO`,
      seo_description: body.short_bio || `Profil UNPRO de ${body.business_name}, ${body.city}.`,
      canonical_url: `https://www.unpro.ca/pro/${slug}`,
      og_image_url: body.cover_url ?? body.logo_url ?? null,
      custom_sections: {
        why_choose_us: body.why_choose_us ?? null,
        warranty: body.warranty ?? null,
        avg_lead_time: body.avg_lead_time ?? null,
        free_quote: body.free_quote ?? true,
        languages: body.languages ?? ["Français"],
        service_areas: body.service_areas ?? [],
        categories: body.categories ?? [],
        cover_url: body.cover_url ?? null,
      },
    });

    // AIPP score row
    if (aipp > 0) {
      // Make any older row not current
      await admin
        .from("contractor_aipp_scores")
        .update({ is_current: false })
        .eq("contractor_id", contractor.id);

      await admin.from("contractor_aipp_scores").insert({
        contractor_id: contractor.id,
        total_score: aipp,
        tier: body.aipp_badge ?? (aipp >= 85 ? "PRO EXPÉRIMENTÉ" : aipp >= 70 ? "PRO VÉRIFIÉ" : "ACTIF"),
        score_confidence: 80,
        is_current: true,
        breakdown_json: {
          source: "manual_activation",
          weights: {
            experience: 18, branding: 12, clarity: 10, trust: 14,
            photos: 10, niche: 12, conversion: 12, availability: 12,
          },
        },
      });
    }

    // Plan event
    await admin.from("contractor_plan_events").insert({
      contractor_id: contractor.id,
      event_type: "manual_activation",
      payload_json: {
        plan_code: plan.code,
        amount_cents: body.plan_amount_cents ?? plan.monthly_price ?? 0,
        paid_date: now.toISOString(),
        expiry_date: oneYearFromNow.toISOString(),
        admin_user_id: user.id,
      },
    }).select().maybeSingle().then(() => {}, () => {}); // best-effort

    // System event
    await admin.from("system_events").insert({
      event_type: "contractor.manual_activation",
      payload_json: {
        contractor_id: contractor.id,
        slug,
        plan_code: plan.code,
        admin_user_id: user.id,
      },
    }).select().maybeSingle().then(() => {}, () => {}); // best-effort

    return new Response(
      JSON.stringify({
        ok: true,
        contractor_id: contractor.id,
        slug,
        public_url: `/pro/${slug}`,
        subscription_id: sub.id,
        plan: { code: plan.code, name: plan.name },
        expiry_date: oneYearFromNow.toISOString(),
        duration_months: durationMonths,
        amount_paid_cents: amountPaidCents,
        payment_method: "manual",
        payment_status: "paid",
        can_be_matched: canBeMatched,
        priority_matching: priorityMatching,
        public_profile_enabled: !!body.visible_public,
        can_receive_appointments: body.receives_leads ?? true,
        aipp_score: aipp,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("admin-create-contractor-manual error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
