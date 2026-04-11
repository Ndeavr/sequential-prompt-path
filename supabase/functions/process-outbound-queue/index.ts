import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/** Check if current time in campaign timezone falls within send window */
function isInSendWindow(
  windowStart: string,
  windowEnd: string,
  timezone: string,
  sendDays: string[]
): boolean {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  })
  const parts = formatter.formatToParts(now)
  const hour = parts.find(p => p.type === 'hour')?.value || '00'
  const minute = parts.find(p => p.type === 'minute')?.value || '00'
  const weekday = (parts.find(p => p.type === 'weekday')?.value || '').toLowerCase().slice(0, 3)

  const dayMap: Record<string, string> = {
    mon: 'mon', tue: 'tue', wed: 'wed', thu: 'thu', fri: 'fri', sat: 'sat', sun: 'sun',
  }
  const currentDay = dayMap[weekday] || weekday
  if (!sendDays.includes(currentDay)) return false

  const currentMinutes = parseInt(hour) * 60 + parseInt(minute)
  const [startH, startM] = windowStart.split(':').map(Number)
  const [endH, endM] = windowEnd.split(':').map(Number)
  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM

  return currentMinutes >= startMinutes && currentMinutes < endMinutes
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const startTime = Date.now()

  try {
    // Get active campaigns with auto_send_enabled
    const { data: campaigns } = await supabase
      .from('outbound_campaigns')
      .select('*')
      .eq('campaign_status', 'active')
      .eq('auto_send_enabled', true)

    if (!campaigns?.length) {
      return new Response(JSON.stringify({ processed: 0, reason: 'no_auto_campaigns' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let totalSent = 0
    let totalFailed = 0
    let totalSkipped = 0

    for (const campaign of campaigns) {
      const windowStart = campaign.send_window_start || '09:00'
      const windowEnd = campaign.send_window_end || '17:00'
      const timezone = campaign.send_timezone || 'America/Montreal'
      const sendDays = (campaign.send_days as string[]) || ['mon', 'tue', 'wed', 'thu', 'fri']

      // Check send window
      if (!isInSendWindow(windowStart, windowEnd, timezone, sendDays)) {
        totalSkipped++
        continue
      }

      // Check daily quota
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const { count: sentToday } = await supabase
        .from('outbound_messages')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id)
        .gte('sent_at', todayStart.toISOString())

      const dailyLimit = campaign.daily_send_limit || 50
      const remaining = dailyLimit - (sentToday || 0)
      if (remaining <= 0) {
        totalSkipped++
        continue
      }

      const batchSize = Math.min(10, remaining)

      // Get leads ready to send (in sequence, ordered by priority)
      const { data: leads } = await supabase
        .from('outbound_leads')
        .select(`
          id, company_id, contact_id, campaign_id, crm_status, 
          total_priority_score, hook_summary, approved_send_order,
          outbound_contacts!inner(email, full_name, first_name),
          outbound_companies!inner(company_name, city, specialty, website_url)
        `)
        .eq('campaign_id', campaign.id)
        .in('crm_status', ['approved_to_send', 'in_sequence'])
        .not('outbound_contacts.email', 'is', null)
        .order('total_priority_score', { ascending: false })
        .limit(batchSize)

      if (!leads?.length) continue

      // Check suppression list
      const emails = leads.map((l: any) => l.outbound_contacts?.email).filter(Boolean)
      const { data: suppressions } = await supabase
        .from('outbound_suppressions')
        .select('email')
        .in('email', emails)
        .eq('active', true)

      const suppressedEmails = new Set((suppressions || []).map((s: any) => s.email?.toLowerCase()))

      // Get sequence steps for this campaign
      const { data: steps } = await supabase
        .from('outbound_sequence_steps')
        .select('*')
        .eq('sequence_id', campaign.sequence_id)
        .eq('is_active', true)
        .order('step_order')

      if (!steps?.length) continue

      // Get the mailbox
      const { data: mailbox } = await supabase
        .from('outbound_mailboxes')
        .select('*')
        .eq('id', campaign.mailbox_id)
        .single()

      if (!mailbox || mailbox.mailbox_status !== 'active') continue

      for (const lead of leads) {
        const contact = (lead as any).outbound_contacts
        const company = (lead as any).outbound_companies
        if (!contact?.email) continue

        if (suppressedEmails.has(contact.email.toLowerCase())) {
          // Mark suppressed
          await supabase.from('outbound_leads').update({
            crm_status: 'suppressed',
            updated_at: new Date().toISOString(),
          }).eq('id', lead.id)
          
          await supabase.from('outbound_events').insert({
            lead_id: lead.id,
            campaign_id: campaign.id,
            event_type: 'suppressed',
            event_at: new Date().toISOString(),
          })
          totalSkipped++
          continue
        }

        // Determine which step to send
        const { data: lastMsg } = await supabase
          .from('outbound_messages')
          .select('sequence_step_id')
          .eq('lead_id', lead.id)
          .order('sent_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        let currentStepOrder = 0
        if (lastMsg?.sequence_step_id) {
          const lastStep = steps.find((s: any) => s.id === lastMsg.sequence_step_id)
          currentStepOrder = lastStep?.step_order || 0
        }

        const nextStep = steps.find((s: any) => s.step_order > currentStepOrder)
        if (!nextStep) {
          // Sequence completed
          await supabase.from('outbound_leads').update({
            crm_status: 'closed_lost',
            updated_at: new Date().toISOString(),
          }).eq('id', lead.id)
          continue
        }

        // Check delay: if not first step, ensure enough time has passed
        if (currentStepOrder > 0 && lastMsg) {
          const { data: prevMsg } = await supabase
            .from('outbound_messages')
            .select('sent_at')
            .eq('lead_id', lead.id)
            .order('sent_at', { ascending: false })
            .limit(1)
            .single()

          if (prevMsg?.sent_at) {
            const lastSent = new Date(prevMsg.sent_at)
            const delayMs = ((nextStep as any).delay_days || 2) * 86400000
            if (Date.now() - lastSent.getTime() < delayMs) {
              totalSkipped++
              continue
            }
          }
        }

        // Build email content from template
        const vars: Record<string, string> = {
          '{{company_name}}': company?.company_name || '',
          '{{city}}': company?.city || campaign.city || '',
          '{{specialty}}': company?.specialty || campaign.specialty || '',
          '{{first_name}}': contact?.first_name || contact?.full_name?.split(' ')[0] || '',
          '{{full_name}}': contact?.full_name || '',
          '{{hook}}': lead.hook_summary || '',
          '{{sender_name}}': mailbox.sender_name || 'UNPRO',
          '{{website}}': company?.website_url || '',
        }

        let subject = (nextStep as any).subject_template || ''
        let body = (nextStep as any).body_template || ''
        for (const [k, v] of Object.entries(vars)) {
          subject = subject.replaceAll(k, v)
          body = body.replaceAll(k, v)
        }

        const messageId = crypto.randomUUID()

        // Insert message
        const { error: msgErr } = await supabase.from('outbound_messages').insert({
          id: messageId,
          lead_id: lead.id,
          campaign_id: campaign.id,
          mailbox_id: mailbox.id,
          sequence_step_id: nextStep.id,
          subject_rendered: subject,
          body_rendered: body,
          delivery_status: 'sent',
          sent_at: new Date().toISOString(),
          open_count: 0,
          click_count: 0,
          replied: false,
        })

        if (msgErr) {
          console.error('Message insert failed:', msgErr)
          totalFailed++
          continue
        }

        // Update lead status
        await supabase.from('outbound_leads').update({
          crm_status: 'in_sequence',
          last_contacted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', lead.id)

        // Log event
        await supabase.from('outbound_events').insert({
          lead_id: lead.id,
          campaign_id: campaign.id,
          message_id: messageId,
          event_type: 'email_sent',
          event_value: `step_${nextStep.step_order}`,
          event_at: new Date().toISOString(),
        })

        totalSent++
      }

      // Log the run
      await supabase.from('outbound_send_logs').insert({
        campaign_id: campaign.id,
        leads_processed: leads.length,
        emails_sent: totalSent,
        emails_failed: totalFailed,
        emails_skipped: totalSkipped,
        run_status: 'completed',
        run_duration_ms: Date.now() - startTime,
      })
    }

    return new Response(JSON.stringify({
      processed: totalSent,
      failed: totalFailed,
      skipped: totalSkipped,
      campaigns: campaigns.length,
      duration_ms: Date.now() - startTime,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Queue processing error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
