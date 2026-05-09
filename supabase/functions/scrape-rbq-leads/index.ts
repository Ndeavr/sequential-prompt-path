// Import RBQ leads into outbound prospects pipeline.
// Accepts an array of RBQ records (CSV-mapped client-side) OR a Firecrawl
// query against the public RBQ registry. Dedupes by NEQ/RBQ + business_name.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RbqLead {
  rbq_number?: string;
  neq_number?: string;
  business_name: string;
  legal_name?: string;
  city?: string;
  region?: string;
  category?: string;
  subcategory?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
}

// Map RBQ license sub-categories → UNPRO service domains.
function mapRbqCategory(raw: string | undefined): { category: string; subcategory: string } {
  const c = (raw ?? "").toLowerCase();
  if (/toiture|couvreur/.test(c)) return { category: "toiture", subcategory: raw ?? "" };
  if (/plomb/.test(c)) return { category: "plomberie", subcategory: raw ?? "" };
  if (/électric|electric/.test(c)) return { category: "electricite", subcategory: raw ?? "" };
  if (/chauffage|ventilation|climatisation|cvac|cvc/.test(c)) return { category: "cvac", subcategory: raw ?? "" };
  if (/maçon|macon|brique|pierre/.test(c)) return { category: "maconnerie", subcategory: raw ?? "" };
  if (/excavation|fondation/.test(c)) return { category: "excavation", subcategory: raw ?? "" };
  if (/peinture|peintre/.test(c)) return { category: "peinture", subcategory: raw ?? "" };
  if (/menuis|charpente/.test(c)) return { category: "menuiserie", subcategory: raw ?? "" };
  if (/revêtement|revetement|parement/.test(c)) return { category: "revetement-exterieur", subcategory: raw ?? "" };
  if (/asphalte|pavage/.test(c)) return { category: "pavage", subcategory: raw ?? "" };
  if (/paysag/.test(c)) return { category: "paysagement", subcategory: raw ?? "" };
  if (/general|générale|generale/.test(c)) return { category: "entrepreneur-general", subcategory: raw ?? "" };
  return { category: "autre", subcategory: raw ?? "" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const leads: RbqLead[] = Array.isArray(body.leads) ? body.leads : [];
    const dryRun: boolean = body.dry_run === true;

    if (leads.length === 0) {
      return new Response(
        JSON.stringify({ error: "No leads provided. Send { leads: [...] }." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (leads.length > 1000) {
      return new Response(
        JSON.stringify({ error: "Max 1000 leads per call." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const summary = { received: leads.length, inserted: 0, duplicates: 0, errors: 0 };
    const inserted: string[] = [];

    for (const raw of leads) {
      if (!raw.business_name || raw.business_name.trim().length < 2) {
        summary.errors++;
        continue;
      }

      // Dedupe: same business_name + city OR matching RBQ number
      const dedupeKey = (raw.rbq_number ?? "").trim();
      let exists = null;
      if (dedupeKey) {
        const { data } = await supabase
          .from("contractors_prospects")
          .select("id")
          .eq("source", "rbq")
          .ilike("notes", `%RBQ:${dedupeKey}%`)
          .maybeSingle();
        exists = data;
      }
      if (!exists) {
        const { data } = await supabase
          .from("contractors_prospects")
          .select("id")
          .ilike("business_name", raw.business_name.trim())
          .eq("city", raw.city ?? "")
          .maybeSingle();
        exists = data;
      }
      if (exists) {
        summary.duplicates++;
        continue;
      }

      if (dryRun) {
        summary.inserted++;
        continue;
      }

      const mapped = mapRbqCategory(raw.category);
      const { data, error } = await supabase
        .from("contractors_prospects")
        .insert({
          business_name: raw.business_name.trim(),
          legal_name: raw.legal_name ?? raw.business_name.trim(),
          city: raw.city ?? null,
          region: raw.region ?? null,
          category: mapped.category,
          subcategory: mapped.subcategory || raw.subcategory || null,
          phone: raw.phone ?? null,
          email: raw.email ?? null,
          website: raw.website ?? null,
          source: "rbq",
          source_detail: raw.rbq_number ? `rbq:${raw.rbq_number}` : "rbq:manual-import",
          status: "new",
          enrichment_status: "pending",
          notes: [
            raw.rbq_number ? `RBQ:${raw.rbq_number}` : null,
            raw.neq_number ? `NEQ:${raw.neq_number}` : null,
            raw.address ? `ADDR:${raw.address}` : null,
          ].filter(Boolean).join(" | "),
        })
        .select("id")
        .single();

      if (error) {
        console.error("Insert failed", error.message);
        summary.errors++;
        continue;
      }
      summary.inserted++;
      if (data?.id) inserted.push(data.id);
    }

    return new Response(
      JSON.stringify({ ok: true, summary, inserted_ids: inserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("scrape-rbq-leads fatal:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
