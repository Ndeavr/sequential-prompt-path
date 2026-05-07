
## Problem

The premium AI-first hero we've been polishing (`HeroSectionAlexFirst.tsx`) is not rendered anywhere users land. The actual `/` and `/index` routes render `PageHomeSimple` → `HeroAlexCentered` + `AlexTradesAura`, whose stacked dark overlays paint as a fully black screen on the user's mobile viewport.

```text
Router:
  /         ─┐
  /index    ─┴─►  HomeWithFeatureFlag  ──►  PageHomeSimple   (legacy, currently shown)
                                                  └─ HeroAlexCentered + dark trades aura

Orphaned (never mounted on a route):
  src/pages/Home.tsx  ──►  HeroSectionAlexFirst   (the premium AI-first design)
```

## Fix

Make `/` and `/index` render the AI-first hero, and remove the legacy black-screen hero from the user-visible path.

### Step 1 — Point the homepage at the new hero

Edit `src/components/home-intent/HomeWithFeatureFlag.tsx`:

- Replace `import PageHomeSimple from "@/pages/PageHomeSimple"` with `import Home from "@/pages/Home"`.
- Render `<Home />`.

This single change swaps both `/` and `/index` to the polished hero (`HeroSectionAlexFirst`) without touching the router or risking other routes.

### Step 2 — Keep the page single-screen and conversion-first

`Home.tsx` currently renders only `<HeroSectionAlexFirst />` inside `MainLayout`. That matches the AI-first goal (orb + input + chips + trust strip on one screen). No additional sections.

Verify:
- `MainLayout` already hides the floating Alex bubble on `/` and `/index` (line 31 of `MainLayout.tsx`) — no double orb.
- `cinematicBgPoster = /images/hero-bg.webp` and the mp4/webm exist in `public/images/` (confirmed).
- Bottom mobile nav (`MobileBottomNav`) sits above the hero — the hero already has `pb-24` to clear it.

### Step 3 — Retire the legacy "simple" home from the live path

- Leave `PageHomeSimple.tsx` and `src/components/home-simple/*` on disk (they may be reused for A/B), but they are no longer mounted on any route.
- Add a one-line comment in `HomeWithFeatureFlag.tsx` noting that `PageHomeSimple` is preserved for future flag-based testing.

### Step 4 — Sanity checks (no code change)

After the swap:
- Confirm `/` paints H1 ("Décrivez votre problème. Alex s'occupe du reste.") at first frame instead of black.
- Confirm tapping the orb opens `AlexAssistantSheet`.
- Confirm the chip row + trust strip are visible on a 384px viewport without horizontal scroll.

## Files touched

- `src/components/home-intent/HomeWithFeatureFlag.tsx` — swap `PageHomeSimple` → `Home`.

That's the entire change. One file, two lines.

## Why not also delete the legacy code

We keep `PageHomeSimple` and `home-simple/*` because:
- They're already imported lazily; not on the live path means zero runtime cost.
- If you want to A/B test, we can re-enable them behind a feature flag without restoring deleted files.

If you'd rather we delete them now, say the word and I'll remove the directory + the orphaned `Home.tsx` wrapper consolidation in the same pass.
