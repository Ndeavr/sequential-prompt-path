// UNPRO — Enrich a lead from a website (Firecrawl) or bare company name/phone.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');

const SYSTEM_PROMPT = `Tu extrais les coordonnées d'entreprise à partir du contenu d'un site web. Réponds STRICTEMENT en JSON:
{
  "company_name": string|null,
  "legal_name": string|null,
  "phone": string|null,
  "email": string|null,
  "website_url": string|null,
  "street_address": string|null,
  "city": string|null,
  "province": string|null,
  "postal_code": string|null,
  "category": string|null,
  "services": string[]|null,
  "service_cities": string[]|null,
  "rbq_number": string|null,
  "neq_number": string|null,
  "google_business_url": string|null,
  "social": { "facebook": string|null, "instagram": string|null, "linkedin": string|null },
  "contacts": [{ "name": string, "role": string|null }],
  "confidence": { "<field>": number 0-1 }
}
Ne rien inventer. Champs non trouvés → null.`;

function normalizeUrl(input: string): string {
  const s = (input || '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  if (/^[\w-]+(\.[\w-]+)+/.test(s)) return `https://${s}`;
  return s;
}

async function firecrawlScrape(url: string) {
  const res = await fetch('https://api.firecrawl.dev/v2/scrape', {
    method: 'POST',
    headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, formats: ['markdown', 'links'], onlyMainContent: false }),
  });
  if (!res.ok) {
    const details = await res.text();
    throw new Error(`firecrawl_${res.status}:${details.slice(0, 200)}`);
  }
  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');
    if (!FIRECRAWL_API_KEY) throw new Error('FIRECRAWL_API_KEY not configured');
    const { input } = await req.json();
    const raw = (input || '').toString().trim();
    if (!raw) return new Response(JSON.stringify({ error: 'input required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

    // Try to interpret as URL first; otherwise treat as company name query and search Google via Firecrawl search.
    let url = normalizeUrl(raw);
    let markdown = '';
    let sourceUrl = '';

    if (/^https?:\/\//i.test(url)) {
      const r = await firecrawlScrape(url);
      markdown = r?.data?.markdown ?? r?.markdown ?? '';
      sourceUrl = url;
    } else {
      // Fallback: Firecrawl search
      const s = await fetch('https://api.firecrawl.dev/v2/search', {
        method: 'POST',
        headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `${raw} entreprise Québec site officiel`, limit: 3, scrapeOptions: { formats: ['markdown'] } }),
      });
      const sj = await s.json();
      const first = (sj?.data ?? [])[0];
      markdown = first?.markdown ?? '';
      sourceUrl = first?.url ?? '';
    }

    if (!markdown) {
      return new Response(JSON.stringify({ ok: false, error: 'no_content_found', sourceUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ai = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Source: ${sourceUrl}\n\nContenu:\n${markdown.slice(0, 15000)}` },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    if (!ai.ok) {
      const details = await ai.text();
      return new Response(JSON.stringify({ error: 'ai_gateway_failed', status: ai.status, details }), {
        status: ai.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const aiJson = await ai.json();
    const content = aiJson?.choices?.[0]?.message?.content ?? '{}';
    let extracted: any = {};
    try { extracted = JSON.parse(content); } catch { extracted = {}; }
    if (!extracted.website_url && /^https?:\/\//i.test(sourceUrl)) extracted.website_url = sourceUrl;

    return new Response(JSON.stringify({ ok: true, extracted, source_url: sourceUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('enrich-lead-from-web fatal', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
