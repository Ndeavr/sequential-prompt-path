
# SMS Curiosity Funnel → AI Score → Activation

Production-ready parallel funnel. Existing 4-SMS onboarding stays untouched. New funnel activates only for leads tagged `funnel_type='ai_score_curiosity'`.

## 1. Objective

Convert cold contractors into paid UNPRO subscriptions through a 2-step commitment cascade:

```text
SMS curiosity → /ia/:slug curiosity page → CTA "Révéler mon score"
  → live analysis animation (6–10s) → score reveal
  → missed-opportunities reveal → "Activer mon profil" → /entrepreneur/join → Stripe
```

Each step is logged and measurable. Real success = paid subscription, per Production Reliability Framework.

## 2. Funnel architecture

### 2.1 SMS sequence (parallel — 3 messages, 24h cadence)

New template file `_shared/curiosityTemplates.ts`. URL shape: `https://app.unpro.ca/ia/:slug?t=:token`.

- **SMS #1 — Curiosity** (T+0): "Bonjour {prenom}, si un propriétaire demandait aujourd'hui à ChatGPT quel entrepreneur choisir dans votre domaine, votre entreprise serait-elle recommandée? Analyse gratuite: {url} — Alex, UNPRO"
- **SMS #2 — Competitor angle** (T+24h, only if SMS #1 status != delivered+clicked): "Vos concurrents commencent à apparaître dans les réponses de ChatGPT et Gemini. Voyez où votre entreprise se situe: {url}"
- **SMS #3 — Small contractor advantage** (T+48h, only if no click): "Une entreprise de 3 employés peut maintenant rivaliser avec une de 100. L'IA ne mesure plus le budget. Votre analyse: {url}"

Cadence + window rules reuse existing `_shared/sendWindow.ts` + `_shared/twilioSend.ts`. Stops on: click → activation, reply, STOP, paid.

### 2.2 Landing page `/ia/:slug` (public, dark cinematic)

Single React route. Resolves slug → `contractor_leads` row + token. Sections per user spec:

1. **Hero** — "Votre entreprise serait-elle recommandée par l'IA aujourd'hui?" + `[Voir mon analyse IA gratuite]` (primary CTA, scrolls to live analysis OR triggers it inline).
2. **Section 1** — "Le plus grand changement depuis Google" (4 questions homeowners now ask AI directly).
3. **Section 2** — "Les règles changent" (signals AI observes; small vs big).
4. **Section 3** — "Votre Score de Recommandation IA" (what we analyze, 7 checkmarks).
5. **Section 4** — "Pourquoi agir maintenant?" (early-mover advantage).
6. **CTA final** — "Découvrez comment l'IA voit votre entreprise".

Sticky bottom CTA on mobile. Click → `RevealOrchestrator` mounts in place of CTA (no page change, no scroll loss).

### 2.3 Reveal orchestrator (`/ia/:slug` inline + `/ia/:slug/score`)

Three phases, single component:

**Phase A — Live analysis** (6–10s, real progress, not fake):
```text
✓ Avis clients analysés
✓ Site web analysé
✓ Présence locale analysée
✓ Signaux de confiance analysés
✓ Comparaison concurrentielle analysée
✓ Probabilité de recommandation calculée
```
Driven by `aipp-real-scan` (already exists). Each tick = real edge function step. Failures degrade gracefully (skip ✓ → grey) — never error toast.

**Phase B — Score reveal**: "Votre Score de Recommandation IA — 72/100" with ScoreRing, deterministic from `aipp-real-scoring-engine` (already in `mem://features/aipp-real-scoring-engine`).

**Phase C — Diagnostic narrative**:
- "Si un propriétaire demandait : 'Qui choisir pour {service} à {ville}?', votre entreprise pourrait ne pas figurer parmi les recommandations les plus fortes."
- **Plus grandes opportunités**: +14 Avis · +9 Couverture · +11 Expertise · +6 Documentation (computed from real signal gaps).
- **Opportunités mensuelles manquées** (deterministic from city demand × gap): "12 conversations · 7 demandes de soumissions · 3–5 rendez-vous".
- CTA → `[Activer mon profil et améliorer mon score]` → `/entrepreneur/join?lead={id}&t={token}&src=ia_curiosity` → existing Stripe checkout.

## 3. Data schema (single migration)

```sql
-- Funnel tagging on existing leads
ALTER TABLE public.contractor_leads
  ADD COLUMN IF NOT EXISTS funnel_type text DEFAULT 'standard_onboarding'
    CHECK (funnel_type IN ('standard_onboarding','ai_score_curiosity')),
  ADD COLUMN IF NOT EXISTS curiosity_slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS curiosity_token text;

-- Curiosity sequence (mirrors onboarding_sequences shape)
CREATE TABLE public.curiosity_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES contractor_leads(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','waiting','completed_clicked','completed_paid',
                      'completed_unsubscribed','failed','paused')),
  current_step int NOT NULL DEFAULT 1,
  next_send_at timestamptz NOT NULL DEFAULT now(),
  last_sent_at timestamptz,
  clicked_at timestamptz,
  revealed_at timestamptz,
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT,UPDATE ON public.curiosity_sequences TO authenticated;
GRANT ALL ON public.curiosity_sequences TO service_role;
ALTER TABLE public.curiosity_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_only" ON public.curiosity_sequences FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Event log for the funnel (page view, CTA click, reveal start/end, activation)
CREATE TABLE public.curiosity_funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES contractor_leads(id) ON DELETE CASCADE,
  slug text,
  event_type text NOT NULL
    CHECK (event_type IN ('sms_sent','sms_delivered','page_view','cta_revealed',
                          'analysis_started','analysis_completed','score_revealed',
                          'cta_activate_clicked','checkout_started','paid','unsubscribed')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.curiosity_funnel_events TO authenticated;
GRANT ALL ON public.curiosity_funnel_events TO service_role;
ALTER TABLE public.curiosity_funnel_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_read" ON public.curiosity_funnel_events FOR SELECT
  USING (public.has_role(auth.uid(),'admin'));

-- Public RPC to log page views & resolve slug (anon-safe)
CREATE OR REPLACE FUNCTION public.resolve_curiosity_slug(_slug text, _token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ ... $$;

-- Auto-enroll trigger: when pipeline_status='ready_for_outreach' AND funnel_type='ai_score_curiosity'
CREATE OR REPLACE FUNCTION public.enroll_curiosity_sequence() ...
CREATE TRIGGER trg_enroll_curiosity AFTER UPDATE ON contractor_leads ...
```

