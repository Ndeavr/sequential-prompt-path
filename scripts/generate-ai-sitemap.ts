/**
 * UNPRO — AI Sitemap generator
 * Generates public/ai-sitemap.xml listing all published /ai/:slug pages.
 * Run via: bunx tsx scripts/generate-ai-sitemap.ts
 */
import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://unpro.ca";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

async function main() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("[ai-sitemap] SUPABASE env missing — writing empty sitemap");
    write([]);
    return;
  }
  const url = `${SUPABASE_URL}/rest/v1/ai_entities?select=slug,updated_at&published=eq.true&order=updated_at.desc`;
  try {
    const r = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const rows: { slug: string; updated_at: string }[] = await r.json();
    write(rows);
    console.log(`[ai-sitemap] wrote ${rows.length} entries`);
  } catch (e) {
    console.warn(`[ai-sitemap] fetch failed: ${e instanceof Error ? e.message : e}`);
    write([]);
  }
}

function write(rows: { slug: string; updated_at: string }[]) {
  const urls = rows.map((r) => `  <url>
    <loc>${BASE_URL}/ai/${r.slug}</loc>
    <lastmod>${new Date(r.updated_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
  writeFileSync(resolve("public/ai-sitemap.xml"), xml);
}

main();
