## Fix

Home header logo currently renders at `h-10 md:h-12` (40/48px) but the wordmark's internal padding makes it appear ~2× taller than the old pill (~36–40px total). Reduce so its visible height matches the previous pill.

**File:** `src/pages/PageHomeUnicorn.tsx` (line ~55, `HeaderFloatingGlass`)

Change:
```tsx
className="h-10 md:h-12 w-auto object-contain"
```
to:
```tsx
className="h-7 md:h-8 w-auto object-contain"
```

That yields ~28px mobile / ~32px desktop visible wordmark — matches the old pill's optical footprint. No other files touched. Right-side controls (FR, bell, avatar) stay unchanged.
