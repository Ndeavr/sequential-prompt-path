import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.49.1/cors";

interface TargetInput {
  businessName: string;
  city?: string;
  category?: string;
  websiteUrl?: string;
  phone?: string;
  email?: string;
  rbqNumber?: string;
  neqNumber?: string;
  sourceCampaign?: string;
}

function normalizePhone(raw: string): string {
  return raw.replace(/[\s\-\(\)\.]/g, "").replace(/^\+?1(?=\d{10}$)/, "");
}

function normalizeBusinessName(raw: string): string {
  return raw.trim()
    .replace(/\b(inc|ltée|ltd|enr|senc|s\.e\.n\.c|llc|corp|corporation|cie|compagnie|limitée|limited|société|group|groupe)\b\.?/gi, "")
    .replace(/\s+/g, " ").trim();
}

function normalizeDomain(raw: string): string {
  return raw.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "").toLowerCase().trim();
}

function slugify(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const targets: TargetInput[] = body.targets || [];
    const campaignId: string | null = body.campaignId || null;

    if (!Array.isArray(targets) || targets.length === 0) {
      return new Response(JSON.stringify({ error: "targets array required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (targets.length > 500) {
      return new Response(JSON.stringify({ error: "max 500 targets per batch" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Load existing for dedup
    const { data: existing } = await supabase.from("sniper_targets").select("business_name, city, phone, domain");
    const existingSet = new Set<string>();
    (existing || []).forEach((e: any) => {
      if (e.business_name && e.city) existingSet.add(`${e.business_name.toLowerCase()}|${(e.city || "").toLowerCase()}`);
      if (e.phone) existingSet.add(`phone:${e.phone}`);
      if (e.domain) existingSet.add(`domain:${e.domain}`);
    });

    let imported = 0;
    let skipped = 0;

    for (const t of targets) {
      if (!t.businessName) { skipped++; continue; }

      const normalizedName = normalizeBusinessName(t.businessName);
      const normalizedPhone = t.phone ? normalizePhone(t.phone) : null;
      const domain = t.websiteUrl ? normalizeDomain(t.websiteUrl) : null;
      const city = t.city?.trim() || null;

      // Dedup check
      const nameKey = `${normalizedName.toLowerCase()}|${(city || "").toLowerCase()}`;
      if (existingSet.has(nameKey)) { skipped++; continue; }
      if (normalizedPhone && existingSet.has(`phone:${normalizedPhone}`)) { skipped++; continue; }
      if (domain && existingSet.has(`domain:${domain}`)) { skipped++; continue; }

      const slug = slugify(`${normalizedName} ${city || ""}`);

      const { error } = await supabase.from("sniper_targets").insert({
        business_name: normalizedName,
        city,
        category: t.category || null,
        website_url: t.websiteUrl || null,
        domain,
        phone: normalizedPhone,
        email: t.email || null,
        rbq_number: t.rbqNumber || null,
        neq_number: t.neqNumber || null,
        source_origin: t.sourceCampaign || "csv_import",
        source_campaign_id: campaignId,
        enrichment_status: "pending",
        outreach_status: "not_started",
      });

      if (!error) {
        imported++;
        existingSet.add(nameKey);
        if (normalizedPhone) existingSet.add(`phone:${normalizedPhone}`);
        if (domain) existingSet.add(`domain:${domain}`);
      } else {
        skipped++;
      }
    }

    return new Response(JSON.stringify({ imported, skipped_duplicates: skipped }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
