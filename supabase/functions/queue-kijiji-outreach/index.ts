// UNPRO — Queue Kijiji prospects into existing outreach pipeline.
// Creates contractor_leads row + contractor_outreach_logs entry per eligible prospect.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
  const body = await req.json().catch(() => ({}));
  const bucket: string = body.bucket ?? "P0";
  const limit: number = Math.min(body.limit ?? 25, 200);
  const dryRun: boolean = !!body.dry_run;

  const { data: source } = await sb.from("scraping_sources")
    .select("config").eq("source_key", "kijiji_services").single();
  const maxDaily = (source?.config as any)?.max_sms_queue_per_day ?? 200;

  // Today's sends already attributed to Kijiji
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const { count: sentToday } = await sb.from("contractor_outreach_logs")
    .select("id", { count: "exact", head: true })
    .gte("sent_at", startOfDay.toISOString())
    .like("template_key", "kijiji_%");

  if ((sentToday ?? 0) >= maxDaily) {
    return json({ success: false, reason: "daily_cap_reached", sent_today: sentToday, cap: maxDaily });
  }
  const remaining = maxDaily - (sentToday ?? 0);
  const take = Math.min(limit, remaining);

  const scoreMin =
    bucket === "P0" ? 80 :
    bucket === "P1" ? 65 :
    bucket === "P2" ? 65 : 50;
  const requireMobile = bucket === "P0" || bucket === "P1";
  const eligibilityFilter = requireMobile ? "sms_ready" : "email_only";

  const { data: prospects, error } = await sb.from("contractor_prospects").select("*")
    .eq("source_key", "kijiji_services")
    .eq("outreach_eligibility", eligibilityFilter)
    .gte("acquisition_score", scoreMin)
    .gte("classification_confidence", 0.8)
    .is("rejection_reason", null)
    .order("acquisition_score", { ascending: false })
    .limit(take);
  if (error) return json({ success: false, error: error.message }, 500);

  // Load Kijiji templates
  const { data: templates } = await sb.from("outreach_templates")
    .select("*")
    .like("template_name", "kijiji_variant_%");
  const variants = (templates ?? []) as any[];
  if (!variants.length) {
    return json({ success: false, reason: "no_kijiji_templates_seeded" });
  }

  const queued: any[] = [];
  const skipped: any[] = [];

  for (const p of prospects ?? []) {
    // Suppression check
    const values = [p.phone, p.email].filter(Boolean);
    if (values.length) {
      const { data: sup } = await sb.from("outreach_suppressions")
        .select("id").in("contact_value", values).limit(1);
      if (sup && sup.length) { skipped.push({ id: p.id, reason: "suppressed" }); continue; }
    }

    // Already contacted?
    const { data: prior } = await sb.from("contractor_outreach_logs")
      .select("id").eq("to_address", requireMobile ? p.phone : (p.email ?? "")).limit(1);
    if (prior && prior.length) { skipped.push({ id: p.id, reason: "already_contacted" }); continue; }

    const template = pickVariant(variants, p.website);
    const bodyTpl: string = template.body_template ?? "";
    const rendered = renderTemplate(bodyTpl, {
      first_name_or_business: p.business_name || "bonjour",
      service: humanCategory(p.category_slug),
      city: p.city ?? "votre secteur",
      tracked_link: `https://unpro.ca/r/${p.id}?src=kijiji&v=${template.template_name}`,
    });

    if (dryRun) {
      queued.push({ id: p.id, variant: template.template_name, message_preview: rendered.slice(0, 140) });
      continue;
    }

    // Create lead row (idempotent by phone_e164)
    const leadInsert = await sb.from("contractor_leads").insert({
      source_type: "kijiji_services",
      company_name: p.business_name,
      phone_e164: p.phone,
      email: p.email,
      city: p.city,
      trade_slug: p.category_slug,
      outreach_status: "queued",
      contact_method: requireMobile ? "sms" : "email",
      metadata: {
        source_key: "kijiji_services",
        source_priority: 90,
        acquisition_score: p.acquisition_score,
        bucket,
        prospect_id: p.id,
        variant: template.template_name,
        priority_reason: p.priority_reason ?? [],
      },
    }).select("id").single();
    if (leadInsert.error) {
      // Duplicate lead — link to existing
      const { data: existing } = await sb.from("contractor_leads").select("id")
        .eq("phone_e164", p.phone ?? "").limit(1).maybeSingle();
      if (!existing) { skipped.push({ id: p.id, reason: leadInsert.error.message }); continue; }
      leadInsert.data = existing as any;
    }

    await sb.from("contractor_outreach_logs").insert({
      lead_id: leadInsert.data!.id,
      channel: requireMobile ? "sms" : "email",
      template_key: template.template_name,
      to_address: requireMobile ? p.phone! : p.email!,
      message_body: rendered,
      status: "queued",
      cta_urls: [`https://unpro.ca/r/${p.id}?src=kijiji`],
      has_tracked_cta: true,
      raw_template: { source: "kijiji", variant: template.template_name },
    });

    queued.push({ id: p.id, variant: template.template_name, bucket });
  }

  return json({
    success: true, bucket, queued: queued.length, skipped: skipped.length,
    dry_run: dryRun, detail: { queued, skipped },
  });
});

function pickVariant(variants: any[], hasWebsite: string | null): any {
  // Variant D reserved for "no website" prospects
  const noWebsite = variants.find(v => v.template_name === "kijiji_variant_d");
  if (!hasWebsite && noWebsite) return noWebsite;
  const eligible = variants.filter(v => v.template_name !== "kijiji_variant_d");
  return eligible[Math.floor(Math.random() * eligible.length)] ?? variants[0];
}

function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

function humanCategory(slug: string | null): string {
  const map: Record<string, string> = {
    roofing: "toiture", insulation: "isolation", hvac: "chauffage/climatisation",
    plumbing: "plomberie", electrical: "électricité", foundation: "fondation",
    waterproofing: "imperméabilisation", mold_remediation: "décontamination",
    windows_doors: "portes et fenêtres", pest_control: "extermination",
    landscaping: "aménagement paysager", moving: "déménagement",
    cleaning: "entretien ménager", renovation: "rénovation",
    painting: "peinture", flooring: "plancher", kitchen_bath: "cuisine et salle de bain",
    locksmith: "serrurerie", masonry: "maçonnerie", snow_removal: "déneigement",
    pool_spa: "piscine et spa", fence_deck: "clôture et terrasse",
    junk_removal: "débarras", chimney: "cheminée", septic_well: "fosse septique",
    inspection: "inspection", restoration: "après-sinistre", gutters: "gouttières",
  };
  return slug && map[slug] ? map[slug] : (slug ?? "services résidentiels");
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
