// UNPRO — Dedupe check across contractor_leads before inserting a new one.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function normPhone(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}
function normDomain(url?: string | null): string | null {
  if (!url) return null;
  try { return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '').toLowerCase(); }
  catch { return null; }
}
function normName(s?: string | null): string | null {
  if (!s) return null;
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { phone, email, website_url, company_name, city } = await req.json();
    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);
    const phoneE164 = normPhone(phone);
    const domain = normDomain(website_url);
    const nameNorm = normName(company_name);

    // Query candidates on any signal
    let query = supa.from('contractor_leads').select(
      'id, company_name, full_name, phone_e164, email, website_url, city, lead_status, assigned_affiliate_id, created_by_affiliate_id, created_at'
    ).limit(20);

    const ors: string[] = [];
    if (phoneE164) ors.push(`phone_e164.eq.${phoneE164}`);
    if (email) ors.push(`email.eq.${email.toLowerCase()}`);
    if (domain) ors.push(`website_url.ilike.%${domain}%`);
    if (ors.length === 0 && nameNorm && city) {
      // Fallback: fuzzy name in same city
      ors.push(`company_name.ilike.%${company_name}%`);
    }
    if (ors.length === 0) {
      return new Response(JSON.stringify({ match: null, candidates: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    query = query.or(ors.join(','));
    const { data, error } = await query;
    if (error) throw error;

    // Score
    const scored = (data ?? []).map((row: any) => {
      let score = 0;
      const reasons: string[] = [];
      if (phoneE164 && row.phone_e164 === phoneE164) { score += 50; reasons.push('phone'); }
      if (email && row.email?.toLowerCase() === email.toLowerCase()) { score += 40; reasons.push('email'); }
      if (domain && row.website_url && normDomain(row.website_url) === domain) { score += 40; reasons.push('domain'); }
      if (nameNorm && normName(row.company_name) === nameNorm) {
        score += 25; reasons.push('name');
        if (city && row.city && normName(row.city) === normName(city)) { score += 10; reasons.push('city'); }
      }
      return { ...row, similarity: score, reasons };
    }).sort((a: any, b: any) => b.similarity - a.similarity);

    const match = scored.find((r: any) => r.similarity >= 40) ?? null;
    return new Response(JSON.stringify({ match, candidates: scored.slice(0, 5) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('lead-dedupe-check fatal', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
