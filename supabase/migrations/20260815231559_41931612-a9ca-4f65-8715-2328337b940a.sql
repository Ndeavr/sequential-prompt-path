UPDATE public.official_source_registry
SET last_run_summary = last_run_summary
  || jsonb_build_object(
       'persisted', 21,
       'persist_failed', 0,
       'persistence', jsonb_build_object(
         'attempted', 21,
         'persisted', 21,
         'failed', 0,
         'chunks_total', 1,
         'chunks_failed', 0,
         'errors', '[]'::jsonb,
         'repaired_note', 'summary_backfilled_after_upsert_ordering_fix'
       )
     ),
    updated_at = now()
WHERE source_key = 'rbq_licences_actives';