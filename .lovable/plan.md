# Hero Trades — Visibility Fix

## Problem (from your screenshots)
1. Some trade images (notary close-up with pens, painter ladder, electrician) place the **subject directly behind the orb** → the action is hidden.
2. Bright/busy zones in the **top third** wash out the title and subtitle (`Alex vous aide à estimer…`).

## Fix Strategy
Two coordinated changes:

### 1. Regenerate all 8 trade images with "safe-zone" composition
Use Nano Banana Pro (`google/gemini-3-pro-image-preview`) to produce 1024×1024 cinematic images that follow strict composition rules:

- **Top 40%**: very dark, near-black, low-detail (empty wall, dark ceiling, shadow) → guarantees title legibility
- **Center 35% (orb zone)**: dark, soft, no critical subject → orb sits cleanly
- **Bottom + side bands**: where the *action* lives (tools, hands, materials, environment cue), framed left/right or low, never centered
- Cinematic dark teal/navy palette matching `#060B14` Cinematic Dark theme
- No text, no logos, no faces front-and-center, no small busy props (pens, papers) competing with title

Trades to regenerate (same filenames, drop-in replacement — no import changes needed):
`renovation, ceramic, painting, excavation, notary, plumbing, electrical, carpentry`

For `notary`: replace the pen close-up with a wide dark office desk shot, action (signature/hand) at bottom-right, top empty.

Pipeline:
- Script `/tmp/gen_trades.py` calls AI gateway for each trade with a shared "safe-zone" prompt + per-trade subject hint
- Saves base64 → `src/assets/trades/{name}.jpg` (overwrite)
- QA: open each generated image, verify top is dark and center is clear; regenerate any that fail

### 2. Tighten `AlexTradesAura.tsx` mask
Reinforce the safe zones at the CSS layer so even imperfect images stay readable:

- Change radial mask to keep image only in a **smaller central-bottom ellipse**, fading harder near the top
- Add a top-down dark gradient overlay (`from-background via-background/70 to-transparent`) covering the top ~45% to lock title contrast
- Slightly reduce max opacity (0.78 → 0.65) so subjects never compete with the orb glow

File: `src/components/home-simple/AlexTradesAura.tsx` (mask + vignette only, no logic change).

## Deliverables
- 8 regenerated `.jpg` files in `src/assets/trades/`
- Updated mask/vignette in `AlexTradesAura.tsx`
- QA pass: visual check of each image + preview screenshot of `/` confirming title and orb are unobstructed

## Out of scope
- No changes to orb, title copy, layout, or rotation logic.
