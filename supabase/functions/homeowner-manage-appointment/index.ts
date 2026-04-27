import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Content-Type': 'application/json',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await (supabase.auth as any).getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }
    const userId = claimsData.claims.sub

    const body = await req.json()
    const appointmentId = body?.appointmentId as string | undefined
    const action = body?.action as 'confirm' | 'cancel' | 'reschedule_request' | undefined
    const reason = body?.reason as string | undefined

    if (!appointmentId || !action) {
      return new Response(JSON.stringify({ ok: false, error: 'appointmentId and action required' }), { status: 400, headers: corsHeaders })
    }

    // Verify ownership: appointment must be linked to a lead owned by this user
    const { data: appointment, error: apptErr } = await serviceSupabase
      .from('appointments')
      .select('*, lead:leads(*)')
      .eq('id', appointmentId)
      .single()

    if (apptErr || !appointment) {
      return new Response(JSON.stringify({ ok: false, error: 'Appointment not found' }), { status: 404, headers: corsHeaders })
    }

    const lead = appointment.lead
    // Check ownership via lead or homeowner_user_id
    if (appointment.homeowner_user_id !== userId && (!lead || lead.owner_profile_id !== userId)) {
      return new Response(JSON.stringify({ ok: false, error: 'Forbidden' }), { status: 403, headers: corsHeaders })
    }

    if (action === 'confirm') {
      const { error } = await serviceSupabase
        .from('appointments')
        .update({ homeowner_confirmed: true, status: 'confirmed' })
        .eq('id', appointmentId)
      if (error) return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500, headers: corsHeaders })
      return new Response(JSON.stringify({ ok: true, action }), { headers: corsHeaders })
    }

    if (action === 'cancel') {
      const { error } = await serviceSupabase
        .from('appointments')
        .update({ status: 'cancelled', cancellation_reason: reason ?? null })
        .eq('id', appointmentId)
      if (error) return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500, headers: corsHeaders })

      if (lead) {
        await serviceSupabase.from('leads').update({ status: 'contacted', matching_status: 'accepted' }).eq('id', lead.id)
      }
      return new Response(JSON.stringify({ ok: true, action }), { headers: corsHeaders })
    }

    if (action === 'reschedule_request') {
      const { error } = await serviceSupabase
        .from('appointments')
        .update({ status: 'reschedule_requested', reschedule_reason: reason ?? null })
        .eq('id', appointmentId)
      if (error) return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500, headers: corsHeaders })
      return new Response(JSON.stringify({ ok: true, action }), { headers: corsHeaders })
    }

    return new Response(JSON.stringify({ ok: false, error: 'Invalid action' }), { status: 400, headers: corsHeaders })
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: corsHeaders })
  }
})
