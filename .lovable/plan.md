# Fix flickering + add Isolation Solution Royal

Edit only `src/components/home-unicorn/NearbyContractorsCarousel.tsx`.

## 1. Remove the flicker

Current cause: `AnimatePresence mode="wait"` with `y: 10 → 0 → -8` and `minHeight: 168`. When content exceeds 168px the card resizes between transitions, producing the visible jump/overflow seen in the screenshot.

Changes:
- Drop `AnimatePresence` + y-translate. Use a single `motion.div` keyed on `current.id` with an opacity-only crossfade (`initial opacity:0 → animate opacity:1`, 280ms ease-out).
- Raise `minHeight` from `168` to `196` so the slide never resizes mid-rotation on mobile.
- Add `overflow-hidden` on the card container so any rounding artifact (the white panel poking out in the screenshot) is clipped.
- Increase `ROTATE_MS` from 4000 to 5000 to reduce visual churn.
- Keep pause-on-hover / pause-on-touch logic unchanged.

## 2. Feature Isolation Solution Royal

- Add ISR as the **first** entry of `FALLBACK` with real data:
  - name "Isolation Solution Royal", initials "IR", specialty "Spécialiste entretoit & isolation", rating 4.9, 142 reviews, 318 projets, 98% satisfaction, 2h, Laval.
  - Add optional `href: "/entrepreneur/isolation-solution-royal"` on `Card`.
- When a card has `href`, wrap the inner content in a `<Link to={href}>` so tapping the recommended card opens the ISR public profile.
- Slice fallback to 5; real contractors still override when ≥ 5 available.

No other files touched. No backend changes.
