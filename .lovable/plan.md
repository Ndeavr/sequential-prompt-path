## Fix: Floating Alex panel off-screen on mobile

**Root cause** — `.uc-alex-floating-panel` mobile rule uses `left: 50%` + `transform: translateX(-50%)` to center. Framer Motion injects its own inline `transform` on the wrapper for entry/exit animations, which overrides the CSS transform. Result: the panel anchors to `left: 50%` with no counter-translate and drifts off the right edge.

**Fix — CSS only, `src/styles/unicorn-theme.css` (lines 205–236):**

Mobile (base rule):
- Replace `left: 50%` + `transform: translateX(-50%)` with `left: 12px; right: 12px; transform: none;`
- Replace `width: min(92vw, 480px); max-width: 92vw;` with `width: auto; max-width: 100%;`
- Add `box-sizing: border-box`
- Keep `bottom: calc(96px + env(safe-area-inset-bottom))`, radius, glass background, shadow, animation unchanged

Desktop (`@media (min-width: 768px)`):
- Keep `left: auto; right: 24px; bottom: 24px; width: 420px; max-width: 420px; transform: none;` (already correct)

**Verification:**
- Reload `/index` on mobile viewport (384px), confirm panel sits inside viewport with 12px gutters on both sides
- Toggle fullscreen overlay — confirm the floating panel (when not in fullscreen) remains centered with equal gutters and never escapes the right edge
- Desktop ≥768px unchanged: anchored bottom-right at 24px

**Out of scope:** panel content, header, transcripts, fullscreen overlay (`OverlayAlexVoiceFullScreen`), orb, hero, capabilities strip.

**Files touched:** `src/styles/unicorn-theme.css` only.