## 4. Edge functions

| Function | Purpose | Cron |
|---|---|---|
| `run-curiosity-sms-worker` | Same shape as onboarding worker. Reads `curiosity_sequences` due, validates window+dedupe+50/day cap, calls `_shared/twilioSend.ts`, logs `curiosity_funnel_events`, advances state. | `*/5 * * * *` |
| `curiosity-page-resolve` | Public (verify_jwt=false). Resolves `slug + token` → safe lead summary (business_name, city, service). Logs `page_view`. Rate-limited by IP. |
| `curiosity-analyze` | Public. Wraps `aipp-real-scan` + `aipp-recalc-score`. Streams progress via SSE OR returns ordered milestones for client polling. Logs `analysis_started/completed/score_revealed`. |
| `curiosity-checkout-start` | Logs `cta_activate_clicked` + `checkout_started`, returns existing `create-checkout-session` URL with `quote_id` and `src=ia_curiosity` metadata for attribution. |

Stripe webhook already updates leads → `paid`; add `cancel_curiosity_on_paid` SQL function mirrored on `cancel_onboarding_on_paid`.

## 5. Frontend

```text
src/pages/curiosity/
├── PageCuriosityLanding.tsx       # /ia/:slug — Hero + 4 sections + sticky CTA
└── components/
    ├── CuriosityHero.tsx
    ├── ChangeSinceGoogleSection.tsx
    ├── NewRulesSection.tsx
    ├── ScoreSignalsSection.tsx
    ├── WhyNowSection.tsx
    ├── RevealOrchestrator.tsx     # phases A/B/C inline
    ├── LiveAnalysisChecklist.tsx  # 6 animated ticks
    ├── ScoreRevealCard.tsx        # uses existing ScoreRing
    ├── MissedOpportunitiesCard.tsx
    └── ActivationCta.tsx
```

Route registered in `src/app/router.tsx` as `/ia/:slug` (public, no auth guard). Wrapped in `.alex-immersive` for readability tokens.

Mobile-first. Sticky bottom CTA. Premium dark cinematic per memory tokens. Heading H1 only on hero. SEO: noindex (private funnel).

## 6. Admin

- New tab in `/admin/sms-health` → "Funnel Curiosité IA" with `<OperationHealthCard>` exposing: SMS sent, page views, CTA reveals, scores revealed, activations, paid. Revenue impact = $349 × paid count.
- Lead detail drawer shows funnel timeline from `curiosity_funnel_events`.

## 7. Reliability (mandatory)

Every edge function:
- Uses `withRetry()` from `_shared/reliability.ts` around Twilio/Firecrawl/Gemini calls.
- Calls `reportOutcome()` with canonical `FailureCode` / `BlockReason`.
- State machine: `pending → analyzing → score_ready → activated → paid`.
- Real success = `paid` event in `curiosity_funnel_events`. Counters never increment on intermediate states.
- Founder Mode bypass: when active, ignores send window for curiosity SMS test.

## 8. What does NOT change

- Existing onboarding sequence (`onboarding_sequences`) untouched.
- Existing `/aipp/*`, `/entrepreneur/*`, `/pro/:slug` routes untouched.
- Existing Stripe checkout untouched (only attribution metadata added).
- Existing send-window policy enforced as-is.

## 9. Tasks

1. Migration — `contractor_leads` columns, `curiosity_sequences`, `curiosity_funnel_events`, triggers, RPCs.
2. `_shared/curiosityTemplates.ts` — 3 SMS bodies, URL builder.
3. Edge function `run-curiosity-sms-worker` + cron `*/5 * * * *`.
4. Edge function `curiosity-page-resolve` (public).
5. Edge function `curiosity-analyze` (wraps real scan, streams milestones).
6. Edge function `curiosity-checkout-start`.
7. Stripe webhook hook → `cancel_curiosity_on_paid`.
8. React routes + 9 components above.
9. Admin tab on `/admin/sms-health` with funnel health card.
10. Memory file `mem://features/curiosity-funnel-ai-score` + index update.

## 10. Success criteria

- Cold lead with `funnel_type='ai_score_curiosity'` + `ready_for_outreach` receives SMS #1 within 5 min, in send window.
- Click → `/ia/:slug` loads in <1.5s, logs page_view.
- CTA → live analysis runs in 6–10s on real data; never throws.
- Score reveals deterministically; missed-opportunities computed from real city × service demand.
- Activation CTA → Stripe checkout → on payment, sequence completes `completed_paid` and SMS chain stops within 60s.
- Admin sees every event in funnel health card.
