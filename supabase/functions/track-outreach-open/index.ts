import { createClient } from 'npm:@supabase/supabase-js@2'

// 1x1 transparent GIF
const PIXEL = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
  0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00,
  0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
  0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
])

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const messageId = url.searchParams.get('mid')

  if (!messageId) {
    return new Response(PIXEL, { headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' } })
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // Get message details
  const { data: message } = await supabase
    .from('outreach_messages')
    .select('prospect_id, campaign_id')
    .eq('id', messageId)
    .maybeSingle()

  if (message) {
    // Record open event (dedupe by checking existing)
    const { data: existing } = await supabase
      .from('outreach_open_events')
      .select('id')
      .eq('message_id', messageId)
      .limit(1)
      .maybeSingle()

    if (!existing) {
      const userAgent = req.headers.get('user-agent') || ''
      const forwarded = req.headers.get('x-forwarded-for') || ''
      // Simple hash of IP for privacy
      const ipHash = forwarded ? btoa(forwarded).slice(0, 16) : ''

      await supabase.from('outreach_open_events').insert({
        message_id: messageId,
        prospect_id: message.prospect_id,
        campaign_id: message.campaign_id,
        user_agent: userAgent.slice(0, 255),
        ip_hash: ipHash,
      })

      // Update message status if not already clicked/replied
      await supabase.from('outreach_messages')
        .update({ message_status: 'opened' })
        .eq('id', messageId)
        .in('message_status', ['sent', 'delivered'])
    }
  }

  return new Response(PIXEL, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    },
  })
})
