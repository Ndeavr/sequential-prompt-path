
# Scan IA → 10-Screen Netflix-Style Reveal (100% Real Data, Working $1 Activation)

Replace `/scan-ia` with a 10-screen mobile reveal. Every number comes from a real source (scan signals, `contractor_ai_score`, `contractor_market_opportunity`, `demand_signals_qc`). No mocks, no `—`, no filler. Ends on a working $1 / 7-day Stripe checkout.

## Screens — one question each

```text
1  AI DISCOVERY       "Are you found?"          live scan + 4 real checkmarks + progress
2  COMPANY REVEAL     "Who are you?"            logo, name, categories, service cities
3  MARKET POSITION    "Where do you rank?"      real percentile + 3 sub-metrics
4  REVENUE OPPORTUNITY"How much money?"         real annual $ from demand × ticket
5  DEMAND TERRITORY   "Where is demand?"        top 3 real cities with 🔥 + counts
6  BUSINESS GOAL      "What do you want?"       6 tappable goal cards
7  CAPACITY           "How much can you take?"  slider + live $ projection
8  AI STRATEGY        "Alex is thinking..."     2s reveal animation
9  RECOMMENDATIONS    "Alex's plan for you"     3 ranked moves with $/year
10 FUTURE PROJECTION  "Today → Tomorrow"        bar chart: today vs projected jobs/mo
—  ACTIVATION         "Unlock for $1"           recommended plan + Activate → Stripe
```

Screens 1-5 populate with zero user input. 6-7 = two taps. Activation = payment.

## Real data sources (per screen)

| Screen | Field | Source |
|---|---|---|
| 1 checkmarks | website found, reviews analyzed, service area found, demand calculated | `aipp-real-scan` signals + `contractor_market_opportunity` lookup |
| 2 logo | `signals.logo_url` from Firecrawl | live scan |
| 2 categories, cities | `signals.categories[]`, `signals.service_cities[]` | live scan |
| 3 percentile | `PERCENT_RANK() OVER (ORDER BY overall_score)` in same category | `contractor_ai_score` |
| 3 sub-metrics | Reputation, Service Area, Reviews | existing `sub_scores` |
| 4 opportunity $ | Σ over top demand cities: `waiting_homeowners × avg_ticket` | `contractor_market_opportunity` + `scanCapacityTickets.ts` |
| 5 demand list | top 3 `waiting_homeowners DESC` for detected category | `contractor_market_opportunity` |
| 7 projected $ | `capacity × avg_ticket × 12` | slider × ticket map |
| 9 recs | deterministic engine below | pure fn |
| 10 today jobs | `round(reviews_count × close_rate_by_category / 12)` (min 1) | scan signals + config |
| 10 projected jobs | `today_jobs + min(capacity, top_city_demand)` | derived |

No LLMs. All deterministic.

## Frontend

New folder `src/pages/scan-ia/wizard/`:
- `PageScanIAWizard.tsx` — root at `/scan-ia/wizard`, loads `scan_ia_reports` by `st`, mounts shell.
- `WizardShell.tsx` — full-viewport per screen, swipe/next/back, 10-dot progress, 420ms `cubic-bezier(.22,1,.36,1)` transitions, subtle haptic on advance.
- `useScanWizardState.ts` — Zustand: `report`, `goal`, `capacity`, `recommendedPlan`, `currentStep`.
- `Step1Discovery.tsx` … `Step10Projection.tsx`, plus `StepActivate.tsx`.
- Numbers count up via `requestAnimationFrame` tween (400-900ms).

Routing:
- `/scan-ia/wizard` → `PageScanIAWizard`.
- `/scan-ia/rapport` → redirect to `/scan-ia/wizard` (preserve `?st=…`).
- `PageScanIARun.tsx` navigates to `/scan-ia/wizard?st=…` on success.
- `/scan-ia` landing unchanged.

## Backend

