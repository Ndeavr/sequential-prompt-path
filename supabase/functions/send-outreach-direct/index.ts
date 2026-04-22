import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * send-outreach-direct
 * 
 * Sends outreach emails directly via Lovable Email queue (pgmq).
 * No auth required — called by cron or admin trigger only.
 * 
 * Body:
 *   { prospect_ids?: string[], limit?: number, dry_run?: boolean }
 * 
 * If no prospect_ids provided, picks unsent insulation prospects from contractor_prospects.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  try {
    const body = await req.json().catch(() => ({}))
    const dryRun = body.dry_run ?? false
    const limit = body.limit ?? 10
    const prospectIds: string[] | undefined = body.prospect_ids

    // 1. Get prospects to email
    let query = supabase
      .from('contractor_prospects')
      .select('id, business_name, city, category_slug, email, outreach_status')
      .not('email', 'is', null)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (prospectIds?.length) {
      query = query.in('id', prospectIds)
    } else {
      // Pick prospects not yet emailed
      query = query.in('outreach_status', ['new', 'pending', 'not_started'])
    }

    const { data: prospects, error: fetchErr } = await query
    if (fetchErr) throw fetchErr
    if (!prospects?.length) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no_eligible_prospects' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const results: Array<{ id: string; business_name: string; email: string; status: string; message_id?: string }> = []

    for (const p of prospects) {
      if (!p.email) continue

      const messageId = crypto.randomUUID()
      const subject = `UNPRO a identifié de nouvelles demandes en isolation dans votre secteur`
      const companyName = p.business_name || ''
      const city = p.city || ''

      // Build plain HTML email matching the exact requested copy
      const html = buildOutreachHtml(companyName, city)
      const plainText = buildOutreachText(companyName, city)

      if (dryRun) {
        results.push({ id: p.id, business_name: companyName, email: p.email, status: 'dry_run' })
        continue
      }

      // Enqueue via pgmq for reliable delivery
      const { error: enqueueError } = await supabase.rpc('enqueue_email', {
        queue_name: 'transactional_emails',
        payload: {
          message_id: messageId,
          to: p.email,
          from: 'Alex UNPRO <alex@notify.unpro.ca>',
          sender_domain: 'notify.unpro.ca',
          subject,
          html,
          text: plainText,
          purpose: 'transactional',
          label: 'outreach-direct',
          idempotency_key: `outreach-direct-${p.id}`,
          queued_at: new Date().toISOString(),
        },
      })

      if (enqueueError) {
        console.error('Enqueue failed for', p.email, enqueueError)
        results.push({ id: p.id, business_name: companyName, email: p.email, status: 'enqueue_failed' })
        continue
      }

      // Log to email_send_log
      await supabase.from('email_send_log').insert({
        message_id: messageId,
        template_name: 'outreach-direct',
        recipient_email: p.email,
        status: 'pending',
      })

      // Update prospect status
      await supabase.from('contractor_prospects').update({
        outreach_status: 'emailed',
      }).eq('id', p.id)

      results.push({ id: p.id, business_name: companyName, email: p.email, status: 'queued', message_id: messageId })
    }

    const sent = results.filter(r => r.status === 'queued').length
    console.log(`Outreach direct: ${sent} emails queued, ${results.length} total processed`)

    return new Response(JSON.stringify({ sent, total: results.length, results, dry_run: dryRun }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('send-outreach-direct error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function buildOutreachHtml(companyName: string, city: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /></head>
<body style="font-family:'Helvetica Neue',Arial,sans-serif;background:#ffffff;padding:32px 24px;max-width:520px;margin:0 auto;">
  <h1 style="font-size:22px;font-weight:700;color:#0F172A;margin:0 0 20px;">
    Bonjour${companyName ? ` ${companyName}` : ''},
  </h1>
  <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">
    Ici Alex de UNPRO.
  </p>
  <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">
    Nous avons identifié de nouvelles demandes potentielles en isolation dans votre secteur${city ? ` (${city})` : ''}.
  </p>
  <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">
    Nous sélectionnons actuellement quelques entrepreneurs pouvant recevoir des rendez-vous qualifiés exclusifs.
  </p>
  <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">
    Souhaitez-vous voir les opportunités disponibles?
  </p>
  <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">
    <strong>Répondez OUI</strong> et je vous explique.
  </p>
  <p style="font-size:13px;color:#9CA3AF;margin:32px 0 0;">
    — Alex, UNPRO.ca
  </p>
</body>
</html>`.trim()
}

function buildOutreachText(companyName: string, city: string): string {
  return `Bonjour${companyName ? ` ${companyName}` : ''},

Ici Alex de UNPRO.

Nous avons identifié de nouvelles demandes potentielles en isolation dans votre secteur${city ? ` (${city})` : ''}.

Nous sélectionnons actuellement quelques entrepreneurs pouvant recevoir des rendez-vous qualifiés exclusifs.

Souhaitez-vous voir les opportunités disponibles?

Répondez OUI et je vous explique.

— Alex, UNPRO.ca`
}
