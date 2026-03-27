import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const url = new URL(req.url)
  const prospectId = url.searchParams.get('pid')
  const campaignId = url.searchParams.get('cid')
  const channel = url.searchParams.get('ch') || 'email'

  if (!prospectId) {
    return new Response('<html><body><h1>Lien invalide</h1></body></html>', {
      headers: { 'Content-Type': 'text/html' },
      status: 400,
    })
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // Record unsubscribe
  await supabase.from('outreach_unsubscribes').insert({
    prospect_id: prospectId,
    campaign_id: campaignId,
    channel_type: channel,
    source: 'link_click',
  })

  // Update recipient status
  if (channel === 'email') {
    await supabase.from('outreach_recipients')
      .update({ unsubscribe_status: true, recipient_status: 'unsubscribed', stopped_reason: 'unsubscribe', updated_at: new Date().toISOString() })
      .eq('prospect_id', prospectId)
  } else {
    await supabase.from('outreach_recipients')
      .update({ sms_opt_out: true, recipient_status: 'unsubscribed', stopped_reason: 'sms_opt_out', updated_at: new Date().toISOString() })
      .eq('prospect_id', prospectId)
  }

  // Add to suppression list
  const { data: contacts } = await supabase
    .from('prospect_contact_points')
    .select('contact_type, contact_value')
    .eq('prospect_id', prospectId)
    .eq('contact_type', channel === 'sms' ? 'phone' : 'email')

  for (const c of contacts || []) {
    await supabase.from('outreach_suppressions').upsert({
      contact_type: c.contact_type,
      contact_value: c.contact_value.toLowerCase(),
      suppression_reason: 'unsubscribe',
      source: 'outreach_unsubscribe_link',
    }, { onConflict: 'contact_type,contact_value' }).select()
    // If upsert fails silently, that's ok — dedup
  }

  // Return confirmation page
  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Désabonnement confirmé</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8f9fa;color:#333}
.card{text-align:center;padding:3rem;background:white;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:400px}
h1{font-size:1.5rem;margin-bottom:.5rem}p{color:#666;line-height:1.6}</style></head>
<body><div class="card">
<h1>✓ Désabonnement confirmé</h1>
<p>Vous ne recevrez plus de messages de cette séquence.</p>
<p style="margin-top:1.5rem;font-size:.875rem;color:#999">UNPRO</p>
</div></body></html>`

  return new Response(html, { headers: { 'Content-Type': 'text/html' } })
})
