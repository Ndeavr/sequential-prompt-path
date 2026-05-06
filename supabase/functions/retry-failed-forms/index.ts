// Cron-triggered: retries failed form submissions, with exponential backoff.
// Called by pg_cron every 5 minutes (or invoked manually by admin).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_RETRIES = 5

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const url = Deno.env.get('SUPABASE_URL')!
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(url, key)

  const now = new Date().toISOString()
  const { data: rows, error } = await supabase
    .from('form_submissions')
    .select('id, retry_count')
    .eq('status', 'failed')
    .lt('retry_count', MAX_RETRIES)
    .or(`next_retry_at.is.null,next_retry_at.lte.${now}`)
    .limit(50)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  let processed = 0
  for (const row of rows || []) {
    try {
      await fetch(`${url}/functions/v1/process-form-submission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ submission_id: row.id }),
      })
      processed++
    } catch (_) { /* ignore individual failures */ }
  }

  // Mark dead submissions that exceeded max retries
  await supabase.from('form_submissions')
    .update({ status: 'dead' })
    .eq('status', 'failed')
    .gte('retry_count', MAX_RETRIES)

  return new Response(JSON.stringify({ ok: true, processed, total: rows?.length || 0 }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
