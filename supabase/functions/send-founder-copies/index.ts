// UNPRO — One-off: send exact copies of already-sent outreach emails to the founder.
// Never sends to prospects; recipient is fixed. Bodies are provided verbatim by the caller.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY') ?? ''
const FROM = "Alex d'UNPRO <alex@mail.unpro.ca>"
const FOUNDER = 'yturcotte@gmail.com'

interface CopyItem {
  business: string
  original_email: string
  sent_at: string
  link: string
  provider_status: string
  original_subject: string
  original_html: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const auth = req.headers.get('Authorization') ?? ''
  if (!auth) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders })
  }

  let copies: CopyItem[]
  try {
    const body = await req.json()
    copies = body.copies
    if (!Array.isArray(copies) || copies.length === 0) throw new Error('copies required')
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 400, headers: corsHeaders })
  }

  const results: { business: string; ok: boolean; error?: string; resend_id?: string }[] = []

  for (const c of copies) {
    const headerBlock = `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff8e1;padding:16px;border:1px solid #e0c060;border-radius:8px;margin-bottom:16px;font-family:monospace;font-size:13px;color:#333;">
  <tr><td>
    <p style="margin:0 0 6px 0;"><strong>COPIE — courriel réellement envoyé</strong></p>
    <p style="margin:0;">Entreprise / prospect original : ${c.business}</p>
    <p style="margin:0;">Adresse email originale : ${c.original_email}</p>
    <p style="margin:0;">Date/heure d'envoi (UTC) : ${c.sent_at}</p>
    <p style="margin:0;">URL Audit IA personnalisée : <a href="${c.link}">${c.link}</a></p>
    <p style="margin:0;">Statut fournisseur : ${c.provider_status}</p>
    <hr style="border:none;border-top:1px dashed #ccc;margin:12px 0;" />
    <p style="margin:0;color:#888;">— Début du courriel original tel qu'envoyé —</p>
  </td></tr>
</table>`

    const html = headerBlock + c.original_html
    const subject = `[COPIE UNPRO] ${c.business} — courriel réellement envoyé`

    try {
      const resp = await fetch(`${GATEWAY_URL}/emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          'X-Connection-Api-Key': RESEND_API_KEY,
        },
        body: JSON.stringify({ from: FROM, to: [FOUNDER], subject, html }),
      })
      if (!resp.ok) {
        const errBody = await resp.text()
        results.push({ business: c.business, ok: false, error: `${resp.status}: ${errBody.slice(0, 200)}` })
      } else {
        const data = await resp.json()
        results.push({ business: c.business, ok: true, resend_id: data.id })
      }
    } catch (e) {
      results.push({ business: c.business, ok: false, error: String(e) })
    }
  }

  const sent = results.filter((r) => r.ok).length
  return new Response(JSON.stringify({ requested: copies.length, sent, errors: copies.length - sent, results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
