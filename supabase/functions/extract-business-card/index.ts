// UNPRO — Extract structured lead data from a business-card image or PDF using Lovable AI (Gemini vision).
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

interface ExtractedCard {
  company_name?: string;
  contact_first_name?: string;
  contact_last_name?: string;
  role_title?: string;
  phone?: string;
  mobile_phone?: string;
  email?: string;
  website_url?: string;
  street_address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  confidence?: Record<string, number>;
}

const SYSTEM_PROMPT = `Tu extrais les données d'une carte d'affaires (ou d'un document contenant des coordonnées). Réponds STRICTEMENT en JSON valide selon le schéma:
{
  "company_name": string|null,
  "contact_first_name": string|null,
  "contact_last_name": string|null,
  "role_title": string|null,
  "phone": string|null,
  "mobile_phone": string|null,
  "email": string|null,
  "website_url": string|null,
  "street_address": string|null,
  "city": string|null,
  "province": string|null,
  "postal_code": string|null,
  "confidence": { "<field>": number 0-1 }
}
Règles:
- Ne pas inventer de données. Si non lisible → null.
- Téléphone au format canadien E.164 si possible (+1XXXXXXXXXX), sinon brut.
- confidence entre 0 et 1 pour chaque champ non-null.
- Aucune autre clé, aucun texte hors JSON.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');
    const { image_data_url, mime_type } = await req.json();
    if (!image_data_url || typeof image_data_url !== 'string') {
      return new Response(JSON.stringify({ error: 'image_data_url required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isPdf = (mime_type || '').includes('pdf') || image_data_url.startsWith('data:application/pdf');
    const contentBlock = isPdf
      ? { type: 'file', file: { filename: 'card.pdf', file_data: image_data_url } }
      : { type: 'image_url', image_url: { url: image_data_url } };

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: [
            { type: 'text', text: 'Extrais les coordonnées de cette carte.' },
            contentBlock,
          ] },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('gemini_error', res.status, body);
      return new Response(JSON.stringify({ error: 'ai_gateway_failed', status: res.status, details: body }), {
        status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content ?? '{}';
    let extracted: ExtractedCard;
    try { extracted = JSON.parse(content); } catch { extracted = {}; }

    return new Response(JSON.stringify({ ok: true, extracted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('extract-business-card fatal', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
