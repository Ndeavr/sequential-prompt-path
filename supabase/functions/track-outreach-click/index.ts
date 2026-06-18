// UNPRO — Outreach click tracker
// Universal redirect that logs a row in `outreach_click_events` then 302s.
// Accepts: ?url=<encoded destination> [&mid=<message_id>] [&pid=<prospect_id>]
// - `mid` (optional): outreach_messages id — when present, also marks the message clicked
//   and emits an alex_link_clicked conversion event when relevant.
// - `pid` (optional): prospects.id — recorded only if it exists, otherwise dropped (FK safe).
// - Anything else (e.g. SMS curiosity links) still produces a counted click row.
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const messageId = url.searchParams.get('mid')
  const prospectIdParam = url.searchParams.get('pid')
  const targetUrl = url.searchParams.get('url')

  if (!targetUrl) {
    return new Response('Missing URL', { status: 400 })
  }

  const resolvedUrl = decodeURIComponent(targetUrl)

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    let messageProspectId: string | null = null
    let messageCampaignId: string | null = null

    if (messageId) {
      const { data: message } = await supabase
        .from('outreach_messages')
        .select('prospect_id, campaign_id')
        .eq('id', messageId)
        .maybeSingle()

      if (message) {
        messageProspectId = message.prospect_id ?? null
        messageCampaignId = message.campaign_id ?? null

        await supabase.from('outreach_messages')
          .update({ message_status: 'clicked' })
          .eq('id', messageId)
          .in('message_status', ['sent', 'delivered', 'opened'])
      }
    }

    // Validate ?pid against prospects (FK safe).
    let safeProspectId: string | null = messageProspectId
    if (!safeProspectId && prospectIdParam) {
      const { data: p } = await supabase
        .from('prospects')
        .select('id')
        .eq('id', prospectIdParam)
        .maybeSingle()
      if (p) safeProspectId = p.id
    }

    // Always log a click event — even with all ids null — so the funnel sees it.
    await supabase.from('outreach_click_events').insert({
      message_id: messageId ?? null,
      prospect_id: safeProspectId,
      campaign_id: messageCampaignId,
      clicked_url: targetUrl,
      resolved_url: resolvedUrl,
    })

    if (safeProspectId && (resolvedUrl.includes('alex-landing') || resolvedUrl.includes('/signature') || resolvedUrl.includes('/pro/'))) {
      await supabase.from('prospect_conversion_events').insert({
        prospect_id: safeProspectId,
        event_type: 'alex_link_clicked',
        event_value: resolvedUrl,
        event_meta_json: { campaign_id: messageCampaignId, message_id: messageId },
      })
    }
  } catch (err) {
    console.error('[track-outreach-click] log failed', err)
    // Still redirect — never block the user.
  }

  return new Response(null, {
    status: 302,
    headers: { 'Location': resolvedUrl },
  })
})
