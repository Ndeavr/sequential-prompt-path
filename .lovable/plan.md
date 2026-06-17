## Founder spots — remove "sur 25", add dynamic scarcity

Scope: **only** `src/components/first-customer-48h/BannerFirstCustomer48h.tsx` (lines 86–93). No backend changes — `useFounderSpotsRemaining("fondateur-149")` already reads `founder_plans.spots_remaining` in realtime and decrements on paid checkouts.

### Copy rules
- `spots === null` (loading) or `spots >= 25` (no paid yet) → **"Places fondatrices disponibles"** (no number — avoids the "nobody joined" tell).
- `spots <= 0` → **"Places fondatrices complètes"**.
- Otherwise → **`${spots} places fondatrices restantes`** (no denominator, ever).

### Color rules (inline `style.color`, dark banner)
- `spots <= 5` → red `#F87171`
- `spots <= 10` → amber `#F59E0B`
- otherwise → existing gold `#F5C85A`

### Implementation
Replace the single `<p>` block (lines 86–93) with a small inline helper that picks `{ label, color }` from `spots`, then renders `<p style={{ color }}>{label}</p>`. Keep the same typography classes (`mt-1 text-[11.5px] font-semibold`). No new files, no new hooks, no schema changes.

### Out of scope
Backend decrement (already wired via `founder_plans` + checkout), other surfaces showing founder counts.