import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  try {
    // Get active recipients that are in sequence
    const { data: recipients } = await supabase
      .from('outreach_recipients')
      .select('id, campaign_id, prospect_id, current_step_order, recipient_status, last_sent_at')
      .eq('recipient_status', 'active')
      .not('last_sent_at', 'is', null)
      .limit(200)

    if (!recipients?.length) {
      return new Response(JSON.stringify({ evaluated: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let evaluated = 0
    let stopped = 0

    for (const recipient of recipients) {
      // Check if prospect has converted
      const { data: conversions } = await supabase
        .from('prospect_conversion_events')
        .select('event_type')
        .eq('prospect_id', recipient.prospect_id)
        .in('event_type', ['signature_activated', 'started_onboarding', 'profile_completed'])
        .limit(1)

      if (conversions?.length) {
        // Stop sequence on conversion
        await supabase.from('outreach_recipients').update({
          recipient_status: 'converted',
          stopped_reason: `conversion:${conversions[0].event_type}`,
          next_send_at: null,
          updated_at: new Date().toISOString(),
        }).eq('id', recipient.id)
        stopped++
        evaluated++
        continue
      }

      // Check for unsubscribe / suppression
      const { data: unsubs } = await supabase
        .from('outreach_unsubscribes')
        .select('id')
        .eq('prospect_id', recipient.prospect_id)
        .limit(1)

      if (unsubs?.length) {
        await supabase.from('outreach_recipients').update({
          recipient_status: 'unsubscribed',
          stopped_reason: 'unsubscribe_detected',
          next_send_at: null,
          updated_at: new Date().toISOString(),
        }).eq('id', recipient.id)
        stopped++
        evaluated++
        continue
      }

      // Check messages for bounces
      const { data: bouncedMsgs } = await supabase
        .from('outreach_messages')
        .select('id')
        .eq('recipient_id', recipient.id)
        .eq('message_status', 'bounced')
        .limit(1)

      if (bouncedMsgs?.length) {
        await supabase.from('outreach_recipients').update({
          recipient_status: 'failed',
          stopped_reason: 'hard_bounce',
          next_send_at: null,
          updated_at: new Date().toISOString(),
        }).eq('id', recipient.id)
        stopped++
        evaluated++
        continue
      }

      evaluated++
    }

    return new Response(JSON.stringify({ evaluated, stopped }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
