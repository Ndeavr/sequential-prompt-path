# Contrast & Menu Cleanup — Entrepreneur + Onboarding

## Problems visible in screenshots

1. **Top bar (warm pages)** — Header still uses dark `#0F1B2D` chrome (UNPRO logo block + FR/EN toggle + hamburger) which clashes with the cream background and wraps awkwardly on mobile.
2. **Mobile drawer/menu** — Opens with dark navy background but text is barely readable (low-contrast slate text on dark). The page underneath is warm; the drawer should match.
3. **Bottom tab bar** — On warm pages, labels and icons are too low-contrast; the floating Alex orb sits over content (e.g. "assurances, références" text clipped behind it).
4. **Entrepreneur landing (`/pro`, `PageEntrepreneursLanding`)** — Built fully dark (`from-slate-900`, white text, blue gradients). With warm theme inverted via CSS variables it becomes broken: white text on cream, duplicate CTA buttons stacked, hardcoded blue `bg-[#...]` not theme-aware.
5. **Contractor onboarding (`/onboarding/contractor`)** — Currently in `darkRoutes`. User wants it adjusted (likely keep dark but verify contrast) — confirm direction.
6. **Entrepreneur dashboard lite** — Uses `bg-background` so flips to cream automatically; needs verification.

## Scope

Frontend/CSS only. No business logic, no Supabase, no Alex changes.

## Plan

### 1. SmartHeader — make warm-aware
- File: `src/components/navigation/SmartHeader.tsx` (read first)
- Detect warm context (same `.landing-warm` query as `MobileBottomNav`) OR accept it via CSS by switching all hardcoded `bg-[#0F1B2D]`, `text-white` to semantic tokens (`bg-background/90`, `text-foreground`, `border-border`).
- Mobile: reduce header height, ensure FR/EN pill + avatar + hamburger fit in 384px width without overlap.

### 2. Mobile drawer (hamburger sheet)
- Locate the Sheet/drawer component used by SmartHeader (`MobileMenuSheet` or similar).
- Replace dark hardcoded surface with `bg-background text-foreground` so it follows warm/dark per route.
- Section headers (`MON ESPACE`, `DÉCOUVREZ`) use `text-muted-foreground`; links use `text-foreground hover:text-primary`.

### 3. MobileBottomNav — warm variant polish
- File: `src/components/navigation/MobileBottomNav.tsx` + `.landing-warm-bottom-nav` in `index.css`.
- Increase label contrast on warm: active = navy `text-primary`, inactive = `text-foreground/70` (not muted-foreground which is too light on cream).
- Add `pb-28` safe gutter to entrepreneur landing sections so floating Alex orb never clips content.

### 4. Entrepreneur landing pages (warm conversion)
- Files: `src/components/entrepreneur-landing/v2/*.tsx` (HeroV2, SectionPainV2, SectionSolutionV2, SectionSocialProofV2, SectionHowItWorksV2, SectionPlansPreviewV2, SectionScarcityV2, SectionFormV2, StickyMobileCTAV2).
- Replace hardcoded `from-slate-900`, `bg-black`, `text-white`, `text-slate-300/400`, `bg-blue-600`, `bg-[#...]` with semantic tokens (`bg-background`, `text-foreground`, `text-muted-foreground`, `bg-primary text-primary-foreground`, `border-border`).
- HeroV2: navy headline on cream, muted-green accent for keywords, single primary CTA `Recevoir mes rendez-vous` + secondary outline `Voir les forfaits`. Remove the duplicated third button visible in screenshot 3.
- StickyMobileCTAV2: warm white/cream surface with subtle `border-border` and navy CTA; ensure z-index sits above content but below bottom nav (or hide when bottom nav visible to avoid stacking).

### 5. Onboarding routes — confirm direction
- `/onboarding/contractor` is currently dark. Two options:
  - **A.** Keep dark (cinematic cockpit feel) — only verify contrast of inputs/labels.
  - **B.** Switch to warm to match the rest of the public funnel.
- Homeowner onboarding (`/onboarding/homeowner*`) is already warm by default — sweep its components for hardcoded dark styles.

### 6. Entrepreneur dashboard lite
- `PageEntrepreneurDashboardLite.tsx` uses `bg-background` → flips warm. Since it's a logged-in cockpit, add it to `darkRoutes` (`/entrepreneur/dashboard-lite`) OR keep warm and verify `PanelContractorAdvisorAlex` contrast. Recommend: **keep warm** for consistency with the rest of `/entrepreneur/*` public surfaces (only `dashboard`, `import-processing`, `leads` stay dark per current config).

## Files to edit

- `src/components/navigation/SmartHeader.tsx`
- Mobile menu sheet (TBD after read)
- `src/components/navigation/MobileBottomNav.tsx`
- `src/index.css` (refine `.landing-warm-bottom-nav` contrast)
- `src/components/entrepreneur-landing/v2/HeroV2.tsx`
- `src/components/entrepreneur-landing/v2/SectionPainV2.tsx`
- `src/components/entrepreneur-landing/v2/SectionSolutionV2.tsx`
- `src/components/entrepreneur-landing/v2/SectionSocialProofV2.tsx`
- `src/components/entrepreneur-landing/v2/SectionHowItWorksV2.tsx`
- `src/components/entrepreneur-landing/v2/SectionPlansPreviewV2.tsx`
- `src/components/entrepreneur-landing/v2/SectionScarcityV2.tsx`
- `src/components/entrepreneur-landing/v2/SectionFormV2.tsx`
- `src/components/entrepreneur-landing/v2/StickyMobileCTAV2.tsx`
- Targeted homeowner onboarding components (after read)

## Out of scope
- Admin (`/admin/*`) stays dark — untouched.
- Contractor cockpit dashboards (`/pro/*`, `/entrepreneur/dashboard|leads|import-processing`) stay dark — untouched.
- Alex voice/orb logic, Stripe, Supabase, RLS — untouched.

## Question before I implement

Onboarding direction: keep `/onboarding/contractor` **dark cockpit** (current) or convert to **warm** to match the public funnel? I'll default to **keep dark + contrast pass** unless you say otherwise.
