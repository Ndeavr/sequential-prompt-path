## Scope

Single file: `src/pages/PageHomeUnicorn.tsx` — `ContractorAippSplit` section only. No changes elsewhere.

## Changes

1. **Add an ENTREPRENEURS section header** above the dark card (outside it, so it visually labels the section like "Comment fonctionne UNPRO"):
   - Small uppercase eyebrow `ESPACE ENTREPRENEURS` in blue (`#3B82F6`, tracking-wider, 11px, bold).
   - Optional thin divider/glow line under it.
   - Adds clear visual separation from the homeowner content above.

2. **Reinforce the dark card highlight** to make it pop as the entrepreneur zone:
   - Keep the existing dark gradient + blue border.
   - Strengthen the top-right radial blue glow.
   - Add a subtle animated/static blue ring `box-shadow: 0 0 0 1px rgba(99,130,255,0.35), 0 30px 80px -30px rgba(59,130,246,0.55)`.

3. **CTA cleanup**: Remove the secondary "Voir mon score IA" button. Keep only **Activer mon profil** → `/entrepreneur/join` as the single primary CTA, centered, full-width on mobile, max-width on desktop.

4. No changes to: micro-benefits grid, `NearbyContractorsCarousel` preview, headline, subtext, conversion hook, badge inside the card, or the "Comment fonctionne UNPRO" section.

## Validation

Visual check at 360 / 390 / 430 / desktop: section is clearly separated and highlighted as the entrepreneurs zone, single "Activer mon profil" CTA visible and tappable above the bottom dock.
