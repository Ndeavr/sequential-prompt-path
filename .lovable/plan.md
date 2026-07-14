
# Review Intelligence™ — Standalone Revenue Product

Objectif : livrer une valeur immédiate au contracteur dès l'inscription à 1 $, indépendamment des rendez-vous UNPRO. Le contracteur importe ses clients existants, envoie des demandes d'avis, et voit sa réputation structurée en < 5 min.

## 1. Navigation

Ajouter un cluster **Growth** dans `ContractorLayout` (sidebar + `MobileBottomNav`) :
- Review Intelligence™ → `/pro/growth/reviews`
- Project Showcase → `/pro/growth/showcase`
- AI Visibility Score → `/pro/growth/ai-visibility`
- Google Profile Health → `/pro/growth/google-health`
- Reputation Analytics → `/pro/growth/analytics`

MVP livré maintenant : **Review Intelligence™** (les 4 autres restent des stubs "Bientôt" pour ne pas casser la nav).

Ajouter routes dans `src/config/routesConfig.ts` + `src/app/router.tsx`.

## 2. Landing publique `/pro/review-intelligence`

Sections (Framer Motion, thème dark cinematic + glass tokens existants) :
1. **Hero** — visuel Before/After ("Great service." → review structurée détaillée Isolation Solution Royal / R-51 / Terrebonne). CTA `Commencer pour 1 $` (→ checkout Recrue existant `create-checkout-session` avec metadata `product=review_intelligence`), CTA secondaire "Voir un exemple".
2. **Demo animée** — mockup téléphone jouant en boucle : Send Request → SMS → Réponse homeowner → AI génère → Publication → Score contractor monte → Alex recommande. Composants React animés, pas de screenshots.
3. **Value cards** — Better Reviews / More Trust / Better AI Visibility / Structured Reputation.
4. **AI Visibility infographic** — flow glass cards + traits animés SVG.
5. **Carousel comparaison** — Review générique vs Review Intelligence (project type, city, outcome, expertise mis en surbrillance).
6. **CTA final** + FAQ courte.

Visuels générés via `imagegen` (hero abstract, transformation graphic, AI visibility flow, reputation mockup, growth graphic). Pas de stock.

## 3. Dashboard `/pro/growth/reviews`

- KPI hero (6 cartes) : Reviews Collected, Verified, Avg Rating, Requests Sent, Google Conversion, AI Visibility Score.
- Actions primaires :
  - **Send Review Request** (modal : name, phone, email, project type, city, completion date).
  - **Bulk Import** (upload CSV, mapping colonnes, preview, envoi automatique staggered).
- Tableau des demandes envoyées avec statut (sent, opened, submitted, published, expired) + relances.
- Onglets : Requests / Reviews / Analytics.

## 4. Expérience homeowner `/review/:token`

Route publique unauth, mobile-first, `.landing-warm` scope.

Étapes :
1. Rating (grosses étoiles).
2. Travail réalisé (préremplis depuis la demande, éditable).
3. Ce qui a marqué — cards sélectionnables : Communication, Professionnalisme, Propreté, Pédagogie, Qualité, Respect, Valeur, Problème résolu.
4. Expérience libre — texte + voix (MediaRecorder → transcription via edge function `review-transcribe` avec Gemini/Whisper via AI Gateway) + photos/vidéo (Supabase Storage bucket `review-media` public).
5. **AI Draft** — edge function `review-generate-draft` (Gemini 2.5 Flash) produit review structurée. Actions : Approuver / Éditer / Réécrire plus court / plus long.
6. **Publier sur Google** — connecter Google Business Profile via champ `contractors.google_place_id` + `google_review_url`. Écran : logo Google, copier texte, ouvrir URL, tracker click-through, statut `published`.

Voice + photo + video use `permissionManager` contextuel (mic sur clic bouton voix, camera sur clic upload).

## 5. Backend (Supabase)

### Migration
Nouvelles tables (public, avec GRANT explicites + RLS) :
- `review_requests` (id, contractor_id, homeowner_name, phone, email, project_type, city, completion_date, token unique, status, sent_at, opened_at, submitted_at, published_at, expires_at, sequence_step).
- `reviews_v2` (id, request_id, contractor_id, rating, structured_scores jsonb {communication, professionalism, cleanliness, education, quality, respect, value, problem_solved}, raw_text, ai_generated_text, approved_text, voice_transcript, media_urls text[], project_type, city, google_publish_status, google_click_at, created_at).
- `review_reputation_scores` (contractor_id PK, communication, professionalism, cleanliness, trust, quality, education, value, problem_solved, updated_at, sample_size).
- `review_request_sequence_jobs` (id, request_id, run_at, step, status).
- `review_media` (id, review_id, url, kind, order).

RLS : contractors accèdent uniquement à leurs lignes ; token public sur `review_requests` par `token = current_setting('request.token')` via edge function ; service_role pour worker.