Extend `scan-ia-run` to also compute and persist:
- `company_reveal`: `{ logo_url, categories[], service_cities[] }`.
- `market_position`: `{ percentile, metrics: [Reputation, Service Area, Reviews] }`.
- `territory_demand`: `[{ city, waiting_homeowners, heat_level }]` top 3.
- `today_jobs_per_month`: derived from real signals.

New pure module `src/features/scanIA/growthPlanEngine.ts`:
- `buildGrowthPlan(report, goal, capacity)` → 3 ranked moves with `annual_value_cad`. Deterministic rules:
  1. Highest-demand city → "Capturer la demande à {city}".
  2. Second-demand city → "Étendre à {city}".
  3. Always → "Matching propriétaires" = opportunity × 0.5.
- `pickRecommendedPlan(opportunity)` → maps to `src/config/contractorPlans.ts` (≥$200k Premium, ≥$100k Pro, else Recrue).

New config `src/config/scanCapacityTickets.ts` — average CAD ticket per category, seeded from `contractor_market_opportunity.estimated_revenue / homeowner_count` averaged per category.

## Payment (verified working)

- Confirm `STRIPE_SECRET_KEY` via `fetch_secrets`; if missing, request via `add_secret`.
- Rewrite `scan-ia-activate`:
  - Return `400 { error }` on validation failures (not 500).
  - Add `client_reference_id = session_token`, `metadata.goal`, `metadata.capacity`, `metadata.recommended_plan`.
  - Persist `scan_ia_reports.recommended_plan` before creating session.
- New edge function `scan-ia-activation-confirm`: retrieves Stripe session, checks `payment_status === 'paid'`, updates `stripe_session_id` + `activated_at`. Returns `{ paid, report_id }`.
- `PageScanIAActivationSuccess.tsx` polls it every 1.5s up to 8 attempts.
- Activation button shows failure inline (red text) — no native `alert`.
- Post-deploy smoke: `curl_edge_functions scan-ia-activate` asserts response `url` starts with `https://checkout.stripe.com/`.
- Playwright end-to-end: enter `isroyal.ca` → walk 10 screens → click Activate → assert redirect host `checkout.stripe.com`.

## DB migration

```sql
ALTER TABLE public.scan_ia_reports
  ADD COLUMN IF NOT EXISTS company_reveal jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS market_position jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS territory_demand jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS today_jobs_per_month int,
  ADD COLUMN IF NOT EXISTS user_goal text,
  ADD COLUMN IF NOT EXISTS user_capacity int,
  ADD COLUMN IF NOT EXISTS recommended_plan text,
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_scan_ia_reports_stripe_session
  ON public.scan_ia_reports(stripe_session_id);
```
Existing GRANTs already allow anon read/update by `session_token`.

## Visual system

- Base `#050816`. Each screen is one 100vh card with a single focal element, one primary CTA at bottom.
- Money `text-emerald-400`, pressure amber, AI accents sky/blue. Inter, tracking `-0.04em` on H1.
- Glass cards `rgba(255,255,255,0.04)` + blur 24px, radii 28px. Master easing `cubic-bezier(.22,1,.36,1)` @ 420ms.
- Screen "Activation" inverts to white card on dark with amber "Activer maintenant" button.

## Success criteria (checked before saying done)

1. Enter `isroyal.ca` → Screen 1 in <3s with real detected data.
2. Screens 2-5 show real values — no placeholders, no `—`.
3. Screens 6-7 persist `user_goal`, `user_capacity` to `scan_ia_reports`.
4. Screen 9 recommendations sum to ≥ Screen 4 opportunity.
5. Screen 10 projected > today.
6. Activate button opens real `checkout.stripe.com/…`.
7. Success page confirms via edge function poll.
8. Playwright smoke passes.

## Non-goals

- `/scan-ia` landing copy unchanged.
- Admin, email-health, Alex voice untouched.
- No LLM added — everything deterministic.
