-- Idempotence stricte du crédit de repli 350 $ : une session Stripe = un seul crédit.
CREATE UNIQUE INDEX IF NOT EXISTS pricing_transactions_fallback_credit_session_uidx
  ON public.pricing_transactions ((metadata->>'stripe_session_id'))
  WHERE transaction_type = 'fallback_credit_350';

-- Montant minimum inviolable pour tout crédit de repli.
ALTER TABLE public.pricing_transactions
  DROP CONSTRAINT IF EXISTS pricing_transactions_fallback_credit_amount_chk;
ALTER TABLE public.pricing_transactions
  ADD CONSTRAINT pricing_transactions_fallback_credit_amount_chk
  CHECK (transaction_type <> 'fallback_credit_350' OR amount_cents = 35000);

-- Sécurité : un entrepreneur ne peut plus modifier son solde depuis le frontend.
DROP POLICY IF EXISTS "Contractors manage own wallet" ON public.contractor_wallet;
CREATE POLICY "Contractors read own wallet"
  ON public.contractor_wallet
  FOR SELECT
  TO authenticated
  USING (
    contractor_id IN (
      SELECT c.id FROM public.contractors c WHERE c.user_id = auth.uid()
    )
  );

REVOKE INSERT, UPDATE, DELETE ON public.contractor_wallet FROM authenticated;
GRANT SELECT ON public.contractor_wallet TO authenticated;
GRANT ALL ON public.contractor_wallet TO service_role;

REVOKE INSERT, UPDATE, DELETE ON public.pricing_transactions FROM authenticated;
GRANT SELECT ON public.pricing_transactions TO authenticated;
GRANT ALL ON public.pricing_transactions TO service_role;