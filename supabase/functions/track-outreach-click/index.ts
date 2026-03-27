import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const messageId = url.searchParams.get('mid')
  const targetUrl = url.searchParams.get('url')

  if (!targetUrl) {
    return new Response('Missing URL', { status: 400 })
  }

  const resolvedUrl = decodeURIComponent(targetUrl)

  if (messageId) {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: message } = await supabase
      .from('outreach_messages')
      .select('prospect_id, campaign_id')
      .eq('id', messageId)
      .maybeSingle()

    if (message) {
      await supabase.from('outreach_click_events').insert({
        message_id: messageId,
        prospect_id: message.prospect_id,
        campaign_id: message.campaign_id,
        clicked_url: targetUrl,
        resolved_url: resolvedUrl,
      })

      // Update message status
      await supabase.from('outreach_messages')
        .update({ message_status: 'clicked' })
        .eq('id', messageId)
        .in('message_status', ['sent', 'delivered', 'opened'])

      // Check if it's an Alex link click — log conversion event
      if (resolvedUrl.includes('alex-landing') || resolvedUrl.includes('/signature')) {
        await supabase.from('prospect_conversion_events').insert({
          prospect_id: message.prospect_id,
          event_type: 'alex_link_clicked',
          event_value: resolvedUrl,
          event_meta_json: { campaign_id: message.campaign_id, message_id: messageId },
        })
      }
    }
  }

  // Redirect to actual destination
  return new Response(null, {
    status: 302,
    headers: { 'Location': resolvedUrl },
  })
})
