# Funnel Entrepreneur Conversationnel Continu — Alex Live Layer

Transformer le flow Import → Analyse → AIPP → Plans → Checkout → Paiement en expérience IA continue où Alex reste vivant en permanence. Ajouter un essai 7 jours à 1$ bulletproof avec anti-abus. Refondre les plans en logique "rythme de croissance" (jamais "prix par lead").

## Phase 1 — Floating Alex Guide (couche persistante)

**Nouveau composant : `src/components/alex/FloatingAlexGuide.tsx`**
- Mini orbe (40px) coin bas-droite, persistant pendant tout le funnel entrepreneur
- États : `idle | listening | analyzing | speaking | success | hesitating`
- Bulle de transcription live au-dessus de l'orbe (max 2 lignes, fade in/out)
- Reste visible pendant scroll, Stripe Element, loading
- Tap → ouvre overlay voix Alex existant (`openAlex()` via `AlexVoiceContext`)
- Caché uniquement sur `/admin/*` et `/auth/*`

**Nouveau hook : `src/hooks/useAlexCheckoutNarration.ts`**
- Driver de messages contextuels basé sur l'étape courante
- Rotation intelligente (3–6 messages par étape, 4–8s d'intervalle, jamais en boucle stricte)
- Pas d'audio TTS auto (respecte la règle "voice on tap") — texte seulement par défaut, voix si Alex déjà ouvert
- Détecte hésitation : >20s inactif, scroll sans clic, ouverture promo, retour arrière → micro-intervention

**Nouveau store : `src/stores/alexCheckoutState.ts` (Zustand)**
- État : `importing | analyzing | scoring | recommending | hesitating | trial_offer | checkout | payment_processing | activation_success`
- Contexte : `companyName, city, score, recommendedPlan, hesitationCount`
- Branché par chaque page du funnel via `setStage()`

## Phase 2 — Import & Analyse vivants

Pages concernées : `PageInstantAuditFunnel`, `PageContractorAippAudit`, `PageAuditAIPPv2`
- Brancher `FloatingAlexGuide` + `setStage("importing"|"analyzing"|"scoring")`
- Messages : "Je détecte votre territoire…", "Je compare votre présence locale…", "Analyse des preuves sociales…", "Je vérifie votre visibilité IA."
- Apparition progressive des étapes (stagger 600ms), shimmer loading, jamais d'écran statique

## Phase 3 — AIPP = moment WOW

**Nouveaux composants :**
- `src/components/aipp/OpportunityInsights.tsx` — cartes dynamiques (domination locale, FAQ IA, contenu visuel, avant/après, spécialisation, territoire)
- `src/components/aipp/PotentialScoreCard.tsx` — animation score actuel → score potentiel (compteur progressif + arc gauge)
- Section "Signaux de confiance" (RBQ, entreprise active, avis, présence locale, spécialisation) avec badges verts
- Section "Projection IA" : "Les entreprises similaires avec un profil optimisé obtiennent jusqu'à 3.2x plus de demandes qualifiées dans votre région."

Intégré dans la page résultat AIPP existante sous le score brut.

## Phase 4 — Plans "Rythme de croissance"

**Nouveau composant : `src/components/plans/GrowthPlanCards.tsx`**
- Titre : "Quel rythme de croissance voulez-vous ?"
- 4 plans en cartes verticales premium :
  1. **Activation locale** — ~5 opportunités/mois
  2. **Croissance stable** — ~10/mois — badge "RECOMMANDÉ POUR VOUS" (dynamique selon AIPP)
  3. **Domination régionale** — ~25/mois
  4. **Expansion maximale** — ~50/mois
- Aucune mention "prix par lead", "coût par RDV", "cost per lead"
- Mapping vers les plans existants (`CONTRACTOR_PLANS`) sans modifier la table `pricing_plans` ni Stripe products

Pages mises à jour : `PageOnboardingPlan`, `PricingContractorsPage`, `PageContractorVoiceFirstLanding` (section plans)

Alex parle pendant la sélection (via `FloatingAlexGuide` + `setStage("recommending")`) :
- "Je recommande un volume que votre équipe peut absorber confortablement."
- "Le plan Croissance stable semble le plus adapté à votre profil."

## Phase 5 — Essai 7 jours à 1$

**Nouveau composant : `src/components/trial/TrialActivationCard.tsx`**
- Inséré AVANT le checkout standard (étape pré-checkout)
- Titre : "Tester UNPRO sans risque"
- 6 bénéfices (activation immédiate, dashboard, agenda, visibilité IA, Alex, opportunités)
- CTA principal : "Activer mon essai 7 jours — 1$"
- CTA secondaire : "Voir l'abonnement complet"

**Migration Supabase : table `contractor_trials`**
```
id uuid pk, contractor_id uuid, stripe_customer_id text, stripe_subscription_id text,
plan_code text, started_at timestamptz, ends_at timestamptz, converted_at timestamptz,
cancelled_at timestamptz, status text check (status in ('active','converted','cancelled','expired')),
ip_address inet, rbq text, neq text, phone text, email text, stripe_fingerprint text,
browser_fingerprint text, created_at timestamptz default now()
```
+ GRANTs + RLS (contractor ne voit que ses trials, service_role full).

**Anti-abus (edge function `start-contractor-trial`)**
- Refus si RBQ/NEQ/email/phone/fingerprint déjà présent avec status in ('active','converted','cancelled','expired') dans les 12 derniers mois
- IP rate-limit (max 3 tentatives/jour)
- Stripe customer fingerprint vérifié côté backend

**Stripe**
- Mode trial : abonnement avec `trial_period_days: 7` + `trial_settings.end_behavior.missing_payment_method: 'cancel'`, montant initial de setup_fee 1$ via invoice item (ou price one-time 1$ + subscription qui commence après 7j)
- Mode standard : abonnement direct (existant, intact)
- Pas de webhooks ajoutés (suit la règle "DO NOT USE WEBHOOKS unless asked")
- Edge function de vérification `check-contractor-trial-status` polled

## Phase 6 — Checkout conversationnel premium

**Nouveaux composants :**
- `src/components/checkout/CheckoutConversationBar.tsx` — bandeau sticky haut sous le header avec messages Alex pendant le paiement
- `src/components/checkout/StickyTrustFooter.tsx` — enrichit le footer "Total aujourd'hui" existant avec :
  - micro-trust : "Paiement sécurisé Stripe · Activation immédiate · Annulable en tout temps"
  - micro-bénéfice : "Activation immédiate + visibilité IA incluse"
  - mini orbe Alex animé à gauche du total

Page mise à jour : checkout natif Stripe existant (`/checkout/native/:planCode`)
- `FloatingAlexGuide` reste visible
- `setStage("checkout"|"payment_processing")` selon l'état Stripe Element
- Pas de toucher à la logique Stripe / `contractor_checkouts` / calcul taxes — uniquement couche visuelle + narration

## Phase 7 — Activation success cinématique

Page existante `PageContractorActivated` enrichie :
- Pas de fin abrupte
- Séquence : "Activation en cours…" → confettis subtils → orbe success → progression réelle (5 étapes animées : connexion profil, optimisation visibilité, indexation IA, préparation opportunités, ouverture dashboard)
- `setStage("activation_success")` + message Alex : "UNPRO commence déjà à travailler pour vous."

## Phase 8 — Micro-interactions globales

Tokens animation existants étendus dans `src/index.css` :
- `--ease-spring`, `glow-pulse`, `shimmer`, `typing-dots`, `fade-up-stagger`
- Haptics mobile (`navigator.vibrate(10)`) sur tap plan, CTA paiement, success
- Spring transitions Framer Motion sur cartes plans (déjà installé)

## Technique

**Fichiers créés :**
```
src/components/alex/FloatingAlexGuide.tsx
src/components/plans/GrowthPlanCards.tsx
src/components/trial/TrialActivationCard.tsx
src/components/checkout/CheckoutConversationBar.tsx
src/components/checkout/StickyTrustFooter.tsx
src/components/aipp/OpportunityInsights.tsx
src/components/aipp/PotentialScoreCard.tsx
src/hooks/useAlexCheckoutNarration.ts
src/stores/alexCheckoutState.ts
supabase/functions/start-contractor-trial/index.ts
supabase/functions/check-contractor-trial-status/index.ts
supabase/migrations/<ts>_contractor_trials.sql
```

**Fichiers édités :**
- `src/app/App.tsx` — monter `<FloatingAlexGuide />` global (hidden sur /admin & /auth)
- `src/pages/entrepreneur/PageOnboardingPlan.tsx` — remplacer cartes par `GrowthPlanCards` + insertion `TrialActivationCard`
- `src/pages/PageInstantAuditFunnel.tsx`, `PageContractorAippAudit.tsx`, `PageAuditAIPPv2.tsx` — `setStage()` + insertion `OpportunityInsights` + `PotentialScoreCard`
- Page checkout natif Stripe — ajouter `CheckoutConversationBar` + `StickyTrustFooter`
- `PageContractorActivated.tsx` — séquence cinématique

**Hors scope (intouché) :**
- `/admin/*` (theme sombre préservé)
- `pricing_plans` table, prices Stripe existants, calcul taxes, `contractor_checkouts`
- `AlexBrain`, voice config, prompt Alex, `alexVoiceConfig.ts`
- Edge functions Alex (`alex-sales-process-turn`, etc.)
- Logique RLS / auth existante
- Design tokens light premium (déjà en place)

**Voix Alex :** respecte la règle event-driven — pas d'auto-start TTS pendant le funnel. Texte uniquement dans `FloatingAlexGuide`. Si l'utilisateur tap l'orbe, ouverture overlay voix standard.

## Critères de succès

- Alex visible en permanence pendant import → analyse → AIPP → plans → checkout → paiement → activation
- Aucune mention "prix par lead" / "coût par RDV"
- Essai 7j 1$ disponible avec anti-abus actif (RBQ + NEQ + email + phone + IP + fingerprint)
- Checkout existant fonctionnel (aucune régression Stripe)
- Mobile 384px parfait
- Aucune page admin modifiée
- Aucun écran statique > 3s sans message ou animation Alex
