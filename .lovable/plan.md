## Phase B — Landing prospect + Stripe→AIPP auto-publish (livraison complète)

Boucle l'autopilot end-to-end : email envoyé → prospect clique → landing personnalisée premium avec son score AIPP réel + faiblesses + Alex + checkout → paiement → profil entrepreneur publié automatiquement + email de bienvenue.

---

### 1. Données (1 migration)

**Nouvelles colonnes `outbound_leads`:**
- `landing_slug` text unique (généré : `slugify(company)-{shortId}`)
- `landing_token` text unique (sécurité contre énumération)
- `landing_first_viewed_at`, `landing_last_viewed_at`, `landing_view_count` int default 0
- `checkout_initiated_at`, `checkout_session_id`, `checkout_plan_code`
- `paid_at`, `published_contractor_id` uuid (FK `contractors.id`)
- `publish_status` enum : `pending|published|failed`

**Nouvelle table `outbound_landing_events`** : `lead_id, event_type (view|cta_click|alex_open|checkout_start|paid|published), payload jsonb, ip, ua, created_at`. RLS: insert public + select admin only.

**Vue `v_outbound_funnel`** : agrège views→clicks→checkout→paid→published par jour/trade/ville.

**Trigger** : à l'insert d'un lead par autopilot-mvp, génère `landing_slug` + `landing_token` automatiquement.

---

### 2. Edge functions

**`outbound-landing-resolve` (public, verify_jwt=false)**
- GET `?slug=...&t=...` → vérifie token, log view dans `outbound_landing_events`, incrémente view_count, retourne `{ lead, aipp_score, weaknesses, recommended_plan, company_meta }`.
- Calcule plan recommandé via logique existante `compute-plan-recommendation` (score < 40 → Pro, 40-60 → Premium, 60+ → Élite).

**`outbound-checkout-start` (public)**
- POST `{ slug, token, plan_code }` → crée Stripe Checkout session avec `metadata: { lead_id, slug, source: "outbound_landing" }`, log event, retourne URL.
- Réutilise `create-contractor-checkout` existant (wrapper qui injecte metadata).

**`outbound-checkout-webhook` (public, signature Stripe)**
- Sur `checkout.session.completed` avec `metadata.source = "outbound_landing"` :
  1. Marque `outbound_leads.paid_at`, `checkout_session_id`, `checkout_plan_code`
  2. Appelle `outbound-publish-contractor` (chaîne interne)
  3. Log `paid` event

**`outbound-publish-contractor` (interne, service-role)**
- Crée ou met à jour ligne `contractors` à partir des données enrichies du lead (business_name, phone, website, rbq, neq, address, services, trade, google_rating, google_review_count).
- Crée `contractor_scores` avec AIPP réel.
- Crée `contractor_plans` ligne active avec plan acheté.
- Génère slug public `/entrepreneur/:slug`.
- Marque `outbound_leads.published_contractor_id`, `publish_status='published'`, log `published`.
- Envoie email bienvenue via `send-transactional-email` existant (template "contractor_welcome") avec lien magic vers `/contractor/onboarding?lead=...` pour finir profil (photo, équipe, avant-après).

**`outbound-magic-link` (public)**
- GET `?lead_id=...&token=...` → crée user Supabase auth (passwordless), lie à `contractor.user_id`, redirige `/contractor/dashboard`.

---

### 3. UI publique — Landing /pro/diagnostic/:slug

Route React, dark cinematic theme (memory:premium-cinematic-theme), mobile-first.

**Sections (scroll narratif) :**
1. **Hero personnalisé** : `Bonjour {prénom_dirigeant_si_connu}, voici l'analyse IA de {Nom Entreprise}` + AIPP score animé /100 + verdict en 1 phrase.
2. **Breakdown 5 dimensions** (Web, Google, Trust, AI Readiness, Conversion) avec barres + chiffres réels.
3. **3 faiblesses critiques** identifiées (cards avec icônes, impact $ estimé).
4. **Projection revenus** : "Avec ces 3 corrections + UNPRO, +{X} rendez-vous/mois = +{Y}$ revenus annuels" (utilise `compute-plan-recommendation`).
5. **Plan recommandé** sticky avec CTA Stripe inline (Payment Element existant) + 2 alternatives.
6. **Alex orb** flottant : voice-first, prompt contextuel `"Tu parles à {dirigeant} de {entreprise}, score AIPP {X}, faiblesses : {liste}. Explique le plan en 30 sec."` (réutilise `alexCopilotEngine` + `alexVoiceConfig`).
7. **Trust strip** : RBQ, NEQ, témoignages, garantie 30j.
8. **Footer minimal** avec lien désabonnement.

