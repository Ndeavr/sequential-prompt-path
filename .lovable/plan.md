## Contexte

Le playbook (P0–P5) décrit un MVP linéaire: setup → scrape RBQ → outreach email/SMS → funnel IA → Stripe → go-live. Le projet UNPRO est très en avance sur ce playbook: pipeline outbound complet, sniper engine, AIPP scoring, Stripe natif, onboarding entrepreneur, Alex voice, SEO programmatique. **Re-construire P0–P5 littéralement détruirait des modules supérieurs.** Ce plan extrait uniquement les **gaps réels** entre le playbook et l'existant, et les comble.

## Audit rapide playbook → existant

| Playbook | État actuel | Gap |
|---|---|---|
| P0 Setup, schéma `contractors`, `plans` | Sch. existant beaucoup plus riche (contractor_onboarding_sessions, activation_funnel, AIPP, NEQ) | ❌ Aucun. Plans playbook (Starter/Pro/Enterprise à 0/89/249) **contredisent** memory officielle (Recrue 149 → Signature 1799). Garder pricing actuel. |
| P1 Scrape RBQ + Google Places enrichment | `outbound-autonomous-pipeline`, `data-extraction-engine`, `city-activity-matrix` couvrent scraping + Firecrawl. Pas de scraper RBQ dédié. | ⚠️ Ajouter source RBQ dans le pipeline existant (pas un nouveau system). |
| P2 Outreach email/SMS séquences | `sniper-outreach-engine` (5 edge fns), `outbound-email-scheduling`, `outbound-sms-fallback`, séquences 3 emails + SMS, dédupe, safety. | ✅ Déjà fait, supérieur au playbook. |
| P3 Funnel IA inscription 4 étapes | `contractor-onboarding-landing`, `useContractorFunnel`, `useOnboardingSession`, AIPP score → recommandation plan. | ⚠️ Vérifier que la recommandation IA de plan affiche bien le bon plan + ROI estimé sur l'écran de sélection. |
| P4 Stripe Checkout + Webhooks + Portal | `checkout-architecture` (Payment Element natif), `combined-billing-logic`, `voice-sales-checkout`. PK live fixée. | ⚠️ Vérifier webhook `checkout.session.completed` → activation contractor + email bienvenue Resend. Ajouter `customer-portal` edge function si absente. |
| P5 Go live, monitoring, 404, sitemap | `seo-index-domination`, sitemap, `/admin/operations`, email-health. Pas de Sentry. | ⚠️ Page 404 FR, email bienvenue Resend templaté, checklist launch. |

## Plan d'exécution (3 phases priorisées revenue-first)

### Phase A — Fermer la boucle paiement (revenue critical)
Objectif: zéro friction de plan-recommandation → checkout → activation.

1. **Audit `stripe-webhook` edge function**: confirmer handlers pour `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. Si manquant, ajouter activation contractor + `subscription_status='active'`.
2. **Email bienvenue Resend**: template fr-CA HTML envoyé sur `checkout.session.completed`, avec récap plan, lien dashboard, support@unpro.ca. Brand identity enforcement (UNPRO logo only).
3. **`create-portal-session` edge function**: si absente, ajouter pour que l'entrepreneur gère sa subscription. Bouton "Gérer mon abonnement" dans dashboard contractor.
4. **Validation plan recommandation**: vérifier que `useGoalToPlanEngine` + écran plan-recommendation affichent recommandation IA + ROI estimé + 3 plans avec recommandé highlighté (Recrue/Pro/Premium/Élite/Signature, **pas** Starter/Pro/Enterprise du playbook).

### Phase B — Source RBQ dans le pipeline outbound existant
Objectif: enrichir le sniper avec licence RBQ comme signal de confiance + nouvelle source d'import.

1. **Ajouter `source='rbq'`** dans `outbound_prospects` (déjà extensible via colonne source).
2. **Edge function `scrape-rbq-leads`**: appel registre public RBQ par ville/catégorie, mapping vers les 30 services UNPRO, upsert dans `outbound_prospects` via le pipeline existant (passe par approval gate, dédupe, safety controls — **ne pas court-circuiter**).
3. **UI admin**: ajouter onglet "Import RBQ" dans `/admin/outbound/...` (navigation existante 6 clusters), formulaire ville+services, lance scraping, affiche résultats.
4. **Mapping RBQ catégories → services UNPRO** dans `src/data/` avec test Vitest.

### Phase C — Production hardening
1. **Page 404 FR** (`src/pages/NotFound.tsx`): message warm theme, CTA retour accueil, suggestions Alex.
2. **Sentry**: optionnel, ajouter `@sentry/react` avec `VITE_SENTRY_DSN` env var, capture erreurs React + edge function failures via context Provider.
3. **`LAUNCH_CHECKLIST.md`** racine projet: items du playbook P5 + items spécifiques UNPRO (AIPP scoring live, Alex voice agent ID prod, Stripe live mode, sitemap submitted).
4. **Vérifier `public/robots.txt` et sitemap_index.xml** pointent bien vers prod (déjà fait via `seo-index-domination`).

## Hors scope (volontairement)

- Recréer schéma `contractors`/`plans` du playbook — détruirait l'existant.
- Plans tarifaires Starter/Pro/Enterprise du playbook — contredit la memory officielle (Recrue 149 → Signature 1799).
- Construire un nouveau outreach engine — `sniper-outreach-engine` existe et est supérieur.
- Rebuild onboarding 4 étapes from scratch — `contractor-onboarding-landing` existe.
- Ajouter Twilio (déjà connecté).
- Tables `contractor_leads`, `outreach_events` séparées — utiliser `outbound_prospects` existante.

## Détails techniques

- Toutes les edge functions Deno: `https://esm.sh/@supabase/supabase-js@2.49.1` (memory constraint).
- Resend via connector gateway (déjà connecté).
- Stripe Payment Element natif (pas Stripe Checkout hosted) — memory `checkout-architecture`.
- Pricing: Recrue=149, Pro=349, Premium=599, Élite=999, Signature=1799 (memory officielle).
- Tous textes UI fr-CA.

## Recommandation d'ordre

Commencer par **Phase A** (revenue critical, ~1 sprint), valider qu'un paiement de bout en bout fonctionne, puis Phase B (acquisition), puis Phase C (hardening). Si vous voulez attaquer une phase précise plutôt que les 3, dites-le après approbation.