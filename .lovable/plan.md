## Contexte

Vous avez déjà :
- `/pro/:slug` (PageProLandingNuclearClose) avec voix Alex, scores AIPP, CTAs
- SMS pipeline outbound (Twilio, Live Runs admin)
- Stripe checkout pour plans entrepreneurs
- Tables `outbound_*`, `aipp_*`, contractor onboarding

Ce qui manque pour livrer 100 % du brief :
1. **Short links propres** `go.unpro.ca/{slug}` et `unpro.ca/go/{slug}` (avec tracking clic)
2. **SMS A/B variants** (A, B, C) selon les copies exactes du brief
3. **Offre 1$ / 7 jours** (Stripe coupon + trial) avec activation auto post-paiement
4. **Landing premium** rafraîchie : Hero + Score + Opportunities + Reviews + Territory Map + Activation
5. **Alex auto-greeting** contextualisé entreprise post-activation
6. **Tracking** (delivered, click, scroll, activation, churn)

## Phase 1 — Ce que je construis maintenant (1 prompt = 1 module)

### A. Base de données

Migration unique :
- `prospect_pages` (id, company_name, slug, city, service, visibility_score, ai_score, google_score, opportunities jsonb, google_reviews jsonb, territory_data jsonb, short_link, stripe_customer_id, activated, created_at)
- `sms_campaigns` (id, company_name, phone, sms_variant ['A'|'B'|'C'], sent_at, clicked_at, activated_at, conversion_status, short_link)
- `short_links` (slug PK, target_path, prospect_page_id, click_count, last_clicked_at)
- `short_link_clicks` (id, slug, ts, user_agent, ip_hash, referrer)
- RLS : admin only en écriture, lecture publique sur `prospect_pages` par slug + `short_links` par slug

### B. Routes courtes

Edge function `short-link-resolve` :
- Accepte `/go/:slug` (côté Vite redirect + côté edge pour `go.unpro.ca`)
- Incrémente click_count, log dans `short_link_clicks`
- 302 vers `/pro/:slug` (la page nuclear close existante)

Route React `/go/:slug` qui appelle l'edge function puis redirige.

### C. SMS A/B engine

Edge function `sms-prospect-send` :
- Input: `{ prospect_page_id, variant: 'A'|'B'|'C' | 'auto' }`
- Si `auto` : round-robin pondéré sur les 3 variants
- Build SMS exact selon les 3 templates du brief (company_name, service, city, short_link)
- Envoie via connector Twilio existant
- Insère dans `sms_campaigns` avec `sent_at`

Admin bouton « Envoyer SMS prospect » dans `/admin/live-runs` (déjà partiellement présent — étendre pour choisir variant + créer prospect_page si manquant).

### D. Offre 1$ / 7 jours

- Créer un nouveau Stripe product « UNPRO Activation 7 jours » à 100¢ CAD (one-time)
- Nouveau plan slug `activation_7d` dans `contractorPlans.ts` séparé des plans récurrents
- Edge function `create-activation-checkout` : crée Stripe Checkout session one-time, success_url = `/activation-success?session_id={CHECKOUT_SESSION_ID}&slug={slug}`
- Edge function `activation-confirm` : appelée par la page success, vérifie le payment, marque `prospect_pages.activated = true`, crée le compte auth si absent (magic link envoyé), retourne URL dashboard
- Pas de webhook (per knowledge rule)

### E. Landing premium `/pro/:slug` (refactor)

Composants nouveaux à créer sous `src/components/pro-landing-v2/` :
- `HeroPremium` : logo, nom, ville, métier, score global, badge « Analyse locale prête »
- `VisibilityScoreModule` : 4 barres animées (Google, ChatGPT IA, Reviews Trust, Territory)
- `OpportunitiesGrid` : cartes (volume, difficulté, visibilité, potentiel)
- `GoogleReviewsBlock` : note + nombre + top 3 avis
- `TerritoryMapDynamic` : carte Leaflet ou SVG simplifiée avec glow bleu UNPRO
- `ActivationBlock` : 1$/7j en hero, puis cards Pro/Premium/Elite, CTA Stripe natif
- `AlexGreetingAuto` : déjà existant, juste ajuster le script post-activation

Intégrer dans `PageProLandingNuclearClose.tsx` derrière un flag (V2) pour pouvoir basculer sans casser le V1.

### F. Tracking

- `prospect_page_events` (id, slug, event_type ['view','scroll_25','scroll_75','cta_click','checkout_started','activated'], ts, metadata)
- Hook `useProspectTracking(slug)` injecté dans la landing

### G. Branding strict

- Sanitizer global : reject any text containing `lovableproject.com`, UUIDs, « AI generated », « Internal project »
- Tous les liens affichés à l'utilisateur passent par `formatShortLink()` → toujours `go.unpro.ca/...` ou `unpro.ca/go/...`

## Détails techniques

**Domain routing** : `go.unpro.ca` pointe sur la même app (configuré via DNS/Cloud), une route `/` sur ce host = redirect vers `/go/:slug` ne s'applique pas — on utilise `/go/:slug` côté unpro.ca et un middleware côté edge function pour `go.unpro.ca/:slug` (host check).

**Stripe** : utiliser `create_stripe_product_and_price` tool pour créer le product 1$ une fois. Stocker price ID dans `contractorPlans.ts`.

**Alex post-activation** : `useNuclearCloseFemaleVoice` déjà en place, juste switch script via état `activated`.

**Pas de scope dans Phase 1** :
- Territory map dynamique avancée → version simplifiée (SVG + dots) en P1, Leaflet en P2
- Import automatique Google Reviews → mock + champ manuel admin en P1, API Places en P2
- Webhooks Stripe → exclu par règle (polling via activation-confirm)

## Succès

- Admin peut créer un `prospect_page` depuis `/admin/live-runs`, choisir variant A/B/C, envoyer SMS
- Prospect reçoit SMS conforme à la copie exacte du brief avec lien `go.unpro.ca/...`
- Clic = page premium chargée < 2s mobile, score visible immédiatement
- Bouton « Activer 1$ / 7 jours » → Stripe checkout → retour app → compte créé → Alex parle
- Tous les events trackés dans `prospect_page_events` + `sms_campaigns`
- Zéro fuite lovableproject.com / UUID dans l'UI

## Tâches d'exécution

1. Migration SQL (prospect_pages, sms_campaigns, short_links, short_link_clicks, prospect_page_events + RLS)
2. Créer Stripe product 1$/7j
3. Edge functions : `short-link-resolve`, `sms-prospect-send`, `create-activation-checkout`, `activation-confirm`
4. Route React `/go/:slug`
5. Composants V2 landing (6 composants)
6. Refactor `PageProLandingNuclearClose` avec flag V2
7. Admin UI : créer prospect + envoyer SMS variant dans Live Runs
8. Hook tracking + sanitizer branding

Voulez-vous que je lance Phase 1 immédiatement, ou préférez-vous découper en sous-phases (DB+SMS d'abord, puis landing V2, puis activation 1$) ?