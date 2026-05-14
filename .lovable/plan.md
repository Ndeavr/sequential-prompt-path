# UNPRO_GLOBAL_GO_LIVE_CSS_CLEANUP

Goal: make every page feel like the same premium product (cream/navy/muted green), without rebuilding flows, breaking Supabase/Stripe/auth/Alex/admin/contractor onboarding, or duplicating components.

## 1. Design tokens (single source of truth)

Edit `src/index.css` + `tailwind.config.ts` to add a **warm UNPRO theme layer** alongside the existing dark theme:

- `--unpro-cream: 44 33% 97%` (#F7F6F0)
- `--unpro-navy: 218 52% 12%` (#0F1B2D)
- `--unpro-green: 165 42% 24%` (#0E5E4E)
- `--unpro-blue: 222 100% 55%` (existing UNPRO blue)
- `--unpro-gold: 42 55% 54%` (#C9A24A) for trust pills only
- `--unpro-border: 30 15% 88%` warm gray
- `--unpro-card: 0 0% 100%` + `--unpro-card-elevated`
- Radius scale: `--radius-card: 24px`, `--radius-pill: 999px`
- Soft shadows: `--shadow-soft`, `--shadow-card-warm`
- Typography pair: keep existing serif (Instrument Serif/Cormorant) for H1/H2, Inter/Manrope for UI

Add a `.theme-warm` class wrapper that maps `--background`, `--foreground`, `--card`, `--primary`, `--accent`, `--border` to the warm tokens. Public-facing routes opt in by setting `theme-warm` on `<main>`. Dark routes (admin, dashboards, Alex immersive `/alex`) stay on the existing cinematic dark theme.

## 2. Route → theme mapping

Decide centrally in `MainLayout` based on `pathname`:

- **Warm**: `/`, `/index`, `/pro`, `/pros/:slug`, `/entrepreneur/*`, `/onboarding/*`, `/quote*`, `/account`, `/login`, `/signup`, `/role`, `/pricing`, `/plans`, `/success`, `/payment*`, `/condo` public, `/journal`, `/analyse/:slug`, error/empty pages.
- **Dark (unchanged)**: `/admin/*`, `/dashboard/*`, `/alex` immersive, `/diagnostic-photo`, internal cockpits.

No flow logic changes — only a `data-theme` attribute + class.

## 3. Navigation cleanup

Confirmed today: `MainLayout` already renders `SmartHeader` + `MobileBottomNav`. Audit and remove duplicates from page-level components:

- Sweep `rg "SmartHeader|MobileBottomNav|BottomBarMobileUniversal"` and delete any redundant mounts inside pages.
- `MobileBottomNav`: switch container from dark glass to **theme-aware** (warm variant: white/cream glass, subtle border, soft shadow). Constrain to `max-w-[92%]` centered, keep safe-area padding.
- Tabs locked to: **Accueil / Pros / Alex / Soumissions / Compte** (update `mobileTabsByRole` for `guest` + `homeowner`; contractor/admin keep their own tab sets).
- Add `pb-24 lg:pb-0` to `<main>` in `MainLayout` so content never hides behind the bar (already partially present — verify everywhere).
- Hide any public QR/debug widgets behind `useIsAdmin()` guard.

## 4. Shared primitive polish

Update existing primitives so every page inherits the system — no new components:

- `src/components/ui/button.tsx`: ensure `default`, `secondary`, `ghost`, `outline` variants read from semantic tokens (already do). Add a `warm` variant override via CSS when inside `.theme-warm`.
- `src/components/ui/input.tsx`, `textarea.tsx`, `card.tsx`, `dialog.tsx`, `sheet.tsx`, `tabs.tsx`, `badge.tsx`: verify each uses `bg-card`, `text-foreground`, `border-border`. No hardcoded `bg-white`/`text-black`/`#xxx`.
- `CardGlass`: add `variant="warm"` that swaps to white/cream surface with `--shadow-card-warm`.
- Empty/loading/error: standardize on existing `Skeleton`, `EmptyState` (create one shared `<EmptyState />` in `src/components/ui/` if missing — check first, do not duplicate).

## 5. Copy consistency sweep

Global find/replace (case-insensitive, only in JSX/TS strings, not in test fixtures):

- `APPUYEZ ET PARLEZ` → remove.
- `Parlez naturellement à Alex` → `Décrivez le problème. Alex s'occupe du reste.`
- Generic "assistant IA" / "chatbot" wording → "Alex".
- Homepage hero copy already correct — propagate the same tagline to `/pro`, `/onboarding/contractor`, `/pros/:slug` hero.
- Input placeholders → `Décrivez votre projet, votre problème ou votre urgence…`

## 6. Alex inline behavior

- Audit all surfaces that today navigate to `/alex` from a public page. Where the surface already has space, mount `AlexHomepageConversation` inline (variant warm) instead. `/alex` route stays for the immersive experience.
- Keep voice/agent config untouched (`alexVoiceConfig.ts`, `prepareAlexSpeechText.ts`, `alexPronunciationNormalizer.ts`). Pronunciation rules already correct (UNPRO → "Un Pro" / "Hun Pro", never spelled).

## 7. Page-by-page polish (presentation only)

For each route below: apply `theme-warm`, remove duplicate header/nav, verify CTAs are wired, fix clipped text, add bottom padding. **No business logic edits.**

| Route | Action |
|---|---|
| `/` | Already done — verify regression |
| `/pro`, `/pros/:slug` | Warm theme, hero copy aligned, trust pills, inline Alex mic |
| `/onboarding/contractor` | Warm theme, remove inner nav, keep voice flow |
| `/quote-analyzer*` | Warm cards, standardize empty/loading |
| `/account`, `/login`, `/signup`, `/role` | Warm theme, single brand bar |
| `/pricing`, `/plans`, `/success`, `/payment*` | Warm cards, verify Stripe Payment Element styling still readable |
| `/condo` public | Warm theme |
| `/admin/*`, dashboards | **Untouched** (dark allowed, denser OK) |

## 8. Regression checklist (manual via preview after build)

Homepage · login · role switch · Alex mic start · text input send · contractor onboarding step 1–3 · AIPP scan · Stripe checkout open · `/pros/:slug` render · `/admin` still dark · mobile bottom nav not hiding content · FR/EN toggle · console clean · no clipped text at 384px.

## 9. Out of scope

- No DB migrations, no edge functions, no RLS, no pricing logic, no Alex prompts, no agent IDs.
- No new pages, no flow rewrites.
- No removal of admin debug tools — only hide them from non-admin sessions.

## 10. Files expected to change

- `src/index.css` (add warm tokens + `.theme-warm` mapping)
- `tailwind.config.ts` (extend colors with warm tokens)
- `src/layouts/MainLayout.tsx` (route-based theme class, ensure `pb-24` on main)
- `src/components/navigation/MobileBottomNav.tsx` (theme-aware styling, tab labels)
- `src/config/navigationConfig.ts` (tab list per role)
- `src/components/unpro/CardGlass.tsx` (warm variant)
- `src/components/ui/{button,input,card,dialog,sheet,badge}.tsx` (token audit only if hardcoded colors found)
- Page files under `src/pages/**` — only theme class + duplicate-nav removal + copy strings
- No edits to: `src/integrations/supabase/*`, `supabase/**`, `src/config/alexVoiceConfig.ts`, `src/features/alex/voice/**`, Stripe code, RLS, edge functions

## 11. Acceptance

Every public route at 384px shows: cream background, navy text, muted-green accents, single header, single bottom nav, no debug UI, content scrolls above nav, Alex inline where present, copy matches the approved strings, no console errors, dark admin still works.
