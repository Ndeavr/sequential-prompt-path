

# Diagnostic Condo IA Gratuit + Paywall Conversion Module

## Summary

Replace the passive "Checklist gratuite" section with a high-conversion "Diagnostic Condo IA Gratuit" funnel that delivers instant value (compliance score, risk detection, 3 priority actions), then converts via a smart paywall after initial free engagement. Leverages existing `condo_subscriptions`, `syndicates`, and `create-condo-checkout` infrastructure.

## What Already Exists

- `SectionCondoLeadMagnet` with "Checklist gratuite" copy (to be replaced)
- `condo_subscriptions` table with Stripe billing
- `create-condo-checkout` edge function
- `SectionCondoCompliancePreview` with Loi 16 compliance items
- `SubscriptionPaywall` component (contractor-only, simple)
- Syndicate tables with RLS and membership helpers

## Architecture

```text
[Landing Page CTA: "Analyser mon condo"]
         │
         ▼
[PageDiagnosticCondoIA] ← Free entry
  - 3 questions (units, year, docs present)
  - Instant score (%) + risk flags + 3 actions
         │
         ▼
[Alex guided: execute 1-3 free actions]
         │
         ▼
[Smart Paywall triggers on action #4+]
  - Shows progress locked
  - Blur on remaining items
  - Alex closing message
  - Plan selection inline
  - Stripe checkout embedded
         │
         ▼
[Flow resumes instantly post-payment]
```

## Plan

### Phase 1 — Replace Lead Magnet with Diagnostic CTA

**Files:**
- Rewrite `SectionCondoLeadMagnet.tsx` → `SectionCondoDiagnosticCTA.tsx`
  - New copy: "Obtenez votre diagnostic condo en 60 secondes"
  - CTA: "Analyser mon condo"
  - Icon: Activity/Shield instead of FileText/Download
  - Links to `/condos/diagnostic`

- Update `PageLandingCondoTeaser.tsx` to use new component
- Update `CondoHomePage.tsx` references if any

### Phase 2 — Diagnostic Page + Score Engine

**New page:** `src/pages/condos/PageDiagnosticCondoIA.tsx`
- Route: `/condos/diagnostic`
- 3-step mini form (no login required):
  1. Number of units (slider)
  2. Building year
  3. Checklist of 6 key documents (yes/no toggles)
- Instant score calculation (client-side, deterministic)
- Result display: score %, risk level, 3 priority actions
- CTA: "Commencer maintenant" → routes to condo onboarding or Alex

**New components:**
- `FormDiagnosticCondoQuick.tsx` — 3-step mini wizard
- `CardDiagnosticScoreResult.tsx` — circular score + risk badge
- `CardDiagnosticRiskFlag.tsx` — individual risk item
- `CardDiagnosticPriorityAction.tsx` — action card with CTA
- `SectionDiagnosticResultActions.tsx` — 3 priority actions grid

**Score logic:** `src/lib/condoDiagnosticScoring.ts`
- Weights: units (5%), year (15%), each doc (13.3% x 6 = 80%)
- Risk flags: missing insurance, no reserve fund study, no maintenance log
- Output: `{ score: number, riskLevel: 'low'|'medium'|'high'|'critical', risks: string[], priorities: Action[] }`

### Phase 3 — Smart Paywall Module

**New DB table:** `paywall_events` (migration)
```sql
CREATE TABLE public.paywall_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  syndicate_id uuid REFERENCES public.syndicates(id),
  trigger_type text NOT NULL, -- 'action_limit', 'feature_gate', 'alex_suggestion'
  trigger_context jsonb DEFAULT '{}',
  converted boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.paywall_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own paywall events" ON public.paywall_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own events" ON public.paywall_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
```

**New components:**
- `PanelCondoPaywallSmart.tsx` — main paywall overlay
  - Glassmorphism blur on locked content
  - Shows current score + what remains
  - "Débloquer maintenant" CTA
  - Micro-copy: "Risque non corrigé" / "X actions restantes"
- `CardProgressLockedBlurred.tsx` — blurred preview of locked actions
- `CardBlockedAction.tsx` — individual blocked action with lock icon
- `PanelPlanComparisonCondo.tsx` — Free vs Plus comparison
- `PanelAlexClosingConversion.tsx` — Alex persuasion message
- `BadgeUrgencyLimited.tsx` — urgency badge

**Paywall logic:** `src/services/condoPaywallService.ts`
- Track completed actions count in session/localStorage
- FREE_ACTION_LIMIT = 3
- Trigger paywall on action #4
- Check `condo_subscriptions` for active plan
- Log `paywall_events` on trigger + conversion

### Phase 4 — Stripe Checkout Integration

- Reuse existing `create-condo-checkout` edge function
- New component: `PanelCheckoutCondoInline.tsx`
  - Embedded Stripe Payment Element (same pattern as contractor checkout)
  - Shows plan details, price, TPS/TVQ
  - On success: unlock all features, resume flow
- Connect to existing `condo_subscriptions` table

### Phase 5 — Wiring

- Add route `/condos/diagnostic` in `router.tsx`
- Add route `/condos/unlock` for standalone paywall page
- Update Alex intent classifier: "diagnostic condo" → route to `/condos/diagnostic`
- Update `SectionCondoLeadMagnet` import references across the app

## Files Summary

| File | Action |
|------|--------|
| `src/components/condo-landing/SectionCondoDiagnosticCTA.tsx` | Create (replaces LeadMagnet) |
| `src/pages/condos/PageDiagnosticCondoIA.tsx` | Create |
| `src/lib/condoDiagnosticScoring.ts` | Create |
| `src/components/condo-diagnostic/FormDiagnosticCondoQuick.tsx` | Create |
| `src/components/condo-diagnostic/CardDiagnosticScoreResult.tsx` | Create |
| `src/components/condo-diagnostic/CardDiagnosticRiskFlag.tsx` | Create |
| `src/components/condo-diagnostic/CardDiagnosticPriorityAction.tsx` | Create |
| `src/components/condo-diagnostic/SectionDiagnosticResultActions.tsx` | Create |
| `src/components/condo-paywall/PanelCondoPaywallSmart.tsx` | Create |
| `src/components/condo-paywall/CardProgressLockedBlurred.tsx` | Create |
| `src/components/condo-paywall/CardBlockedAction.tsx` | Create |
| `src/components/condo-paywall/PanelPlanComparisonCondo.tsx` | Create |
| `src/components/condo-paywall/PanelAlexClosingConversion.tsx` | Create |
| `src/components/condo-paywall/BadgeUrgencyLimited.tsx` | Create |
| `src/components/condo-paywall/PanelCheckoutCondoInline.tsx` | Create |
| `src/services/condoPaywallService.ts` | Create |
| `src/pages/condos/PageLandingCondoTeaser.tsx` | Edit (swap LeadMagnet) |
| `src/app/router.tsx` | Edit (add routes) |
| `supabase/migrations/[timestamp].sql` | Create (paywall_events table) |

