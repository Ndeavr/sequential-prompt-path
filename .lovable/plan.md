# Convert all public pages to warm cream/navy/green theme

## Already done
- `.landing-warm` token layer in `src/index.css`
- `MainLayout` applies `landing-warm` to a route allow-list
- `MobileBottomNav` warm variant
- Homepage hero `HeroConciergeWarm`

## What this plan covers
Apply the warm theme **consistently** to every public-facing page that already routes through `MainLayout`, fix pages that bypass tokens with hardcoded dark backgrounds, and leave admin / contractor cockpit / `/alex` immersive / dashboard untouched (stay dark).

## 1. Expand `warmRoutes` in `MainLayout.tsx`
Add missing public surfaces detected in repo:
- `/audit-aipp`, `/aipp`, `/diagnostic` public landings
- `/journal/*` article pages
- `/recruitment/*` apply pages (cream)
- `/join/*` resume page
- `/compare-quotes`, `/quote-analyzer*`
- `/condo` public marketing (keep `/condo/dashboard` dark)
- `/lead-empire` public city pages (`/plomb-eau/:ville`, `/tuyaux-plomb/:quartier`)
- `/analyse/:slug` outreach landings
- 404 / error pages

Keep dark: `/admin/*`, `/dashboard/*`, `/alex` immersive, `/diagnostic-photo`, `/pro/*` cockpit, `/entrepreneur/dashboard*`, `/entrepreneur/import-processing` (terminal), `/onboarding/contractor` voice flow if it relies on dark cinematic.

## 2. Remove hardcoded backgrounds in pages
Pages currently override with `bg-background` on a dark assumption or inline gradients. Replace with neutral wrappers so `landing-warm` tokens take over:
- `PageAuditAIPPv2.tsx` — `bg-background` is fine (tokens swap), verify hero inner colors
- `PageContractorJoinResume.tsx` — uses amber/dark card; restyle with semantic tokens
- `pages/entrepreneur/PageEntrepreneurDashboardLite.tsx` — keep dark (cockpit)
- `pages/entrepreneur/PageEntrepreneurImportProcessing.tsx` — keep dark (terminal)
- Sweep `src/pages/**` for `style={{ background: ... #0... }}`, `bg-[#...]`, `from-slate-900`, `bg-black`, `text-white` literals on public routes and replace with `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`.

## 3. Shared primitives audit (token-only changes)
Verify these render correctly on cream:
- `Button` variants (default/secondary/outline/ghost) — already token-based
- `Input`, `Textarea`, `Card`, `Dialog`, `Sheet`, `Tabs`, `Badge`, `Alert`
- `CardGlass` — add a `warm` variant: white surface, `border-border`, `shadow-[0_2px_24px_rgba(15,27,45,0.06)]`
- `BannerNoMatchPrimary` and other alert banners — already use `bg-muted/60`, OK

## 4. Hero/landing section components
Components used across public pages with hardcoded dark gradients to neutralize:
- `home-orb/*` legacy (only used on `/alex`, leave dark)
- `aipp-v2/HeroSectionAuditAIVisibility` — swap to tokens
- `recruitment/CTAStickyApply` — already token-based, OK
- `condo-paywall/PanelCheckoutCondoInline` — uses `glass-card`, swap to `CardGlass warm` on public condo
- Any `journal/*` article hero

## 5. Page-by-page touch list
- `/login`, `/signup`, `/role`, `/account` — wrap in `theme-warm`, restyle auth cards as white surface, navy CTA, green primary action
- `/pricing`, `/plans` — cream bg, white plan cards, gold accent for featured
- `/success`, `/payment*` — cream confirmation, green check, navy heading
- `/onboarding/*` (homeowner) — cream
- `/quote/*`, `/compare-quotes` — cream, white step cards
- `/pros/:slug` — cream profile, navy name, green CTA, gold badges
- `/journal`, `/journal/:slug` — cream editorial, serif headings already
- `/analyse/:slug` — cream personalized landing
- `/condo` public marketing — cream
- 404 / catch-all — cream

## 6. Acceptance
At 384px viewport on every public route:
- background = `#F7F6F0`
- headings navy `#0F1B2D`
- body text muted navy
- primary CTA muted green `#0E5E4E`
- single header (MainLayout), single bottom nav, content not clipped
- no `bg-black` / `text-white` / dark gradients leaking through
- admin + cockpit + `/alex` immersive remain dark
- no console errors

## Out of scope
Supabase, edge functions, RLS, Stripe, Alex prompts, voice config, business logic, new pages/flows. Pure CSS/token + className changes.

## Files expected to change
- `src/layouts/MainLayout.tsx` (warmRoutes)
- `src/components/unpro/CardGlass.tsx` (warm variant)
- `src/components/aipp-v2/HeroSectionAuditAIVisibility.tsx`
- `src/pages/join/PageContractorJoinResume.tsx`
- `src/pages/Login.tsx`, `Signup.tsx`, `Role.tsx`, `Account.tsx`
- `src/pages/Pricing.tsx`, `Plans.tsx`, `Success.tsx`, `Payment*.tsx`
- `src/pages/journal/*`
- `src/pages/condo/*` (public only)
- `src/pages/pros/PublicContractorPage.tsx`
- `src/pages/quote/*`, `CompareQuotes.tsx`
- `src/pages/onboarding/Homeowner*.tsx`
- `src/pages/NotFound.tsx`
- Targeted token sweeps in `src/components/**` referenced by above pages
