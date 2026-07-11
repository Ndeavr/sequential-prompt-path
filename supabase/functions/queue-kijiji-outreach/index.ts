// UNPRO — Queue Kijiji prospects into existing outreach pipeline.
// Applies eligibility gates, quiet hours, suppression, template selection.

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
  const bucket: string = body.bucket ?? "P0"; // P0, P1, P2, P3
  const limit: number = Math.min(body.limit ?? 25, 200);
  const dryRun: boolean = !!body.dry_run;

  // Source config for daily cap
  const { data: source } = await sb.from("scraping_sources")
    .select("config").eq("source_key", "kijiji_services").single();
  const maxDaily = (source?.config as any)?.max_sms_queue_per_day ?? 200;

  // Today's queue count already sent from kijiji
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const { count: sentToday } = await sb.from("contractor_outreach_logs")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startOfDay.toISOString())
    .contains("metadata", { source_key: "kijiji_services" });

  if ((sentToday ?? 0) >= maxDaily) {
    return json({ success: false, reason: "daily_cap_reached", sent_today: sentToday, cap: maxDaily });
  }

  const remaining = maxDaily - (sentToday ?? 0);
  const take = Math.min(limit, remaining);

  // Score threshold per bucket
  const scoreMin =
    bucket === "P0" ? 80 :
    bucket === "P1" ? 65 :
    bucket === "P2" ? 65 : 50;

  const requireMobile = bucket === "P0" || bucket === "P1";

  let q = sb.from("contractor_prospects").select("*")
    .eq("source_key", "kijiji_services")
    .eq("outreach_eligibility", requireMobile ? "sms_ready" : "email_only")
    .gte("acquisition_score", scoreMin)
    .gte("classification_confidence", 0.8)
    .is("rejection_reason", null)
    .order("acquisition_score", { ascending: false })
    .limit(take);

  const { data: prospects, error } = await q;
  if (error) return json({ success: false, error: error.message }, 500);

  // Load winning template (Kijiji-scoped)
  const { data: templates } = await sb.from("outreach_templates")
    .select("*")
    .contains("metadata", { source: "kijiji" })
    .eq("is_active", true);

  const winner = templates?.find((t: any) => t.metadata?.is_winner) ?? templates?.[0];
  const variants = templates ?? [];

  const queued: any[] = [];
  const skipped: any[] = [];

  for (const p of prospects ?? []) {
    // Suppression check
    const { data: sup } = await sb.from("outreach_suppressions")
      .select("id").or(`phone.eq.${p.phone},email.eq.${p.email ?? ""}`).limit(1);
    if (sup && sup.length) { skipped.push({ id: p.id, reason: "suppressed" }); continue; }

    // Already contacted?
    const { data: prior } = await sb.from("contractor_outreach_logs")
      .select("id").eq("phone", p.phone).limit(1);
    if (prior && prior.length) { skipped.push({ id: p.id, reason: "already_contacted" }); continue; }

    // Assign variant (80% winner / 10% B / 10% C, or round-robin if no winner)
    const template = pickVariant(variants, winner);
    if (!template) { skipped.push({ id: p.id, reason: "no_template" }); continue; }

    const rendered = renderTemplate(template.body ?? template.content, {
      first_name_or_business: p.business_name || "bonjour",
      service: humanCategory(p.category_slug),
      city: p.city ?? "votre secteur",
      tracked_link: `https://unpro.ca/r/${p.id}?src=kijiji&v=${template.id}`,
    });

    if (dryRun) {
      queued.push({ id: p.id, variant: template.id, message_preview: rendered.slice(0, 120) });
      continue;
    }

    await sb.from("contractor_outreach_logs").insert({
      contractor_id: null,
      phone: p.phone,
      email: p.email,
      channel: requireMobile ? "sms" : "email",
      status: "queued",
      message_body: rendered,
      template_id: template.id,
      metadata: {
        source_key: "kijiji_services",
        source_priority: 90,
        bucket,
        prospect_id: p.id,
        variant: template.metadata?.variant ?? "A",
        acquisition_score: p.acquisition_score,
      },
    });

    queued.push({ id: p.id, variant: template.id, bucket });
  }

  return json({
    success: true,
    bucket,
    queued: queued.length,
    skipped: skipped.length,
    dry_run: dryRun,
    detail: { queued, skipped },
  });
});

function pickVariant(templates: any[], winner: any): any | null {
  if (!templates.length) return null;
  const r = Math.random();
  if (winner && r < 0.8) return winner;
  const others = templates.filter(t => t.id !== winner?.id);
  return others[Math.floor(Math.random() * others.length)] ?? winner;
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
