# Kill Home Page Scattering & Flicker — Permanently

## Root causes

1. **Flicker (whole page jumps down ~180px on load)** — `BannerFirstCustomer48h` uses `useState(false)` for `dismissed`, then reads `sessionStorage` inside `useEffect`. First paint always shows the dark contractor banner; the effect hides it one frame later. Users who dismissed it previously still see it flash → the hero shifts up. Same anti-pattern in `useFounderSpotsRemaining` firing a re-render after the first commit.

2. **Scattering — huge dead space beside the orb, text crushed into 5 lines** — `HeroAlexOrb` hard-codes `grid grid-cols-[1.05fr_1fr]` for every viewport. At 360–430px the left text column is ~180px wide (title wraps to 5 lines, `Analyser` button drops below), and the right orb column locks the other half of the viewport with nothing below it. That vertical vacuum below the orb is the "scattering" the screenshots highlight.

3. **Featured capability card clipped on the right** — `AlexCapabilitiesStrip` has `px-4` on `<section>`, but the featured button uses `boxShadow: "0 12px 28px -10px …"` and `linear-gradient` background that renders full width; the strip is fine, **but** it is preceded by `<HeroAlexOrb>` whose grid can push content wider than the viewport when the title runs long, and `PageShell` currently only sets `overflow-x-clip`, not `contain: paint`, so absolutely-positioned decorative layers (`CinematicArchScenes`, `HeroBackdrop`) bleed into scroll width.

4. **Naked `<HeroBackdrop />` / `<FooterBackdrop />` render as `position: absolute; inset-0` inside `PageShell`** — with no `position: relative` on the wrapper, they stretch across the entire scroll box and paint over sections, adding perceived gaps between blocks.

## Fixes (surgical, presentation only)

### `src/components/first-customer-48h/BannerFirstCustomer48h.tsx`
- Read `sessionStorage` in a **lazy `useState` initializer** so first paint reflects the true dismissed state — no flash, no shift.
- Reserve height with a stable `min-h` so the founder-spots label loading never nudges layout.
- SSR-safe guard: `typeof window === "undefined" ? false : sessionStorage.getItem(DISMISS_KEY) === "1"`.

### `src/pages/PageHomeUnicorn.tsx` → `HeroAlexOrb`
- Replace the always-on 2-column grid with a mobile-first stack:
  - `< sm` (360–430px): single column. Title full width, subtitle full width, orb **centered below** at `size={168}`, CTAs stacked full width.
  - `≥ sm`: keep the current 2-column layout unchanged.
- Drop `-mt-2` on the orb container (introduces a subpixel jump on some Android Chromes) and let `SectionBlock`-style gap own the spacing.
- Cap the title at `text-[26px]` on `< 380px` so it fits 3 lines, not 5.

### `src/pages/PageHomeUnicorn.tsx` → backdrop wrapping
- Wrap `<HeroBackdrop />` in `<section className="relative">` (matching the pattern already used for `PassportBackdrop` and `ContractorsBackdrop`) so the absolute layer contains itself to the hero region, not the entire page. Same for `<FooterBackdrop />` (already inside its `<footer>`; verify `position: relative` on that footer, add if missing).
- No visual change intended — this just stops the decorative layers from painting behind unrelated sections.

### `src/layouts/PageShell.tsx`
- Add `contain: paint` (via a `[contain:paint]` utility) alongside the existing `overflow-x-clip` on the outer wrapper. This forces the browser to clip absolutely-positioned descendants to the shell's own paint box — kills the "content bleeds outside the viewport" class of bug that produces the clipped-card look in screenshot 5.
- No API change: pages continue to render inside `<PageShell>` unchanged.

### `src/components/home-unicorn/AlexCapabilitiesStrip.tsx`
- Add `min-w-0` to the flex children so the featured button never grows beyond `100vw - 32px` even if a translation or a long label lands. Purely defensive; costs nothing.

## Verification

Playwright at **360, 384, 390, 430px** on `/` (bucket A):
1. Load with `sessionStorage[fc48h_banner_dismissed]="1"` beforehand → no banner ever paints, no jump.
2. Load fresh → banner paints once, stays until dismissed, no reflow after mount.
3. Measure vertical distance between "Alex trouve la réponse." baseline and the "Ce qu'Alex peut faire" caption. Must be ≤ 48px on every width.
4. `document.body.scrollWidth === window.innerWidth` on every width.
5. `document.querySelectorAll('[data-bottom-dock]').length === 1`.
6. Screenshot at each width, viewed via `code--view`, must show:
   - No blank column beside the orb.
   - "Trouver un pro" card fully in-frame.
   - Contractor banner either fully present (fresh session) or fully absent (dismissed) — never mid-transition.

## Files touched

- `src/components/first-customer-48h/BannerFirstCustomer48h.tsx` — lazy initializer + reserved height.
- `src/pages/PageHomeUnicorn.tsx` — hero stack on `< sm`, wrap `HeroBackdrop`.
- `src/layouts/PageShell.tsx` — `contain: paint`.
- `src/components/home-unicorn/AlexCapabilitiesStrip.tsx` — `min-w-0` defensive.

## Out of scope (won't touch this turn)

- Content copy, colors, orb art, contractor banner CTA logic.
- Alex voice/session lifecycle.
- Any non-home page — this is a targeted fix for `/`.
- Bucket B / bucket C alternate homepages.

## Notes

The `MobileQAOverlay` scanner already flags "gaps over 80px between sections" and horizontal overflow, so this fix will be visibly proven by the overlay going quiet on `/` at 360/390/430px.