Composants : `PageOutboundLanding.tsx`, `AippScoreReveal` (réutilise `mem://features/aipp-score-reveal-engine`), `WeaknessCard`, `RevenueProjection`, `RecommendedPlanCard`, `OutboundAlexOrb`.

Tracking : appel `outbound-landing-resolve` au mount (view) + events sur scroll, CTA click, Alex open, checkout start.

---

### 4. UI admin — Dashboard funnel `/admin/outbound/landing-funnel`

Tableau live (refresh 10s) : par lead → status (sent, viewed, alex_engaged, checkout_started, paid, published), views, last_seen, CTA "Voir landing", "Republier".

KPIs en haut : conversion rate (sent→view, view→checkout, checkout→paid), revenus 7j/30j, top trades convertissant.

Branchée sur `v_outbound_funnel`.

---

### 5. Intégration autopilot-mvp existant

Modifier `autopilot-mvp/index.ts` :
- À l'insertion du lead, capturer `landing_slug` + `landing_token` retournés.
- Personnalisation Gemini : injecter URL landing `https://app.unpro.ca/pro/diagnostic/{slug}?t={token}` dans le prompt + email body.

---

### 6. Stripe

- Vérifier `STRIPE_SECRET_KEY` (déjà présent, mémoires confirment Stripe natif actif).
- Ajouter secret `STRIPE_WEBHOOK_SECRET_OUTBOUND` (l'utilisateur le configurera après création du webhook côté Stripe dashboard pointant sur `outbound-checkout-webhook`).
- Wrapper `create-contractor-checkout` accepte param `metadata` pour pass-through.

---

### 7. Email de bienvenue

- Template `contractor_welcome.tsx` dans `supabase/functions/_shared/email-templates/` : confirmation paiement, score AIPP, plan activé, magic link onboarding, prochaines étapes.
- Branché sur `send-transactional-email` (queue pgmq existante).

---

### 8. Sécurité

- Token URL signé (HMAC, secret `OUTBOUND_LANDING_SECRET` à ajouter).
- Rate-limit `outbound-landing-resolve` (5 req/min par IP via simple table in-memory edge).
- Webhook Stripe : vérification signature stricte.
- RLS landing_events : public insert, admin select only.

---

### Risques & non-objectifs

**Pas dans cette phase** : refonte route `/entrepreneur/:slug` publique (existe déjà), refacto `contractors`, suppression `acq_*` legacy, SMS fallback (déjà branché ailleurs).

**Risques** :
- Si `outbound_leads` n'a pas tous les champs enrichis attendus → fallback gracieux (score affiché, faiblesses génériques par défaut).
- Race condition double-paiement → idempotency Stripe + lock sur `outbound_leads.paid_at IS NULL`.

---

### Succès

Un prospect Isolation Laval reçoit l'email envoyé par autopilot → clique → voit son score AIPP réel + plan recommandé → engage Alex 30 sec → paie via Stripe → 5 sec plus tard son profil `/entrepreneur/isolation-xyz-laval` est live + il reçoit email magic-link pour compléter onboarding. Admin voit toute la chaîne dans `/admin/outbound/landing-funnel`.

---

### Détails techniques (résumé)

- **Migration** : `outbound_leads` (colonnes landing/paid/published), `outbound_landing_events` (table+RLS), trigger slug, vue `v_outbound_funnel`.
- **Edge functions (5 nouvelles)** : `outbound-landing-resolve`, `outbound-checkout-start`, `outbound-checkout-webhook`, `outbound-publish-contractor`, `outbound-magic-link`.
- **Edge functions modifiées (2)** : `autopilot-mvp` (capture slug/URL), `create-contractor-checkout` (accepte metadata).
- **Routes React (2)** : `/pro/diagnostic/:slug` (public landing), `/admin/outbound/landing-funnel` (admin).
- **Composants nouveaux (~8)** sous `src/features/outboundLanding/`.
- **Secrets à ajouter** : `OUTBOUND_LANDING_SECRET` (HMAC), `STRIPE_WEBHOOK_SECRET_OUTBOUND`.
- **Email template** : `contractor_welcome` via queue pgmq existante.
- **Stack respecté** : dark cinematic #050816, Inter -0.04em, ElevenLabs Sophia voice ID locked, Stripe Payment Element fr-CA, esm.sh@2.49.1 pour Supabase.
