// Public edge function — processes a form_submissions row:
// 1) sends user confirmation email (if email present)
// 2) sends admin notification email
// 3) updates form_submissions status + writes form_events / form_email_logs
// Idempotent: safe to call multiple times for the same submission_id.

import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SENDER_DOMAIN = 'notify.unpro.ca'
const FROM_ADDRESS = 'UNPRO <alex@notify.unpro.ca>'
const ADMIN_EMAIL = Deno.env.get('FORMS_ADMIN_EMAIL') || 'dde@unpro.ca'

const FORM_LABELS: Record<string, string> = {
  partner_application: 'Partenaire Certifié',
  condo_priority_access: 'Accès prioritaire Copropriété',
  contact: 'Contact',
  contractor_onboarding: 'Onboarding Entrepreneur',
  alex_callback: 'Rappel Alex',
  quote_upload: 'Téléversement de devis',
  project_analysis: 'Analyse de projet',
  contractor_signup: 'Devenir Entrepreneur',
  newsletter: 'Infolettre',
}

function token32(): string {
  const b = new Uint8Array(32); crypto.getRandomValues(b)
  return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('')
}

async function enqueueRendered(supabase: any, opts: {
  templateName: string, recipient: string, data: Record<string, any>,
  submissionId: string, emailType: 'user_confirmation' | 'admin_notification',
}) {
  const tpl = TEMPLATES[opts.templateName]
  if (!tpl) throw new Error(`template_missing:${opts.templateName}`)

  const recipient = opts.recipient.toLowerCase()

  // Suppression check
  const { data: sup } = await supabase.from('suppressed_emails').select('id').eq('email', recipient).maybeSingle()
  if (sup) {
    await supabase.from('form_email_logs').insert({
      submission_id: opts.submissionId, email_type: opts.emailType,
      recipient, provider: 'lovable_email', status: 'suppressed',
    })
    return { ok: false, reason: 'suppressed' }
  }

  // Unsubscribe token (reuse if exists, create otherwise)
  let unsub: string
  const { data: existing } = await supabase.from('email_unsubscribe_tokens')
    .select('token, used_at').eq('email', recipient).maybeSingle()
  if (existing?.used_at) {
    return { ok: false, reason: 'token_used' }
  }
  if (existing) {
    unsub = existing.token
  } else {
    unsub = token32()
    await supabase.from('email_unsubscribe_tokens').upsert(
      { token: unsub, email: recipient }, { onConflict: 'email', ignoreDuplicates: true })
    const { data: re } = await supabase.from('email_unsubscribe_tokens').select('token').eq('email', recipient).maybeSingle()
    if (re?.token) unsub = re.token
  }

  const html = await renderAsync(React.createElement(tpl.component, opts.data))
  const text = await renderAsync(React.createElement(tpl.component, opts.data), { plainText: true })
  const subject = typeof tpl.subject === 'function' ? tpl.subject(opts.data) : tpl.subject

  const messageId = crypto.randomUUID()
  const idempotencyKey = `${opts.submissionId}:${opts.emailType}`

  await supabase.from('email_send_log').insert({
    message_id: messageId, template_name: opts.templateName,
    recipient_email: recipient, status: 'pending',
  })

  const { error } = await supabase.rpc('enqueue_email', {
    queue_name: opts.emailType === 'user_confirmation' ? 'transactional_emails' : 'transactional_emails',
    payload: {
      message_id: messageId, to: recipient, from: FROM_ADDRESS,
      sender_domain: SENDER_DOMAIN, subject, html, text,
      purpose: 'transactional', label: opts.templateName,
      idempotency_key: idempotencyKey, unsubscribe_token: unsub,
      queued_at: new Date().toISOString(),
    },
  })

  if (error) {
    await supabase.from('form_email_logs').insert({
      submission_id: opts.submissionId, email_type: opts.emailType,
      recipient, provider: 'lovable_email', status: 'failed',
      response: { error: String(error.message || error) },
    })
    throw new Error(`enqueue_failed:${error.message || 'unknown'}`)
  }

  await supabase.from('form_email_logs').insert({
    submission_id: opts.submissionId, email_type: opts.emailType,
    recipient, provider: 'lovable_email', status: 'queued',
    response: { message_id: messageId },
  })
  return { ok: true, messageId }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const url = Deno.env.get('SUPABASE_URL')!
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(url, key)

  let submissionId: string | undefined
  try {
    const body = await req.json()
    submissionId = body.submission_id || body.submissionId
  } catch { /* allow */ }
  if (!submissionId) {
    return new Response(JSON.stringify({ error: 'submission_id required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const { data: sub, error } = await supabase.from('form_submissions').select('*').eq('id', submissionId).maybeSingle()
  if (error || !sub) {
    return new Response(JSON.stringify({ error: 'not_found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  // Idempotency: if already sent, just return success
  if (sub.email_admin_sent && (sub.email_user_sent || !sub.email)) {
    return new Response(JSON.stringify({ ok: true, already: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  await supabase.from('form_submissions').update({ status: 'processing' }).eq('id', submissionId)
  await supabase.from('form_events').insert({ submission_id: submissionId, event_type: 'processing_started' })

  const formLabel = FORM_LABELS[sub.form_type] || sub.form_type
  const errors: string[] = []
  let userOk = !sub.email
  let adminOk = false

  // 1) User confirmation
  if (sub.email && !sub.email_user_sent) {
    try {
      const r = await enqueueRendered(supabase, {
        templateName: 'form-user-confirmation',
        recipient: sub.email,
        data: { firstName: sub.first_name, formLabel, referenceCode: sub.reference_code },
        submissionId, emailType: 'user_confirmation',
      })
      if (r.ok) { userOk = true; await supabase.from('form_submissions').update({ email_user_sent: true }).eq('id', submissionId) }
      else if (r.reason === 'suppressed' || r.reason === 'token_used') { userOk = true }
    } catch (e: any) {
      errors.push(`user:${e.message}`)
      await supabase.from('form_events').insert({ submission_id: submissionId, event_type: 'user_email_failed', metadata: { error: e.message } })
    }
  } else if (sub.email_user_sent) { userOk = true }

  // 2) Admin notification
  if (!sub.email_admin_sent) {
    try {
      const r = await enqueueRendered(supabase, {
        templateName: 'form-admin-notification',
        recipient: ADMIN_EMAIL,
        data: {
          formLabel, formType: sub.form_type, referenceCode: sub.reference_code,
          firstName: sub.first_name, lastName: sub.last_name,
          email: sub.email, phone: sub.phone, company: sub.company,
          sourcePage: sub.source_page, utmSource: sub.utm_source, utmCampaign: sub.utm_campaign,
          payload: sub.payload || {},
        },
        submissionId, emailType: 'admin_notification',
      })
      if (r.ok) { adminOk = true; await supabase.from('form_submissions').update({ email_admin_sent: true }).eq('id', submissionId) }
    } catch (e: any) {
      errors.push(`admin:${e.message}`)
      await supabase.from('form_events').insert({ submission_id: submissionId, event_type: 'admin_email_failed', metadata: { error: e.message } })
    }
  } else { adminOk = true }

  const allOk = userOk && adminOk
  const nextRetryDelayMin = [5, 15, 60, 360, 1440][Math.min(sub.retry_count, 4)]
  await supabase.from('form_submissions').update({
    status: allOk ? 'sent' : 'failed',
    last_error: errors.length ? errors.join(' | ') : null,
    retry_count: allOk ? sub.retry_count : (sub.retry_count + 1),
    next_retry_at: allOk ? null : new Date(Date.now() + nextRetryDelayMin * 60_000).toISOString(),
  }).eq('id', submissionId)

  await supabase.from('form_events').insert({
    submission_id: submissionId,
    event_type: allOk ? 'completed' : 'failed',
    metadata: { errors, user_ok: userOk, admin_ok: adminOk },
  })

  return new Response(JSON.stringify({ ok: allOk, errors }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
