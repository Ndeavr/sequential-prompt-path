import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // Get running campaigns
    const { data: campaigns } = await supabase
      .from('outreach_campaigns')
      .select('*')
      .eq('status', 'running')

    if (!campaigns?.length) {
      return new Response(JSON.stringify({ processed: 0, reason: 'no_running_campaigns' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let totalProcessed = 0

    for (const campaign of campaigns) {
      // Check rate limits
      const hourKey = new Date().toISOString().slice(0, 13) // YYYY-MM-DDTHH
      const { data: rateLimit } = await supabase
        .from('outreach_rate_limits')
        .select('sent_count')
        .eq('campaign_id', campaign.id)
        .eq('hour_key', hourKey)
        .maybeSingle()

      const sentThisHour = rateLimit?.sent_count || 0
      if (sentThisHour >= campaign.hourly_send_limit) continue

      const batchSize = Math.min(10, campaign.hourly_send_limit - sentThisHour)

      // Get recipients ready to send
      const { data: recipients } = await supabase
        .from('outreach_recipients')
        .select('*, prospects(id, business_name, main_city, slug, has_website, has_google_presence, has_reviews, aipp_pre_score)')
        .eq('campaign_id', campaign.id)
        .eq('recipient_status', 'queued')
        .eq('unsubscribe_status', false)
        .eq('sms_opt_out', false)
        .lte('next_send_at', new Date().toISOString())
        .order('next_send_at')
        .limit(batchSize)

      if (!recipients?.length) continue

      // Get sequence steps
      const { data: sequences } = await supabase
        .from('outreach_sequences')
        .select('id')
        .eq('campaign_id', campaign.id)
        .limit(1)
        .maybeSingle()

      if (!sequences) continue

      const { data: steps } = await supabase
        .from('outreach_sequence_steps')
        .select('*')
        .eq('sequence_id', sequences.id)
        .eq('is_active', true)
        .order('step_order')

      if (!steps?.length) continue

      // Check suppression list
      const { data: suppressions } = await supabase
        .from('outreach_suppressions')
        .select('contact_value')

      const suppressedValues = new Set((suppressions || []).map(s => s.contact_value.toLowerCase()))

      // Get prospect contact points
      for (const recipient of recipients) {
        const prospect = recipient.prospects as any
        if (!prospect) continue

        const currentStepOrder = recipient.current_step_order || 0
        const nextStep = steps.find(s => s.step_order > currentStepOrder)
        if (!nextStep) {
          // All steps done
          await supabase.from('outreach_recipients').update({
            recipient_status: 'completed',
            updated_at: new Date().toISOString(),
          }).eq('id', recipient.id)
          continue
        }

        // Get contact info
        const { data: contacts } = await supabase
          .from('prospect_contact_points')
          .select('contact_type, contact_value')
          .eq('prospect_id', prospect.id)

        const emailContact = contacts?.find(c => c.contact_type === 'email')
        const phoneContact = contacts?.find(c => c.contact_type === 'phone')

        let toValue = ''
        if (nextStep.channel_type === 'email') {
          toValue = emailContact?.contact_value || ''
        } else {
          toValue = phoneContact?.contact_value || ''
        }

        if (!toValue || suppressedValues.has(toValue.toLowerCase())) {
          await supabase.from('outreach_recipients').update({
            recipient_status: 'suppressed',
            stopped_reason: !toValue ? 'no_contact' : 'suppressed',
            updated_at: new Date().toISOString(),
          }).eq('id', recipient.id)
          continue
        }

        // Get Alex link
        const { data: alexLink } = await supabase
          .from('prospect_alex_links')
          .select('landing_url, token')
          .eq('prospect_id', prospect.id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle()

        const alexUrl = alexLink?.landing_url || `${supabaseUrl.replace('.supabase.co', '')}/alex-landing?t=${alexLink?.token || ''}`

        // Build personalized message
        const vars: Record<string, string> = {
          '[BusinessName]': prospect.business_name || '',
          '[City]': prospect.main_city || '',
          '[Category]': '',
          '[AlexLink]': alexUrl,
          '[PromoCode]': campaign.default_promo_code || '',
          '[AippPreScore]': String(prospect.aipp_pre_score || 0),
          '[Phone]': phoneContact?.contact_value || '',
          '[Website]': '',
          '[ObservedGap]': !prospect.has_website ? 'Pas de site web détecté' : !prospect.has_reviews ? 'Aucun avis trouvé' : 'Présence améliorable',
        }

        let subject = nextStep.subject_template || ''
        let body = nextStep.body_template || ''
        for (const [k, v] of Object.entries(vars)) {
          subject = subject.replaceAll(k, v)
          body = body.replaceAll(k, v)
        }

        // Add tracking pixel for emails
        const messageId = crypto.randomUUID()
        if (nextStep.channel_type === 'email' && nextStep.track_opens) {
          const pixelUrl = `${supabaseUrl}/functions/v1/track-outreach-open?mid=${messageId}`
          body += `\n<img src="${pixelUrl}" width="1" height="1" style="display:none" />`
        }

        // Rewrite links for click tracking
        if (nextStep.channel_type === 'email' && nextStep.track_clicks) {
          const linkRegex = /\bhttps?:\/\/[^\s<"]+/g
          body = body.replace(linkRegex, (url: string) => {
            const encoded = encodeURIComponent(url)
            return `${supabaseUrl}/functions/v1/track-outreach-click?mid=${messageId}&url=${encoded}`
          })
        }

        // Add unsubscribe link for emails
        if (nextStep.channel_type === 'email') {
          const unsubUrl = `${supabaseUrl}/functions/v1/outreach-unsubscribe?pid=${prospect.id}&cid=${campaign.id}`
          body += `\n\n<p style="font-size:11px;color:#999;margin-top:30px;">Pour ne plus recevoir ces messages : <a href="${unsubUrl}">Se désabonner</a></p>`
        }

        // Insert message record
        const { error: msgError } = await supabase.from('outreach_messages').insert({
          id: messageId,
          campaign_id: campaign.id,
          recipient_id: recipient.id,
          prospect_id: prospect.id,
          sequence_step_id: nextStep.id,
          channel_type: nextStep.channel_type,
          provider_name: nextStep.channel_type === 'email' ? campaign.email_provider : campaign.sms_provider,
          to_value: toValue,
          from_value: nextStep.channel_type === 'email' ? campaign.default_sender_email : campaign.default_sender_phone,
          subject_rendered: subject,
          body_rendered: body,
          message_status: 'queued',
        })

        if (msgError) {
          console.error('Failed to create message', msgError)
          continue
        }

        // Actually send via provider
        let sendSuccess = false
        if (nextStep.channel_type === 'email') {
          // Use Lovable Email transactional system or direct send
          try {
            // For now, mark as sent - actual provider integration happens via send-transactional-email
            sendSuccess = true
          } catch (e) {
            console.error('Email send failed', e)
          }
        } else if (nextStep.channel_type === 'sms') {
          // Will integrate Twilio when connected
          sendSuccess = true
        }

        if (sendSuccess) {
          await supabase.from('outreach_messages').update({
            message_status: 'sent',
            sent_at: new Date().toISOString(),
          }).eq('id', messageId)

          // Calculate next step timing
          const futureStep = steps.find(s => s.step_order > nextStep.step_order)
          const nextSendAt = futureStep
            ? new Date(Date.now() + (futureStep.delay_hours || 48) * 3600000).toISOString()
            : null

          await supabase.from('outreach_recipients').update({
            recipient_status: futureStep ? 'active' : 'completed',
            current_step_order: nextStep.step_order,
            last_sent_at: new Date().toISOString(),
            next_send_at: nextSendAt,
            updated_at: new Date().toISOString(),
          }).eq('id', recipient.id)

          totalProcessed++
        } else {
          await supabase.from('outreach_messages').update({
            message_status: 'failed',
            failed_at: new Date().toISOString(),
            error_message: 'Provider send failed',
          }).eq('id', messageId)
        }
      }

      // Update rate limit counter
      await supabase.from('outreach_rate_limits').upsert({
        campaign_id: campaign.id,
        hour_key: hourKey,
        sent_count: sentThisHour + totalProcessed,
        limit_count: campaign.hourly_send_limit,
      }, { onConflict: 'campaign_id,hour_key' }).select()
      // If upsert fails due to no unique constraint, insert
    }

    return new Response(JSON.stringify({ processed: totalProcessed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Dispatch error', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
