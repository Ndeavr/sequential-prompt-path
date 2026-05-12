# Activation Live — 3 correctifs critiques

## 1. Score AIPP réel (actuellement 0/100)

**Cause**: dans `supabase/functions/activation-pipeline-start/index.ts`, la fonction `score5()` cherche des clés (`has_https`, `has_h1`, `phone`, `address`, `logo_url`, `services_count`…) qui n'existent pas dans `signals`. La fonction `aipp-real-scan` retourne en réalité : `has_ssl`, `has_logo`, `has_reviews`, `phones_found[]`, `emails_found[]`, `description`, `title`, `social_links{}`, `links_count`, `has_jsonld`… → tous les buckets = 0.

**Correctif**: réécrire `score5()` pour mapper les vraies clés produites par `aipp-real-scan`. Exemple :
- web (20): `has_ssl`, `title`/`description` non vides, `has_logo`, `links_count > 5`, `has_jsonld`
- google (20): `phones_found.length`, `emails_found.length`, `address`/`city` détectés
- trust (20): `rbq_number`, `neq`, `has_reviews`, `years_in_business`
- ai_visibility (25): `has_jsonld`, `has_faq`, services détectés, `has_about`
- conversion (15): CTA détecté, téléphone cliquable, `mobile_friendly`

Vérifié sur `isroyal.ca` : signaux SSL+logo+reviews+phones+emails+description présents → score doit remonter à ~50–65.

## 2. « Vérifier maintenant » non fonctionnel

**Cause**: `TagInput` exige un clic dans le menu déroulant. L'utilisateur tape "isolation"/"Terrebonne" mais aucun chip n'est créé → `categoryTags=[]` → bouton désactivé/inactif.

**Correctif** dans `src/components/founder-plans/TagInput.tsx` :
- Touche **Enter** (et virgule) → sélectionne automatiquement la 1ʳᵉ suggestion filtrée
- Touche **Tab** → idem
- Si aucune suggestion mais texte tapé → fallback en chip libre (slug = slugify(query))
- Au blur, si une seule suggestion correspond exactement → l'ajouter automatiquement

Pas de changement au RPC `check_territory_availability`.

## 3. « Activer mon profil — 1 $ » / « Réserver » → vrai paiement Stripe

**Cause**: 
- Bouton sur `/contractor/analysis` navigue vers `/fondateur/plans?from=...` au lieu d'ouvrir un checkout.
- Bouton « Réserver maintenant » sur la landing fondateur scroll vers `#plans` au lieu d'ouvrir le checkout.

**Correctif**:

a) Nouvel edge function `activation-create-checkout` :
- Entrée : `{ run_id }`
- Charge le `activation_pipeline_runs.recommended_plan` + extraction (domain, business_name, email)
- Crée une Stripe Checkout Session **mode=payment**, ligne unique price_data 100 ¢ CAD « Activation Fondateur UNPRO — {plan} »
- `customer_email` = email extrait (sinon laisse Stripe collecter)
- Métadonnées : `run_id`, `plan`, `domain`, `aipp_score`
- `success_url`: `/contractor/activated?session={CHECKOUT_SESSION_ID}&run={run_id}`
- `cancel_url`: `/contractor/analysis?run={run_id}`
- Aucune auth requise (guest checkout) — service role pour lire le run.

b) Edge function `activation-confirm` (appelée sur la page `/contractor/activated`) :
- Vérifie `stripe.checkout.sessions.retrieve(session_id).payment_status === 'paid'`
- Met à jour `activation_pipeline_runs.pipeline_status='activated'` + crée/active le profil entrepreneur (`contractors` row, `is_founder=true`, `founder_plan=plan`)
- Insère un event `system_events` (`type='contractor_activated'`)

c) Page `src/pages/contractor/PageContractorActivated.tsx` (nouvelle) :
- Loader → appelle `activation-confirm` → confirmation visuelle + CTA « Compléter mon profil » vers `/pro/onboarding?run=...`

d) Wiring UI :
- `PageContractorAnalysisLive.tsx` : remplacer `navigate('/fondateur/plans?...')` par `supabase.functions.invoke('activation-create-checkout', { body: { run_id }})` puis `window.location.href = data.url` (nouvelle session Stripe).
- `SectionFinalCTAFounder.tsx` : « Réserver maintenant » → si `?from=<runId>` présent dans l'URL, lance le même checkout ; sinon scroll plans (comportement actuel pour le parcours non-pipeline).

## 4. Routes & Database

- Ajouter route `/contractor/activated` dans `src/app/router.tsx`.
- Migration : ajouter colonnes à `activation_pipeline_runs` si absentes : `stripe_session_id text`, `activated_at timestamptz`, `contractor_id uuid`. Status `'activated'` autorisé.

## 5. Validation live

1. `isroyal.ca` → score ≥ 40, plan recommandé.
2. Vérifier maintenant avec « isolation » + Enter, « Terrebonne » + Enter → résultats.
3. Bouton « Activer mon profil — 1 $ » → ouvre Stripe Checkout réel à 1,00 $ CAD.
4. Paiement test → redirection `/contractor/activated` → run.status=`activated`, contractor créé.

## Files touched

- `supabase/functions/activation-pipeline-start/index.ts` (réécriture `score5`)
- `supabase/functions/activation-create-checkout/index.ts` (nouveau)
- `supabase/functions/activation-confirm/index.ts` (nouveau)
- `supabase/migrations/<ts>_activation_checkout.sql`
- `src/components/founder-plans/TagInput.tsx` (Enter/Tab/blur)
- `src/components/founder-plans/SectionFinalCTAFounder.tsx` (run-aware CTA)
- `src/pages/contractor/PageContractorAnalysisLive.tsx` (CTA → checkout)
- `src/pages/contractor/PageContractorActivated.tsx` (nouveau)
- `src/app/router.tsx` (route)
