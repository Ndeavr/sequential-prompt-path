## Changes

### 1. Title + subtitle copy (`src/config/contractorHumanCallout.ts`)
- `title`: `"Vous voulez être recommandé par l'IA?"`
- `subtitle`: `"Parlez à un humain maintenant."` (kept) — or update if needed.

### 2. Suppress modal while user is typing (`src/hooks/useContractorHumanCallout.ts`)

Add input-activity guard before opening, and defer reopening:

- Before firing the `setTimeout` open, listen globally for `focusin` / `input` on `input, textarea, select, [contenteditable="true"]`.
- Track `lastInputAt` timestamp.
- When the 5s timer fires:
  - If an input is currently focused → skip (don't show).
  - If `Date.now() - lastInputAt < 8000` → reschedule timer for another 5s.
  - Else → open.
- Also: if modal is *about* to open and user starts typing in the meantime, cancel.
- After modal is opened, if user starts typing (shouldn't happen since modal is modal) — no-op.

This keeps the modal completely out of the way during active form entry on `/contractor/join`, `/aipp`, `/pro/*`, etc., but still surfaces it during idle browsing.

### 3. No other changes
No edge function, schema, or pricing touched. Frontend-only.
