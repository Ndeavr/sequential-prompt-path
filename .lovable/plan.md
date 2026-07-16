# Correction critique : Offre Fondateur 1$ / 7j / 599$ + intégrité auto-réparée

## Problème observé
Au clic sur « Activer mon profil Fondateur — 1 $ », Stripe reçoit le plan Premium normal (599 $/mois, total 688,70 $ aujourd'hui) au lieu de l'offre Fondateur (1 $ aujourd'hui, essai 7 jours, puis 599 $/mois). En parallèle, l'écran d'analyse coche en vert des vérifications non prouvées, et le score AIPP s'affiche sur des données absentes / saisies mais marquées manquantes. Le toast Alex est illisible.

## Approche
Une seule source de vérité pour l'offre (`billing_offers`), un edge function de validation qui bloque toute création Stripe si le montant du jour dépasse 2 $, séparation stricte `provided_unverified` vs `verified`, animation d'analyse pilotée par les vrais statuts, moniteur d'intégrité + cockpit admin.

---

## Phase 1 — Bloquer immédiatement le mauvais checkout (P0)

1. **`billing_offers` table** (migration)
   - `offer_code`, `activation_amount_cents`, `trial_days`, `recurring_amount_cents`, `stripe_activation_price_id`, `stripe_recurring_price_id`, `max_founder_spots`, `is_active`
   - Seed : `founder_premium_7d` → 100 cents / 7 j / 59900 cents / CAD
   - RLS : lecture publique `is_active = true`, écriture service_role uniquement

2. **Edge function `validate-checkout-offer`**
   - Input : `{ contractor_id, offer_code }`
   - Charge l'offre, refuse si `activation_amount_cents > 200` pour Fondateur
   - Retourne les IDs Stripe validés + montants attendus
   - Journalise dans `system_integrity_incidents` toute divergence

3. **Edge function `create-founder-checkout` (réécriture)**
   - Appelle `validate-checkout-offer` avant tout
   - Crée session Stripe `mode: subscription` avec :
     - `line_items: [{ price: stripe_recurring_price_id, quantity: 1 }]`
     - `subscription_data.trial_period_days: 7`
     - `subscription_data.add_invoice_items: [{ price: stripe_activation_price_id }]` pour facturer 1 $ aujourd'hui
     - `automatic_tax.enabled: true` (TPS/TVQ QC)
   - Refuse d'ouvrir Stripe si montant du jour ≠ 1 $ + taxes

4. **Front `FounderOfferCard` + page checkout Fondateur**
   - Supprime tout appel au flux Premium normal
   - Bouton unique : « Payer 1 $ et activer mon profil »
   - Affiche : « 1,00 $ + taxes aujourd'hui · 7 jours d'accès · puis 599 $/mois + taxes dans 7 jours »
   - Retire toute mention de 688,70 $ / 599 $ aujourd'hui / « recevez des rendez-vous »

---

## Phase 2 — Statuts de vérification honnêtes (P0)

5. **Table `contractor_verification_signals`**
   - `signal_type` (website, google_business, logo, reviews, service_areas, rbq, neq, phone, email…)
   - `status` : `queued | running | found | verified | not_found | needs_confirmation | failed | timeout | skipped`
   - `evidence_json`, `source_name`, `checked_at`, `verified_at`
   - RLS : contractor lit ses signaux, service_role écrit

6. **Composant `VerificationStepIndicator`**
   - Coche verte **uniquement** si `status = verified` ET `evidence_json` non vide ET `source_name` présent
   - Autres statuts : icônes/couleurs distinctes (bleu running, orange needs_confirmation, gris not_found, rouge failed)
   - Aucune animation minutée : progression = `terminal_count / total`

7. **Front `AnalyseEnCours` (page /entrepreneur/analyse)**
   - Subscribe realtime sur `contractor_verification_signals` du contractor
   - Retire les timeouts fictifs qui cochent des étapes

---

## Phase 3 — Analyse réelle & données saisies préservées (P0)

8. **Moteur d'analyse (`analyze-contractor-entity` edge function)**
   - Ordre : lire les valeurs du formulaire → normaliser tél/domaine → fetch site → extraire métadonnées → Google Business → RBQ/NEQ
   - Écrit chaque signal avec son vrai statut
   - Valeurs saisies par l'utilisateur : `status = found` + `evidence.source = user_input` jusqu'à validation externe → jamais `not_found`

9. **Score AIPP conditionnel**
   - Composant `AippScoreCard` : n'affiche un score que si ≥ 3 signaux `verified` + confidence ≥ seuil
   - Sinon affiche « Analyse préliminaire — informations à confirmer »

---

## Phase 4 — Toast Alex lisible (P1)

10. **Tokens CSS**
    - Ajoute `--toast-dark-bg`, `--toast-dark-title`, `--toast-dark-body` dans `index.css`
    - Contraste WCAG AA minimum sur surface sombre
    - Composant toast : `max-width` calculé, marges 16 px, z-index au-dessus du CTA fixe, autoclose

---

## Phase 5 — Intégrité & auto-réparation (P1)

11. **Table `system_integrity_incidents`**
    - `incident_type`, `severity` (info/warning/conversion_risk/critical), `entity_type/id`, `detected_value`, `expected_value`, `repair_action`, `repair_status`

12. **Edge function `onboarding-integrity-monitor`** (cron horaire + trigger sur webhook Stripe)
    - Détecte : offre 1 $ envoyée à 599 $, abonnement sans essai, coche verte sans preuve, profil activé sans paiement confirmé, données saisies marquées absentes
    - Auto-répare : re-cast statut à `needs_confirmation`, restaure valeurs du profil, relance analyse, bloque checkout invalide

13. **Webhooks Stripe** (`stripe-webhook` edge function)
    - Gère `checkout.session.completed`, `customer.subscription.*`, `invoice.paid/failed/upcoming`
    - Met `contractor_subscription_status = trialing` + `trial_ends_at = now + 7d` + `founder_activation_paid = true` au paiement initial

14. **Page `/admin/system-integrity`**
    - Liste checkouts Fondateur 24 h avec montant attendu vs envoyé
    - Incidents ouverts + boutons « Réparer », « Reconstruire checkout », « Restaurer profil », « Exécuter audit complet »

---

## Détails techniques

### Stripe : combiner 1 $ upfront + trial 7 j + 599 $/mois
Méthode retenue : `stripe.checkout.sessions.create({ mode: 'subscription', line_items: [premium_monthly], subscription_data: { trial_period_days: 7, add_invoice_items: [founder_activation] } })`. `add_invoice_items` s'ajoute à la première facture, qui est émise immédiatement même en trial → l'entrepreneur paie 1 $ aujourd'hui, rien pendant 7 j, puis 599 $/mois. Stripe Tax calcule TPS/TVQ sur les deux lignes.

### Fichiers touchés (principaux)
```
supabase/migrations/<new>.sql          (billing_offers, contractor_verification_signals, system_integrity_incidents)
supabase/functions/validate-checkout-offer/index.ts    (nouveau)
supabase/functions/create-founder-checkout/index.ts    (réécriture)
supabase/functions/onboarding-integrity-monitor/index.ts (nouveau)
supabase/functions/stripe-webhook/index.ts             (extension)
src/features/founderMode/FounderOfferCard.tsx          (textes + CTA)
src/pages/checkout/PageFounderCheckout.tsx             (nouveau ou refonte)
src/features/verification/VerificationStepIndicator.tsx (nouveau)
src/pages/entrepreneur/PageAnalyseEnCours.tsx          (realtime signals)
src/features/aippScore/AippScoreCard.tsx               (garde-fous)
src/index.css                                          (toast tokens)
src/pages/admin/system-integrity/PageSystemIntegrity.tsx (nouveau)
```

### Secrets requis
- `STRIPE_SECRET_KEY` (déjà présent)
- Stripe Price IDs à créer côté Stripe (via `stripe--create_stripe_product_and_price`) puis stockés dans `billing_offers`

### Hors périmètre
- Refonte visuelle complète de la landing entrepreneur
- Suppression des routes admin orphelines (audit précédent)
- Migration des anciens clients Fondateur déjà facturés à tort (nécessite décision manuelle)

---

## Critères de succès
- Session Stripe Fondateur = 1 $ + taxes aujourd'hui, 599 $ + taxes dans 7 jours, essai 7 j
- Aucune coche verte sans preuve dans `contractor_verification_signals`
- Site/tél/email saisis affichés « à confirmer », jamais « absent »
- Score AIPP masqué si signaux insuffisants
- Toast Alex WCAG AA, ne cache pas le CTA
- `/admin/system-integrity` liste et répare les incidents
- Test E2E : parcours Fondateur du clic à la confirmation avec bons montants

Voulez-vous que je commence par la Phase 1 seule (bloquer le mauvais checkout + créer l'offre Fondateur correcte) ou par les Phases 1–3 d'un coup ?