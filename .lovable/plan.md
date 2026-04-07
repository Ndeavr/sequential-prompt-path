
## Module: Landing Page Plans Fondateurs UNPRO

### Phase 1 — Database
- Create tables: `founder_plans`, `founder_spots`, `founder_purchases`, `territories_locked`
- RLS policies for public read, authenticated write
- Enable realtime on `founder_plans` (spots_remaining)
- Seed initial data (2 plans: Élite 19 995$, Signature 29 995$, 30 spots each)

### Phase 2 — Stripe Products
- Create 2 Stripe products + prices (Élite Fondateur 19995 CAD, Signature Fondateur 29995 CAD)
- Create edge function `create-founder-checkout` for one-time payment

### Phase 3 — UI Components
- `CounterLiveSpots` — realtime spots counter with progress bar
- `CardPlanEliteFounder` / `CardPlanSignatureFounder` — plan cards with value breakdown
- `PanelValueStack` — ROI/value breakdown
- `BadgeFounderLimited` — scarcity badge
- `HeroSectionFounderScarcity` — hero with counter
- `SectionWhyFounderPlans` — why only 30
- `SectionPlanComparisonEliteSignature` — side-by-side comparison
- `SectionValueStackBreakdown` — value stack
- `SectionTerritoryLockExplanation` — territory lock explanation
- `SectionFAQFounderPlans` — FAQ accordion
- `SectionFinalCTAFounder` — final CTA with live counter

### Phase 4 — Page Assembly
- `LandingPageFounderPlansUNPRO` page at `/fondateur/plans`
- Route registration
- Mobile-first, dark premium design

### Pricing
- Élite Fondateur: 19 995 $ CAD (one-time)
- Signature Fondateur: 29 995 $ CAD (one-time)
