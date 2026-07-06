## Objectif
1. Rendre la projection "Aujourd'hui vs Avec UNPRO" crédible (chiffres réels, pas gonflés)
2. Afficher clairement "1 $ maintenant · puis 599 $/mois" sur Stripe Checkout et sur l'écran d'activation

---

## 1. Projection réaliste (Step10Projection.tsx)

**Problème actuel** : `today = 1` (fallback max(1, ...)) et `projected = today + min(capacity, topCityDemand)` → saute à 19 sans justification. Aucun tag "IA".

**Fix** :
- `today` = `report.today_jobs_per_month ?? 4` (garder 4 comme fallback humain, pas 1)
- `projected` = `today + min(capacity, demandeRéelleTop, RDVduPlanChoisi)`, où `RDVduPlanChoisi = plan.appointmentsIncluded`
- Cap dur : `projected ≤ today + plan.appointmentsIncluded` (jamais promettre plus que le plan livre)
- Ajouter petit label sous la barre verte : **"Projection basée sur IA · {ville} · plan {planName}"** avec icône Sparkles
- Sous-ligne : "{demandeRéelle} propriétaires en attente · {capacityCappée} captables ce mois"
- Retirer le "+18" trompeur → afficher "+{delta} rendez-vous IA / mois"

## 2. Transparence "1 $ maintenant puis 599 $" sur Stripe

**Problème actuel** : Stripe Checkout affiche seulement "CA$1.00", zéro mention du renouvellement à 599 $. C'est ce qui a été encerclé.

**Fix `supabase/functions/scan-ia-activate/index.ts`** :
- Recevoir `plan_slug` + `plan_monthly_price` du frontend (déjà passe `recommended_plan`)
- Nom du line item : `"Activation IA UNPRO — Plan {Name}"` (ex: "Plan Premium")
- Description Stripe enrichie : `"Essai 7 jours à 1 $. Puis {prix} $/mois + taxes QC ({total} $/mois). Annulation en 1 clic avant le jour 8."`
- Métadonnées : `plan_slug`, `plan_monthly_price_cents`, `next_charge_date` (J+8)
- Passer `custom_text.submit.message` : `"Vous payez 1 $ aujourd'hui. Le {date J+8}, votre plan {Name} démarre à {total} $/mois taxes incluses. Annulation en 1 clic."`
- (Optionnel Phase 2) : passer à `mode: "subscription"` avec `trial_period_days: 7` + `subscription_data.trial_settings.end_behavior.missing_payment_method: "cancel"` pour que Stripe affiche nativement "Then $599/month after 7 days". Mais nécessite d'avoir un vrai `stripe_monthly_price_id` par plan — le catalogue actuel (`plan_catalog.stripe_monthly_price_id`) l'a, donc faisable proprement.

**Recommandation : Phase 2 (vrai subscription avec trial)** — c'est ce que l'utilisateur veut voir "1 $ maintenant puis 599 $" natif dans Stripe. Utiliser `usePlanCatalog` pour récupérer le `stripeMonthlyPriceId` du plan choisi et créer une Checkout Session en mode subscription avec :
```ts
mode: "subscription",
line_items: [{ price: stripeMonthlyPriceId, quantity: 1 }],
subscription_data: {
  trial_period_days: 7,
  description: `Plan ${planName} · Essai 7 jours à 1 $`,
},
// Frais d'activation 1 $ via invoice_items ou une ligne setup_fee séparée
```
Fallback si pas de `stripe_monthly_price_id` en base : mode payment actuel + custom_text explicite.

## 3. StepActivate — cohérence copy

- Remplacer "Essai activation · 1 $ / 7 jours" par un bloc en 2 lignes :
  - Ligne 1 grande : **"1 $ aujourd'hui"**
  - Ligne 2 : **"puis {total} $/mois taxes incluses dès le {date J+8}"**
- Bouton : `"Activer pour 1 $ → puis {prix arrondi}$/mois"` (au lieu de "Activer maintenant")

## 4. Fichiers touchés

- `src/pages/scan-ia/wizard/Step10Projection.tsx` — chiffres réels + tag IA + cap sur plan
- `src/pages/scan-ia/wizard/StepActivate.tsx` — copy "1 $ aujourd'hui puis X $/mois", bouton explicite, passer `plan_monthly_price_cents` + `stripe_price_id` à l'edge
- `supabase/functions/scan-ia-activate/index.ts` — mode `subscription` + `trial_period_days: 7` + setup fee 1 $ via `add_invoice_items`, fallback mode payment avec `custom_text` si price_id absent
- `src/hooks/usePlanCatalog.ts` — pas de changement, juste lecture depuis StepActivate

## Succès
- Step10 : `Aujourd'hui = 4` (ou vrai chiffre), `Avec UNPRO = today + min(capacity, demande, plan.RDV)`, tag "IA · ville · plan" visible
- Stripe Checkout affiche natif : `"CA$1.00 due today"` + `"Then CA$599.00/month starting July 13, 2026"`
- StepActivate : bloc prix montre "1 $ aujourd'hui · puis 688,70 $/mois taxes incl. dès le 13 juillet"
- Bouton : "Activer pour 1 $ → puis 599 $/mois"