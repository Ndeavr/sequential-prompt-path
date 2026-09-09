ALTER TABLE public.acquisition_queue DROP CONSTRAINT IF EXISTS acquisition_queue_state_check;

ALTER TABLE public.acquisition_queue
  ADD CONSTRAINT acquisition_queue_state_check
  CHECK (state = ANY (ARRAY[
    'new','verified','ready_sms','ready_email','needs_enrichment','retry',
    'contacted','delivered','clicked','activated','failed','skipped','blocked','quarantined'
  ]));

CREATE INDEX IF NOT EXISTS acquisition_queue_due_idx
  ON public.acquisition_queue (next_action_at)
  WHERE state = ANY (ARRAY['new','verified','ready_sms','ready_email','needs_enrichment','retry']);
