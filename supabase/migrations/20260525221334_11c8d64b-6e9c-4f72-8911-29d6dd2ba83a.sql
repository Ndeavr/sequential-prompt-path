DROP VIEW IF EXISTS public.v_autopilot_pipeline;
CREATE VIEW public.v_autopilot_pipeline
WITH (security_invoker = true) AS
SELECT r.id AS run_id,
    r.trade, r.cities,
    r.status AS run_status,
    r.current_stage, r.last_step, r.next_action,
    r.block_reason, r.alert_admin, r.dry_run,
    r.simulation_mode, r.execution_mode,
    r.target_limit,
    COALESCE(r.target_count, r.target_limit) AS target_count,
    r.stats, r.error_message,
    r.created_at, r.started_at, r.finished_at,
    GREATEST(r.scraped_count::bigint, COALESCE(co.scraped, 0::bigint)) AS scraped_count,
    r.simulated_count,
    GREATEST(r.enriched_count::bigint, COALESCE(co.enriched, 0::bigint)) AS enriched_count,
    r.deduplicated_count, r.scored_count, r.personalized_count,
    r.sent_count, r.opened_count,
    GREATEST(r.clicked_count::bigint, COALESCE(cl.clicks, 0::bigint)) AS clicked_count,
    r.checkout_started_count, r.paid_count, r.activated_count,
    r.pending_count, r.failed_count
FROM autopilot_runs r
LEFT JOIN (
    SELECT autopilot_run_id,
        count(*) AS scraped,
        count(*) FILTER (WHERE email IS NOT NULL OR website_url IS NOT NULL) AS enriched
    FROM outbound_companies
    WHERE autopilot_run_id IS NOT NULL AND is_simulated = false
    GROUP BY autopilot_run_id
) co ON co.autopilot_run_id = r.id
LEFT JOIN (
    SELECT c.autopilot_run_id, count(cl_1.id) AS clicks
    FROM outbound_companies c
    LEFT JOIN outbound_clicks cl_1 ON cl_1.company_id = c.id
    WHERE c.autopilot_run_id IS NOT NULL
    GROUP BY c.autopilot_run_id
) cl ON cl.autopilot_run_id = r.id;