### Edge functions
- `review-request-send` — crée request, envoie SMS via Twilio connector (24 h après completion, ou immédiat manuel).
- `review-sequence-cron` — cron `*/15 * * * *` : relances J+3, J+7, stop après.
- `review-token-resolve` — GET public retourne request + contractor branding.
- `review-transcribe` — audio → texte.
- `review-generate-draft` — assemble prompt (rating, work, standout, expérience, transcript) → review 60-120 mots FR structurée.
- `review-submit` — persiste review, déclenche `review-reputation-worker`.
- `review-reputation-worker` — extrait scores structurés (Gemini) + met à jour `review_reputation_scores` + `contractors.rating` + `aipp_score`.
- `review-bulk-import` — parse CSV, dedupe, batch send avec throttle.
- Étendre `stripe-webhook` : quand `product=review_intelligence` payé → activer accès dashboard Growth.

### Intégration UNPRO existante
- Marquage `appointments.status = 'completed'` déclenche insert `review_requests` (trigger DB + edge function auto).
- Alex prompt (`ai/alex/system-prompt-active`) : quand contractor a `sample_size >= 3`, injecter phrase "Basé sur N avis vérifiés, les propriétaires mentionnent [top 3 dimensions]…" au lieu de "4,9 étoiles".

## 6. Profil contractor public

Composant `ReviewsReputationCard` : radial scores (Communication, Professionnalisme, Pédagogie, Qualité, Propreté, Ponctualité, Confiance) + masonry Pinterest-style `ReviewMediaGrid` (before/after photos, videos, project category, ville, date).

Injecté dans `/contractors/:id` sous les KPI existants.

## 7. Automation

- Trigger : appointment completed → job 24 h → SMS → J+3 rappel → J+7 rappel final → stop.
- Manual completion → même séquence.
- Bulk import → étalé 1 SMS / 30 s pour respect Twilio + geo permissions.
- Toutes les opérations passent par `reportOutcome()` + `withRetry()` (Production Reliability Framework).

## 8. Design system

- Landing publique : `.landing-warm` (F7F6F0) suivant Landing Warm Theme mémoire.
- Dashboard + review flow : dark cinematic (#050816) + glass tokens (`--surface-glass`, blur 24px, radius 28px).
- Motion : `transitions.default` (420 ms, easing premium), hover `translateY(-2px)`.
- Typographie Inter, tracking -0.04em H1.
- Utilities `.text-readable*` obligatoires (UI Readability Rule).
- 5 visuels générés via imagegen premium (transformation, AI visibility, dashboard mockup, phone flow, growth graphic).

## 9. Détails techniques

```text
src/pages/pro/growth/PageReviewIntelligenceLanding.tsx   (public)
src/pages/pro/growth/PageReviewsDashboard.tsx
src/pages/review/PageReviewFlow.tsx                       (public, /review/:token)
src/features/reviewIntelligence/
  components/{HeroBeforeAfter,DemoAnimated,ValueCards,AIVisibilityFlow,ReviewCarousel,SendRequestModal,BulkImportModal,ReviewsTable,ReputationRadial,ReviewMediaGrid}.tsx
  hooks/{useReviewRequests,useReviewReputation,useReviewFlow}.ts
  services/reviewIntelligenceClient.ts
  types.ts
supabase/functions/
  review-request-send/
  review-sequence-cron/
  review-token-resolve/
  review-transcribe/
  review-generate-draft/
  review-submit/
  review-reputation-worker/
  review-bulk-import/
supabase/migrations/<ts>_review_intelligence.sql
```

- Storage bucket `review-media` public (fallback si politique workspace bloque → privé + signed URL).
- Twilio via connector gateway (mémoire `twilio`). SMS EN/FR selon locale.
- AI via Lovable AI Gateway (`google/gemini-3-flash-preview`) — pas de clé externe.
- Toutes les tables passent `has_role`, RLS, GRANT.
- Fallbacks Alex + gestion échecs SMS via `FailureCode`.

## 10. Critères de succès (E2E)

1. Contractor s'inscrit → paie 1 $ (Stripe metadata `review_intelligence`) → `/pro/growth/reviews` accessible.
2. Import CSV 5 clients → 5 `review_requests` créés → 5 SMS envoyés (throttle).
3. Homeowner clique → `/review/:token` → 5 étapes → AI génère draft → approuve → publie Google (redirection trackée).
4. `reviews_v2` inséré → worker met à jour `review_reputation_scores` + `contractors.rating`.
5. Alex recommande le contractor avec phrase basée sur reviews structurés (min 3 avis).
6. Dashboard KPI reflète temps réel.

## Hors scope (stubs uniquement)

- Project Showcase, Google Profile Health détaillé, Reputation Analytics avancé — pages placeholder "Bientôt" avec teaser.

