# Fix mobile contractor card clipping

## Root cause

On the home (`/`) page, the "Espace entrepreneurs" section (`ContractorAippSplit` in `src/pages/PageHomeUnicorn.tsx`, line 538) wraps the `NearbyContractorsCarousel` inside a dark gradient panel that has `overflow: hidden`. Inside the carousel (`src/components/home-unicorn/NearbyContractorsCarousel.tsx`), the white contractor card uses `overflow: hidden` + `minHeight: 196` while its real content (avatar row + 3-column stats grid + border-top) is taller than 196px on 360–412px viewports. The combination clips the bottom half of the card (stats row "Projets / Satisfaction / Réponse" disappears) and leaves the empty white space visible in the screenshot.

A secondary issue: the page's bottom padding (`pb-36`) is not safe-area aware, so on Android Chrome with the floating bottom dock the last sections can sit under the nav.

## Scope

Frontend / presentation only. No data, no carousel logic changes (still 1-card auto-rotating, swipeable).

- `src/components/home-unicorn/NearbyContractorsCarousel.tsx`
- `src/pages/PageHomeUnicorn.tsx` (only the `ContractorAippSplit` panel + page bottom padding)

Everything else on the page stays as is.

## Changes

### 1. `NearbyContractorsCarousel.tsx` — let the white card breathe

- On the card container (line 116–124):
  - Remove `overflow-hidden`.
  - Remove `minHeight: 196`.
  - Add `width: 100%`, `maxWidth: 100%`, `boxSizing: border-box`.
- On the outer `<div role="region">` (line 90–94): add `w-full max-w-full` and inline `boxSizing: border-box` so the carousel never exceeds its parent.
- Keep the existing avatar/title/stats markup; allow text wrapping by removing `truncate` on the specialty/city line so nothing is silently cropped on 360px.
- Keep dots + footnote unchanged.

### 2. `PageHomeUnicorn.tsx` — `ContractorAippSplit` panel

- Change the dark panel (line 547–557) from `overflow-hidden` to `overflow-visible`. The radial-glow `div` already uses `pointer-events-none` and is `-top-16 -right-16`; we will constrain it instead by adding `overflow-clip` on the outer `<section>` wrapper (line 546) so the glow doesn't cause horizontal page overflow but the card can grow vertically without being clipped.
- Add `w-full max-w-full` to the dark panel and its inner `relative` content wrapper so nothing exceeds the viewport.
- On the "Recommended preview wrapper" (line 629–635) add `w-full max-w-full overflow-visible`.

### 3. Page-level safe bottom padding

- On the root container (line 697): replace `pb-36` with `pb-[calc(9rem+env(safe-area-inset-bottom))]` so the floating bottom dock never covers card content on Android/iOS.

## Acceptance

- At 360 / 390 / 412 px widths, the Plomberie Express card renders fully: avatar, name, rating, specialty/city, and the 3 stat tiles (Projets / Satisfaction / Réponse) are all visible.
- No horizontal scroll on the home page.
- Bottom dock does not overlap the contractor section.
- No change to carousel rotation, swipe behavior, or copy.

## Out of scope

- Other pages with contractor cards (`CardContractorMatchScore`, `ContractorCard`, SEO pages) — not in the reported screenshot.
- Backend, data, or routing.
