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
    const appointmentId = body?.appointmentId as string
    const rating = body?.rating as number
    const wasOnTime = body?.wasOnTime as boolean | undefined
    const wasProfessional = body?.wasProfessional as boolean | undefined
    const wouldRecommend = body?.wouldRecommend as boolean | undefined
    const comment = body?.comment as string | undefined

    if (!appointmentId || !rating || rating < 1 || rating > 5) {
      return new Response(JSON.stringify({ ok: false, error: 'appointmentId and rating (1-5) required' }), { status: 400, headers: corsHeaders })
    }

    // Verify ownership
    const { data: appointment, error: apptErr } = await serviceSupabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single()

    if (apptErr || !appointment) {
      return new Response(JSON.stringify({ ok: false, error: 'Appointment not found' }), { status: 404, headers: corsHeaders })
    }

    if (appointment.homeowner_user_id !== userId) {
      return new Response(JSON.stringify({ ok: false, error: 'Forbidden' }), { status: 403, headers: corsHeaders })
    }

    // Insert feedback
    const { error: feedbackErr } = await serviceSupabase
      .from('appointment_feedback')
      .insert({
        appointment_id: appointmentId,
        lead_id: appointment.lead_id,
        property_id: appointment.property_id,
        homeowner_profile_id: userId,
        contractor_id: appointment.contractor_id,
        rating,
        was_on_time: wasOnTime ?? null,
        was_professional: wasProfessional ?? null,
        would_recommend: wouldRecommend ?? null,
        comment: comment ?? null,
      })

    if (feedbackErr) {
      return new Response(JSON.stringify({ ok: false, error: feedbackErr.message }), { status: 500, headers: corsHeaders })
    }

    // Recalculate contractor scores
    if (appointment.contractor_id) {
      const { data: allFeedback } = await serviceSupabase
        .from('appointment_feedback')
        .select('rating, was_on_time, would_recommend')
        .eq('contractor_id', appointment.contractor_id)

      const rows = allFeedback ?? []
      const total = rows.length

      if (total > 0) {
        const avgReviewScore = rows.reduce((s, r) => s + (r.rating || 0), 0) / total
        const onTimeRate = (rows.filter(r => r.was_on_time === true).length / total) * 100
        const recommendationRate = (rows.filter(r => r.would_recommend === true).length / total) * 100
        const rankingScore = (avgReviewScore * 10) * 0.55 + onTimeRate * 0.2 + recommendationRate * 0.25

        const { data: existing } = await serviceSupabase
          .from('contractor_scores')
          .select('id, appointments_completed')
          .eq('contractor_id', appointment.contractor_id)
          .maybeSingle()

        if (existing) {
          await serviceSupabase.from('contractor_scores').update({
            avg_review_score: Math.round(avgReviewScore * 100) / 100,
            on_time_rate: Math.round(onTimeRate * 100) / 100,
            recommendation_rate: Math.round(recommendationRate * 100) / 100,
            ranking_score: Math.round(rankingScore * 100) / 100,
            appointments_completed: (existing.appointments_completed ?? 0) + 1,
            updated_at: new Date().toISOString(),
          }).eq('contractor_id', appointment.contractor_id)
        } else {
          await serviceSupabase.from('contractor_scores').insert({
            contractor_id: appointment.contractor_id,
            avg_review_score: Math.round(avgReviewScore * 100) / 100,
            on_time_rate: Math.round(onTimeRate * 100) / 100,
            recommendation_rate: Math.round(recommendationRate * 100) / 100,
            ranking_score: Math.round(rankingScore * 100) / 100,
            appointments_completed: 1,
          })
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: corsHeaders })
  }
})
