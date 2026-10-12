ALTER TABLE public.contractor_activation_ledger DROP CONSTRAINT IF EXISTS contractor_activation_ledger_action_check;
ALTER TABLE public.contractor_activation_ledger ADD CONSTRAINT contractor_activation_ledger_action_check CHECK (action = ANY (ARRAY['activated','reactivated','deactivated','noop','paid','repaired','fallback_credit_350_granted','free_year_activated','entry_activation_350_paid']));
-- Une seule activation 350 $ par session Stripe, même en cas de livraisons concurrentes.
CREATE UNIQUE INDEX IF NOT EXISTS uq_ledger_entry350_session
  ON public.contractor_activation_ledger ((metadata->>'stripe_session_id'))
  WHERE action = 'entry_activation_350_paid';