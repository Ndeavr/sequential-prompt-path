# Parité devis ↔ écran ↔ Stripe + alias de repères tarifaires — STAGED (non déployé)

Appliquer seulement après approbation explicite de déploiement :
1. `cp supabase/staged/pricing-checkout-parity/pricingParity.ts supabase/functions/_shared/pricingParity.ts`
2. `patch -p1 < supabase/staged/pricing-checkout-parity/pricing-checkout-parity.patch` (refuser si une section ne s'applique plus)
3. `npx vitest run src/test/pricing-checkout-parity.test.ts`

Effet :
- `compute-pricing-quote` : lecture de `appointment_pricing_benchmarks` via un alias déterministe vers une catégorie existante
  (ex. isolation-d-entretoit → isolation); capacité, territoire et droits restent sur le métier exact. Les nouveaux devis
  isolation utilisent donc le repère ville×métier au lieu de l'économie déclarée. Devis existants inchangés.
- `compute-pricing-quote` action `get` (devis invité) : retire sources, pondérations et marges du payload.
- `create-checkout-session` (devis) : aucun frais de profil sur un devis (seule la Présence décidée par le serveur);
  refus 409 `presence_mismatch` / `checkout_total_mismatch` si la Présence ou le total du premier paiement affiché diffère
  (taxes par ligne comme Stripe). Comparaison sautée avec un code promo (remise calculée par Stripe) ou si un ancien client n'envoie pas les champs.
