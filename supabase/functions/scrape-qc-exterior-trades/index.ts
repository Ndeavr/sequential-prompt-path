// UNPRO — QC Exterior Trades Scraper
// Daily cron: scrapes 10 trades x 5 cities, dedupes, scores, inserts into contractor_prospects
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TRADES = [
  { key: "roofing", fr: "Couvreurs toiture", avg: 8500 },
  { key: "pavers", fr: "Pavé uni", avg: 6200 },
  { key: "asphalt", fr: "Asphalte pavage", avg: 4800 },
  { key: "landscaping", fr: "Aménagement paysager", avg: 3500 },
  { key: "snow_removal", fr: "Déneigement", avg: 2200 },
  { key: "fences", fr: "Clôtures", avg: 3800 },
  { key: "decks", fr: "Terrasses", avg: 7500 },
  { key: "foundation", fr: "Fondations drain français", avg: 9500 },
  { key: "gutters", fr: "Gouttières", avg: 1800 },
  { key: "exterior_painting", fr: "Peinture extérieure", avg: 4200 },
] as const;

const CITIES = ["Laval", "Montréal", "Longueuil", "Brossard", "Repentigny"];
const QC_AREA_CODES = new Set(["438", "450", "514", "579", "581", "819", "873"]);
const PLACEHOLDERS = ["test", "n/a", "unknown", "exemple"];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function normalizeName(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "").slice(0, 60);
}
function normalizePhone(p: string | null) {
  if (!p) return "";
  return p.replace(/\D/g, "").slice(-10);
}
function isQcPhone(p: string | null) {
  const d = normalizePhone(p);
  return d.length === 10 && QC_AREA_CODES.has(d.slice(0, 3));
}
function formatPhone(p: string) {
  const d = normalizePhone(p);
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

async function firecrawlSearch(query: string): Promise<any[]> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) return [];
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit: 10, country: "ca", lang: "fr", scrapeOptions: { formats: ["markdown"] } }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data ?? data.web?.results ?? [];
  } catch { return []; }
}

// Extract company name + phone + website from markdown blob (heuristic)
function extractRecords(markdown: string, source: string) {
  const out: any[] = [];
  if (!markdown) return out;
  const phoneRegex = /(?:\+?1[-. ]?)?\(?(\d{3})\)?[-. ]?(\d{3})[-. ]?(\d{4})/g;
  const lines = markdown.split("\n").filter((l) => l.trim());
  let lastName = "";
  for (const line of lines) {
    const trimmed = line.replace(/[#*_>`-]+/g, "").trim();
    if (trimmed.length > 4 && trimmed.length < 80 && /^[A-ZÉÈÀÇ]/.test(trimmed) && !trimmed.includes("http")) {
      lastName = trimmed.split("|")[0].split("•")[0].trim();
    }
    let m: RegExpExecArray | null;
    phoneRegex.lastIndex = 0;
    while ((m = phoneRegex.exec(line)) !== null) {
      const code = m[1];
      if (!QC_AREA_CODES.has(code)) continue;
      const phone = `${code}${m[2]}${m[3]}`;
      if (lastName && lastName.length >= 3) {
        out.push({ company_name: lastName, phone, source });
      }
    }
  }
  return out;
}

async function scrapeTradeCity(trade: typeof TRADES[number], city: string) {
  const queries = [
    `${trade.fr} ${city} QC site:pagesjaunes.ca`,
    `${trade.fr} ${city} Québec site:canada411.ca`,
  ];
  const results: any[] = [];
  for (const q of queries) {
    const r = await firecrawlSearch(q);
    for (const item of r.slice(0, 5)) {
      const md = item.markdown || item.content || "";
      const src = item.url?.includes("canada411") ? "canada411" : item.url?.includes("pagesjaunes") ? "pagesjaunes" : "web";
      results.push(...extractRecords(md, src));
    }
    await sleep(2000);
  }
  return results.map((r) => ({
    ...r,
    trade_category: trade.key,
    avg_job_value_cad: trade.avg,
    city,
    province: "QC",
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const url = new URL(req.url);
  const tradeFilter = url.searchParams.get("trade");
  const limit = Number(url.searchParams.get("limit") ?? 200);

  const tradesToRun = tradeFilter ? TRADES.filter((t) => t.key === tradeFilter) : TRADES;
  const summary: Record<string, any> = { trades: {}, total: 0, inserted: 0, dedup_skipped: 0, errors: [] };
  const seen = new Set<string>();

  for (const trade of tradesToRun) {
    summary.trades[trade.key] = { found: 0, inserted: 0 };
    for (const city of CITIES) {
      try {
        const records = await scrapeTradeCity(trade, city);
        summary.trades[trade.key].found += records.length;
        summary.total += records.length;

        for (const rec of records) {
          if (summary.inserted >= limit) break;
          if (!isQcPhone(rec.phone)) continue;
          if (rec.company_name.length < 3) continue;
          if (PLACEHOLDERS.some((p) => rec.company_name.toLowerCase().includes(p))) continue;

          const key = `${normalizeName(rec.company_name)}_${normalizePhone(rec.phone)}`;
          if (seen.has(key)) { summary.dedup_skipped++; continue; }
          seen.add(key);

          // Check existing
          const { data: existing } = await supabase
            .from("contractor_prospects")
            .select("id")
            .eq("phone", formatPhone(rec.phone))
            .maybeSingle();
          if (existing) { summary.dedup_skipped++; continue; }

          const { error } = await supabase.from("contractor_prospects").insert({
            business_name: rec.company_name,
            phone: formatPhone(rec.phone),
            city: rec.city,
            province: "QC",
            trade_category: rec.trade_category,
            avg_job_value_cad: rec.avg_job_value_cad,
            source_name: rec.source,
            enrichment_status: "pending",
            extraction_confidence: 0.7,
          });
          if (error) {
            summary.errors.push(`${rec.company_name}: ${error.message}`);
          } else {
            summary.inserted++;
            summary.trades[trade.key].inserted++;
          }
        }
        if (summary.inserted >= limit) break;
      } catch (e) {
        summary.errors.push(`${trade.key}/${city}: ${(e as Error).message}`);
      }
    }
    if (summary.inserted >= limit) break;
  }

  // Log run
  await supabase.from("system_events").insert({
    event_type: "qc_scrape_run",
    payload: summary,
  }).then(() => {}, () => {});

  return new Response(JSON.stringify(summary), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
