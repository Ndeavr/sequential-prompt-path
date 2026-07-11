// Deno Edge Function: bulk duplicate detection + auto-merge for high-confidence prospects
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const {
      limit = 500,
      auto_merge_threshold = 0.95,
      dry_run = true,
      admin_id = null,
    } = body;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 1. Run detection over recent / unchecked prospects
    const { data: prospects, error: pErr } = await supabase
      .from('contractor_prospects')
      .select('id')
      .order('updated_at', { ascending: false })
      .limit(limit);
    if (pErr) throw pErr;

    let detected = 0;
    for (const p of prospects ?? []) {
      const { data } = await supabase.rpc('detect_prospect_duplicates', { p_prospect_id: p.id });
      detected += Number(data ?? 0);
    }

    // 2. Auto-merge pending reviews with confidence >= threshold
    const { data: highConf, error: rErr } = await supabase
      .from('prospect_dedupe_reviews')
      .select('id, candidate_prospect_id, existing_prospect_id, confidence, signals')
      .eq('status', 'pending')
      .gte('confidence', auto_merge_threshold)
      .limit(200);
    if (rErr) throw rErr;

    const merges: any[] = [];
    if (!dry_run) {
      for (const r of highConf ?? []) {
        if (!r.candidate_prospect_id || !r.existing_prospect_id) continue;
        const { data, error } = await supabase.rpc('merge_contractor_prospects', {
          p_keep_id: r.existing_prospect_id,
          p_drop_id: r.candidate_prospect_id,
          p_admin_id: admin_id,
          p_reason: `auto_merge>=${auto_merge_threshold}`,
        });
        if (error) {
          merges.push({ review_id: r.id, error: error.message });
        } else {
          await supabase
            .from('prospect_dedupe_reviews')
            .update({ status: 'merged', reviewed_at: new Date().toISOString(), reviewed_by: admin_id })
            .eq('id', r.id);
          merges.push({ review_id: r.id, result: data });
        }
      }
    }

    // 3. Integrity report
    const { data: report } = await supabase.rpc('pipeline_data_integrity_report');

    return new Response(JSON.stringify({
      success: true,
      scanned: prospects?.length ?? 0,
      new_review_candidates: detected,
      auto_merge_candidates: highConf?.length ?? 0,
      merges,
      dry_run,
      integrity_report: report,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
