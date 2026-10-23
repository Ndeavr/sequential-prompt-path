-- PROMO entrée 350 $ : un seul reçu payé par code promotionnel Stripe, tous comptes confondus.
-- Clé = ID Stripe promotion_code (TEST et LIVE ont des IDs distincts). Additif, non destructif.
-- STAGED: à appliquer uniquement lors de la mise en service contrôlée du code PROMO.
CREATE UNIQUE INDEX IF NOT EXISTS uq_entry350_single_promo_redemption
  ON public.contractor_activation_ledger ((metadata->>'promo_code_id'))
  WHERE action = 'entry_activation_350_paid'
    AND COALESCE(metadata->>'promo_code_id', '') <> '';
