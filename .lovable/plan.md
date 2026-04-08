
# CouponManagementNativeCheckoutUNPRO — Plan d'implémentation

## Phase 1 — Base de données (Migration)
Créer les tables fondamentales :
- `coupons` — catalogue complet avec tous les champs demandés
- `coupon_redemptions` — historique d'utilisation
- `billing_events_log` — journal des événements Stripe
- RLS policies pour admin, utilisateurs authentifiés

## Phase 2 — Edge Functions Backend
- `validate-coupon-code` — validation complète côté serveur (éligibilité, limites, plan, rôle, intervalle)
- `apply-coupon-to-checkout` — applique le coupon à la session Stripe (passe le promotion_code au checkout)
- `admin-coupons` — CRUD admin (create, update, archive, list)
- `sync-stripe-coupon` — création automatique du coupon + promotion code côté Stripe

## Phase 3 — Composants Checkout
- Refactorer `PromoCodeInput` → `FormCouponCodeInline` avec :
  - `InputCouponCode`, `ButtonApplyCouponCode`, `ButtonRemoveCouponCode`
  - `BadgeCouponApplied`, `BannerCouponInvalid`, `BannerCouponSuccess`
  - `PanelCouponPriceBreakdown` (prix barré, rabais, total, prix futur)
- Intégrer dans `InlineStripeCheckout` (passer le promotion code Stripe au embedded checkout)

## Phase 4 — Pages Admin
- `PageAdminCoupons` — liste avec filtres (actifs, expirés, fondateurs, partenaires, internes)
- `FormCouponAdminCreate` — formulaire complet de création
- `FormCouponAdminEdit` — édition
- `CardCouponStats` + analytics de redemptions
- `ModalCouponDeleteConfirm`, `ToggleCouponStatus`

## Phase 5 — Webhook & Sync
- Mettre à jour le webhook Stripe existant pour tracker les redemptions de coupons
- Synchroniser `coupon_redemptions` après paiement confirmé

## Approche technique
- La clé publique Stripe reste hardcodée `pk_live_...`
- Le Stripe Embedded Checkout supporte nativement `allowedPromotionCodes` — on passera les codes Stripe
- Pour les coupons internes UNPRO (non-Stripe), validation + ajustement de prix côté edge function avant création de session
- Les tables existantes (`contractor_subscriptions`, etc.) ne sont pas modifiées
