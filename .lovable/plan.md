

## Plan: Enhance Leather Texture Visibility

### What
Increase the leather texture opacity and adjust blend mode so it's more noticeable against the dark blue background, while preserving the cinematic dark blue base (#060B14) and colored aura gradients.

### Changes

**File: `src/index.css`** (lines 143-153)
- Increase `opacity` from `0.035` → `0.12` (roughly 3× more visible)
- Change `mix-blend-mode` from `soft-light` → `overlay` for better contrast on dark surfaces
- Increase `baseFrequency` slightly from `0.65` → `0.55` for a coarser, more leather-like grain
- Bump SVG `slope` from `1.8` → `2.2` for sharper texture detail

### Result
A clearly visible but still subtle dark leather texture layered over the dark navy background — tactile depth without washing out the premium dark aesthetic.

### Files Changed
1. `src/index.css` — Adjust leather texture parameters (~5 values)

